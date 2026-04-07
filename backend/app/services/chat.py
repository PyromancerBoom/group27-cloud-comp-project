"""
Cross-instance chat routing via Redis Pub/Sub.

Each EC2 instance subscribes to the channels for all lobbies whose users
are currently connected to it. When a message is published (from any instance),
all subscribers relay it to the correct WebSocket connections.

Per-user channels (pubsub:user:{user_id}) are used for match notifications so
that any backend instance can deliver to any user regardless of which instance
holds their WebSocket.
"""
import asyncio
import json
from typing import Callable, Awaitable
import redis.asyncio as aioredis


def channel_name(lobby_id: str) -> str:
    return f"pubsub:chat:{lobby_id}"


def user_channel(user_id: str) -> str:
    return f"pubsub:user:{user_id}"


async def publish_message(redis_client: aioredis.Redis, lobby_id: str, payload: dict):
    data = json.dumps(payload)
    await redis_client.publish(channel_name(lobby_id), data)
    chat_key = f"chat:{lobby_id}"
    pipe = redis_client.pipeline()
    pipe.lpush(chat_key, data)
    pipe.ltrim(chat_key, 0, 199)
    pipe.expire(chat_key, 3600)
    await pipe.execute()


async def publish_to_user(redis_client: aioredis.Redis, user_id: str, payload: dict):
    """Publish a notification to a specific user's per-user channel."""
    await redis_client.publish(user_channel(user_id), json.dumps(payload))


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


async def subscribe_to_user(
    redis_client: aioredis.Redis,
    user_id: str,
    on_message: Callable[[dict], Awaitable[None]],
    stop_event: asyncio.Event,
):
    """
    Mirror of subscribe_to_lobby, but on the per-user channel.
    Runs as a long-lived background task for the duration of the WebSocket
    connection, relaying match notifications and other per-user pushes.
    """
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(user_channel(user_id))
    try:
        async for raw in pubsub.listen():
            if stop_event.is_set():
                break
            if raw["type"] == "message":
                await on_message(json.loads(raw["data"]))
    finally:
        await pubsub.unsubscribe(user_channel(user_id))
        await pubsub.aclose()
