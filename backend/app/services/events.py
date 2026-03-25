import json
import uuid
from datetime import datetime, timezone
from app.config import settings
from app.dependencies import get_kinesis_client


def publish_event(event_type: str, lobby_id: str, activity_type: str, lat: float, lon: float, user_count: int = 1):
    event = {
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lobby_id": lobby_id,
        "activity_type": activity_type,
        "location": {"lat": lat, "lon": lon},
        "user_count": user_count,
    }
    try:
        get_kinesis_client().put_record(
            StreamName=settings.kinesis_stream_name,
            Data=json.dumps(event).encode(),
            PartitionKey=lobby_id,
        )
    except Exception as exc:
        # Non-critical — don't fail the request if analytics is unavailable
        print(f"[events] Failed to publish {event_type}: {exc}")
