"""
In-memory WebSocket connection registry for this EC2 instance.

Each connected user gets a background task that subscribes to their per-user
Redis Pub/Sub channel (pubsub:user:{user_id}) and relays incoming messages to
their local WebSocket. This makes cross-instance match notifications work
correctly: any backend instance can publish to the channel and whichever
instance holds the socket will deliver it.
"""
import asyncio
import json
from fastapi import WebSocket
from typing import Dict
import redis.asyncio as aioredis


class ConnectionManager:
    def __init__(self):
        self._connections: Dict[str, WebSocket] = {}
        self._user_sub_tasks: Dict[str, asyncio.Task] = {}
        self._stop_events: Dict[str, asyncio.Event] = {}

    async def connect(self, user_id: str, ws: WebSocket, redis: aioredis.Redis):
        await ws.accept()
        self._connections[user_id] = ws

        stop = asyncio.Event()
        self._stop_events[user_id] = stop

        async def relay(payload: dict):
            await ws.send_text(json.dumps(payload))

        from app.services import chat as chat_service
        task = asyncio.create_task(
            chat_service.subscribe_to_user(redis, user_id, relay, stop)
        )
        self._user_sub_tasks[user_id] = task

    async def disconnect(self, user_id: str):
        ev = self._stop_events.pop(user_id, None)
        if ev:
            ev.set()
        task = self._user_sub_tasks.pop(user_id, None)
        if task:
            task.cancel()
        self._connections.pop(user_id, None)

    async def send(self, user_id: str, message: dict):
        ws = self._connections.get(user_id)
        if ws:
            await ws.send_text(json.dumps(message))

    async def broadcast_to(self, user_ids: list[str], message: dict):
        await asyncio.gather(
            *(self.send(uid, message) for uid in user_ids),
            return_exceptions=True,
        )

    def is_connected(self, user_id: str) -> bool:
        return user_id in self._connections


manager = ConnectionManager()
