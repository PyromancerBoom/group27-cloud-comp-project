"""
In-memory WebSocket connection registry for this EC2 instance.
"""
import asyncio
import json
from fastapi import WebSocket
from typing import Dict


class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self._connections: Dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[user_id] = ws

    def disconnect(self, user_id: str):
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
