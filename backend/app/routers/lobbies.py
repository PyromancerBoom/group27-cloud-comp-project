import asyncio
import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_redis
from app.services.matching import GEO_KEY, _eval_join_lobby
from app.services import chat as chat_service

router = APIRouter(prefix="/lobbies", tags=["lobbies"])


class JoinRequest(BaseModel):
    user_id: str


@router.get("/{lobby_id}/messages")
async def get_messages(lobby_id: str, redis=Depends(get_redis)):
    raw = await redis.lrange(f"chat:{lobby_id}", 0, -1)
    # we reverse for latest msgs first
    messages = [json.loads(m) for m in reversed(raw)]
    return {"lobby_id": lobby_id, "messages": messages, "count": len(messages)}


@router.get("/{lobby_id}")
async def get_lobby(lobby_id: str, redis=Depends(get_redis)):
    data = await redis.hgetall(f"lobby:{lobby_id}")
    if not data:
        raise HTTPException(404, "Lobby not found or expired")
    members = await redis.smembers(f"lobby:{lobby_id}:members")
    return {**data, "members": list(members)}


@router.post("/{lobby_id}/join")
async def join_lobby(lobby_id: str, body: JoinRequest, redis=Depends(get_redis)):
    lobby_key = f"lobby:{lobby_id}"
    creator_id = await redis.hget(lobby_key, "creator_id")
    if creator_id is None:
        raise HTTPException(404, "Lobby not found or expired")
    if creator_id == body.user_id:
        raise HTTPException(403, "Cannot join your own ping")
    result = await _eval_join_lobby(redis, lobby_key, lobby_id, body.user_id)
    status_str, new_count = result
    if status_str == "not_found":
        raise HTTPException(404, "Lobby not found or expired")
    if status_str == "full":
        raise HTTPException(409, "Lobby is full")

    members = list(await redis.smembers(f"{lobby_key}:members"))
    activity_type = await redis.hget(lobby_key, "activity_type")

    if status_str == "matched":
        notification = {
            "type": "match_formed",
            "payload": {
                "lobby_id": lobby_id,
                "activity_type": activity_type,
                "members": members,
            },
        }
        await asyncio.gather(
            *(chat_service.publish_to_user(redis, mid, notification) for mid in members),
            return_exceptions=True,
        )

    return {
        "lobby_id": lobby_id,
        "status": "matched" if status_str == "matched" else "waiting",
        "current": int(new_count),
        "members": members,
    }


@router.delete("/{lobby_id}", status_code=204)
async def cancel_lobby(lobby_id: str, user_id: str, redis=Depends(get_redis)):
    creator = await redis.hget(f"lobby:{lobby_id}", "creator_id")
    if not creator:
        raise HTTPException(404, "Lobby not found or expired")
    if creator != user_id:
        raise HTTPException(403, "Only the creator can cancel the lobby")
    await redis.delete(f"lobby:{lobby_id}", f"lobby:{lobby_id}:members")
    await redis.zrem(GEO_KEY, lobby_id)
