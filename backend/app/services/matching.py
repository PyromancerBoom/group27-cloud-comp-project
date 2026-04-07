"""
Matching service: find or create a lobby using Redis geospatial indexing.

The atomic join uses a Lua script to prevent race conditions when multiple
users attempt to join the same lobby simultaneously.
"""
import uuid
from datetime import datetime, timezone, timedelta
import redis.asyncio as aioredis
from app.config import settings

GEO_KEY = "lobbies:geo"

# Lua: atomically join lobby if not full, return ("joined"|"full"|"not_found"), new_count
# Also writes user:{user_id}:lobby reverse-lookup key with TTL from ARGV[3].
JOIN_LOBBY_LUA = """
local lobby_key  = KEYS[1]
local geo_key    = KEYS[2]
local lobby_id   = ARGV[1]
local user_id    = ARGV[2]
local lobby_ttl  = tonumber(ARGV[3])

local capacity = tonumber(redis.call('HGET', lobby_key, 'capacity'))
if not capacity then return {'not_found', 0} end

local current = tonumber(redis.call('HGET', lobby_key, 'current'))
if current >= capacity then return {'full', current} end

local new_count = redis.call('HINCRBY', lobby_key, 'current', 1)
redis.call('SADD', lobby_key .. ':members', user_id)
redis.call('SET', 'user:' .. user_id .. ':lobby', lobby_id, 'EX', lobby_ttl)

if new_count >= capacity then
    -- Remove from geo index so no more joins
    redis.call('ZREM', geo_key, lobby_id)
    return {'matched', new_count}
end
return {'joined', new_count}
"""


async def find_or_create_lobby(
    redis_client: aioredis.Redis,
    user_id: str,
    activity_type: str,
    lat: float,
    lon: float,
    radius_meters: int,
    capacity: int,
    message: str,
) -> dict:
    """
    Returns a dict with keys: lobby_id, status ('waiting'|'matched'), members list.
    """
    # Search for compatible lobbies within radius
    nearby = await redis_client.georadius(
        GEO_KEY, lon, lat, radius_meters, unit="m",
        withcoord=True, withdist=True, sort="ASC",
    )

    for entry in nearby:
        candidate_id, dist, (clon, clat) = entry
        lobby_key = f"lobby:{candidate_id}"
        activity = await redis_client.hget(lobby_key, "activity_type")
        if activity != activity_type:
            continue

        # Attempt atomic join
        result = await redis_client.eval(
            JOIN_LOBBY_LUA, 2,
            lobby_key, GEO_KEY,
            candidate_id, user_id, settings.lobby_ttl_seconds,
        )
        status_str, new_count = result

        if status_str in ("joined", "matched"):
            members = await redis_client.smembers(f"{lobby_key}:members")
            return {
                "lobby_id": candidate_id,
                "status": "matched" if status_str == "matched" else "waiting",
                "current": int(new_count),
                "members": list(members),
            }
        # "full" or "not_found" — try next candidate

    # No compatible lobby found — create a new one
    lobby_id = str(uuid.uuid4())
    lobby_key = f"lobby:{lobby_id}"
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.lobby_ttl_seconds)

    pipe = redis_client.pipeline()
    pipe.hset(lobby_key, mapping={
        "lobby_id": lobby_id,
        "activity_type": activity_type,
        "lat": lat,
        "lon": lon,
        "capacity": capacity,
        "current": 1,
        "creator_id": user_id,
        "message": message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": expires_at.isoformat(),
    })
    pipe.expire(lobby_key, settings.lobby_ttl_seconds)
    pipe.sadd(f"{lobby_key}:members", user_id)
    pipe.expire(f"{lobby_key}:members", settings.lobby_ttl_seconds)
    pipe.geoadd(GEO_KEY, [lon, lat, lobby_id])
    pipe.set(f"user:{user_id}:lobby", lobby_id, ex=settings.lobby_ttl_seconds)
    await pipe.execute()

    return {
        "lobby_id": lobby_id,
        "status": "waiting",
        "current": 1,
        "members": [user_id],
    }


async def get_nearby_lobbies(
    redis_client: aioredis.Redis,
    lat: float,
    lon: float,
    radius_meters: int,
) -> list[dict]:
    nearby = await redis_client.georadius(
        GEO_KEY, lon, lat, radius_meters, unit="m",
        withcoord=True, withdist=True, sort="ASC",
    )
    lobbies = []
    for entry in nearby:
        lobby_id, dist, (clon, clat) = entry
        data = await redis_client.hgetall(f"lobby:{lobby_id}")
        if data:
            data["distance_meters"] = round(float(dist), 1)
            lobbies.append(data)
    return lobbies
