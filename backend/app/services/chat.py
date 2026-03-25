"""
Cross-instance chat routing via Redis Pub/Sub.

Each EC2 instance subscribes to the channels for all lobbies whose users
are currently connected to it. When a message is published (from any instance),
all subscribers relay it to the correct WebSocket connections.
"""
import asyncio
import json
from typing import Callable, Awaitable
import redis.asyncio as aioredis


def channel_name(lobby_id: str) -> str:
    return f"pubsub:chat:{lobby_id}"


async def publish_message(redis_client: aioredis.Redis, lobby_id: str, payload: dict):
    await redis_client.publish(channel_name(lobby_id), json.dumps(payload))


async def subscribe_to_lobby(
    redis_client: aioredis.Redis,
    lobby_id: str,
    on_message: Callable[[dict], Awaitable[None]],
    stop_event: asyncio.Event,
):
    """
    Subscribe to a lobby's pub/sub channel and call `on_message` for each
    incoming message until `stop_event` is set.
    """
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(channel_name(lobby_id))
    try:
        async for raw in pubsub.listen():
            if stop_event.is_set():
                break
            if raw["type"] == "message":
                await on_message(json.loads(raw["data"]))
    finally:
        await pubsub.unsubscribe(channel_name(lobby_id))
        await pubsub.aclose()
