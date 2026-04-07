from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
import uuid

from app.models.ping import PingCreate, PingResponse
from app.dependencies import get_redis
from app.config import settings
from app.services import matching, events
from app.services.connection_manager import manager

router = APIRouter(prefix="/pings", tags=["pings"])


@router.post("", response_model=PingResponse, status_code=201)
async def create_ping(body: PingCreate, redis=Depends(get_redis)):
    result = await matching.create_lobby(
        redis,
        user_id=body.user_id,
        activity_type=body.activity_type,
        lat=body.location.lat,
        lon=body.location.lon,
        radius_meters=body.radius_meters,
        capacity=body.capacity,
        message=body.message,
    )

    lobby_id = result["lobby_id"]
    event_type = "match_formed" if result["status"] == "matched" else "ping_posted"
    events.publish_event(
        event_type, lobby_id, body.activity_type,
        body.location.lat, body.location.lon,
        user_count=result["current"],
    )

    if result["status"] == "matched":
        # Notify all matched users via WebSocket
        notification = {
            "type": "match_formed",
            "payload": {
                "lobby_id": lobby_id,
                "activity_type": body.activity_type,
                "members": result["members"],
            },
        }
        await manager.broadcast_to(result["members"], notification)

    lobby_data = await redis.hgetall(f"lobby:{lobby_id}")
    expires_at = datetime.fromisoformat(lobby_data["expires_at"])

    return PingResponse(
        ping_id=str(uuid.uuid4()),
        lobby_id=lobby_id,
        activity_type=body.activity_type,
        location=body.location,
        message=body.message,
        capacity=int(lobby_data["capacity"]),
        current=int(lobby_data["current"]),
        expires_at=expires_at,
        status=result["status"],
    )


@router.get("/nearby")
async def get_nearby_pings(
    lat: float,
    lon: float,
    radius: int = settings.default_radius_meters,
    redis=Depends(get_redis),
):
    if radius > settings.max_radius_meters:
        raise HTTPException(400, f"radius cannot exceed {settings.max_radius_meters}m")
    lobbies = await matching.get_nearby_lobbies(redis, lat, lon, radius)
    return {"lobbies": lobbies, "count": len(lobbies)}
