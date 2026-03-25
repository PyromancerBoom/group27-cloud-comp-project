from fastapi import APIRouter, Depends, HTTPException
from app.dependencies import get_redis
from app.services.matching import GEO_KEY

router = APIRouter(prefix="/lobbies", tags=["lobbies"])


@router.get("/{lobby_id}")
async def get_lobby(lobby_id: str, redis=Depends(get_redis)):
    data = await redis.hgetall(f"lobby:{lobby_id}")
    if not data:
        raise HTTPException(404, "Lobby not found or expired")
    members = await redis.smembers(f"lobby:{lobby_id}:members")
    return {**data, "members": list(members)}


@router.delete("/{lobby_id}", status_code=204)
async def cancel_lobby(lobby_id: str, user_id: str, redis=Depends(get_redis)):
    creator = await redis.hget(f"lobby:{lobby_id}", "creator_id")
    if not creator:
        raise HTTPException(404, "Lobby not found or expired")
    if creator != user_id:
        raise HTTPException(403, "Only the creator can cancel the lobby")
    await redis.delete(f"lobby:{lobby_id}", f"lobby:{lobby_id}:members")
    await redis.zrem(GEO_KEY, lobby_id)
