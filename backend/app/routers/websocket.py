"""
WebSocket endpoint — one persistent connection per user.

Incoming messages (from client):
  { "type": "chat", "lobby_id": "...", "text": "..." }
  { "type": "ready_check_response", "lobby_id": "...", "accepted": true }

Outgoing messages (server-pushed):
  See WebSocketMessage model for full type list.
"""
import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.dependencies import get_redis
from app.services.connection_manager import manager
from app.services import chat as chat_service

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/{user_id}")
async def websocket_endpoint(user_id: str, ws: WebSocket, redis=Depends(get_redis)):
    await manager.connect(user_id, ws)
    stop_event = asyncio.Event()
    pubsub_tasks: dict[str, asyncio.Task] = {}

    async def relay_to_client(message: dict):
        await manager.send(user_id, message)

    async def join_lobby_channel(lobby_id: str):
        if lobby_id not in pubsub_tasks:
            task = asyncio.create_task(
                chat_service.subscribe_to_lobby(redis, lobby_id, relay_to_client, stop_event)
            )
            pubsub_tasks[lobby_id] = task

    try:
        while True:
            raw = await ws.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "chat":
                lobby_id = data.get("lobby_id")
                text = data.get("text", "")
                if lobby_id and text:
                    payload = {
                        "type": "chat_message",
                        "payload": {"lobby_id": lobby_id, "user_id": user_id, "text": text},
                    }
                    await chat_service.publish_message(redis, lobby_id, payload)

            elif msg_type == "subscribe_lobby":
                await join_lobby_channel(data.get("lobby_id"))

            elif msg_type == "ready_check_response":
                lobby_id = data.get("lobby_id")
                accepted = data.get("accepted", False)
                members = await redis.smembers(f"lobby:{lobby_id}:members")
                notification = {
                    "type": "ready_confirmed",
                    "payload": {"user_id": user_id, "lobby_id": lobby_id, "accepted": accepted},
                }
                await chat_service.publish_message(redis, lobby_id, notification)

    except WebSocketDisconnect:
        pass
    finally:
        stop_event.set()
        for task in pubsub_tasks.values():
            task.cancel()
        manager.disconnect(user_id)
