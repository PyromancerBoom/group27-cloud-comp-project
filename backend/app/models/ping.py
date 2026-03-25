from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

ActivityType = Literal[
    "gym_spotter",
    "table_tennis",
    "board_game",
    "badminton",
    "chess",
    "running",
    "other",
]


class Location(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class PingCreate(BaseModel):
    user_id: str
    activity_type: ActivityType
    location: Location
    message: str = ""
    radius_meters: int = Field(default=10, ge=1, le=100)
    capacity: int = Field(default=2, ge=2, le=10)


class PingResponse(BaseModel):
    ping_id: str
    lobby_id: str
    activity_type: ActivityType
    location: Location
    message: str
    capacity: int
    current: int
    expires_at: datetime
    status: Literal["waiting", "matched"]
