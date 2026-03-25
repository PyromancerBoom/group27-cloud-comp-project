from pydantic import BaseModel
from typing import Literal
from datetime import datetime
from app.models.ping import ActivityType, Location


class LobbySummary(BaseModel):
    lobby_id: str
    activity_type: ActivityType
    location: Location
    message: str
    capacity: int
    current: int
    distance_meters: float
    expires_at: datetime


class ChatMessage(BaseModel):
    lobby_id: str
    user_id: str
    text: str
    timestamp: datetime


class WebSocketMessage(BaseModel):
    type: Literal[
        "lobby_update",
        "match_formed",
        "ready_check",
        "ready_confirmed",
        "chat_message",
        "ping_expired",
        "error",
    ]
    payload: dict
