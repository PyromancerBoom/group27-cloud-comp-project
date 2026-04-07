import asyncio
import json
import logging
from datetime import datetime, timezone
from app.config import settings
from app.dependencies import get_kinesis_client

log = logging.getLogger(__name__)


def _put_record(event: dict, partition_key: str):
    """Synchronous boto3 call must be run in a thread to avoid blocking the event loop."""
    get_kinesis_client().put_record(
        StreamName=settings.kinesis_stream_name,
        Data=json.dumps(event).encode(),
        PartitionKey=partition_key,
    )


async def publish_event(event_type: str, lobby_id: str, activity_type: str, lat: float, lon: float, user_count: int = 1):
    event = {
        "event_type": event_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "lobby_id": lobby_id,
        "activity_type": activity_type,
        "location": {"lat": lat, "lon": lon},
        "user_count": user_count,
    }
    try:
        await asyncio.to_thread(_put_record, event, lobby_id)
        log.info("Published %s for lobby %s", event_type, lobby_id)
    except Exception as exc:
        log.warning("Failed to publish %s: %s", event_type, exc)
