"""
The cleanup service subscribes to Redis keyspace expiration events, removes
ghost entries from lobbies:geo, and emits a ping_expired analytics event.
"""
import asyncio
import logging
import redis.asyncio as aioredis
from app.services.matching import GEO_KEY
from app.services import events

log = logging.getLogger(__name__)

KEYEVENT_CHANNEL = "__keyevent@0__:expired"


async def watch_expirations(redis_client: aioredis.Redis):
    """
    Long-running task. Subscribes to Redis keyspace expiration events and
    cleans up ghost entries in lobbies:geo whenever a lobby:{id} key expires.
    Spawned once per backend process from the FastAPI startup hook.
    """
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(KEYEVENT_CHANNEL)
    log.info("cleanup: subscribed to %s", KEYEVENT_CHANNEL)
    try:
        async for msg in pubsub.listen():
            if msg.get("type") != "message":
                continue
            key = msg.get("data")
            if not key:
                continue
            # Only handle top-level lobby:{id} expirations, not lobby:{id}:members
            # or any other suffixed variant
            if not key.startswith("lobby:"):
                continue
            tail = key[len("lobby:"):]
            if ":" in tail:
                continue
            lobby_id = tail
            await _handle_lobby_expired(redis_client, lobby_id)
    except asyncio.CancelledError:
        raise
    except Exception:
        log.exception("cleanup: watch loop crashed")
    finally:
        await pubsub.unsubscribe(KEYEVENT_CHANNEL)
        await pubsub.aclose()


async def _handle_lobby_expired(redis_client: aioredis.Redis, lobby_id: str):
    # Read the mirror metadata key
    # the 10 seconds grace ensures the metadata is still readable even after the lobby itself has expired
    meta = await redis_client.hgetall(f"lobby_meta:{lobby_id}")
    activity_type = meta.get("activity_type", "unknown")
    try:
        lat = float(meta.get("lat", 0.0))
        lon = float(meta.get("lon", 0.0))
    except (TypeError, ValueError):
        lat = lon = 0.0

    # Remove the ghost entry from the geo index so GEORADIUS never returns it
    removed = await redis_client.zrem(GEO_KEY, lobby_id)
    log.info("cleanup: lobby %s expired, geo removed=%s", lobby_id, removed)

    # Emit analytics event
    await events.publish_event(
        event_type="ping_expired",
        lobby_id=lobby_id,
        activity_type=activity_type,
        lat=lat,
        lon=lon,
        user_count=0,
    )
