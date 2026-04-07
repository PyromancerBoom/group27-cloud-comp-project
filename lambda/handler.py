"""
Analytics Lambda — triggered by Amazon Kinesis Data Streams.

For each batch of records:
  1. Decode the event payload (base64 → JSON)
  2. Derive a DynamoDB PK (venue grid cell + activity type) and SK (hour bucket)
  3. Increment counters atomically using UpdateItem ADD expressions

Expected event schema (produced by backend/app/services/events.py):
  {
    "event_type": "ping_posted" | "match_formed" | "ping_expired",
    "timestamp": "ISO-8601",
    "lobby_id": "uuid",
    "activity_type": "gym_spotter" | "table_tennis" | ...,
    "location": {"lat": float, "lon": float},
    "user_count": int
  }
"""
import base64
import json
import logging
import os
from collections import defaultdict
from datetime import datetime
from decimal import Decimal

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE_NAME", "activity_metrics")
AWS_ENDPOINT_URL = os.environ.get("AWS_ENDPOINT_URL")

COUNTER_FIELDS = {
    "ping_posted": "ping_count",
    "match_formed": "match_count",
    "ping_expired": "expire_count",
}

_dynamo = None


def _get_table():
    global _dynamo
    if _dynamo is None:
        kwargs = {}
        if AWS_ENDPOINT_URL:
            kwargs["endpoint_url"] = AWS_ENDPOINT_URL
        _dynamo = boto3.resource("dynamodb", **kwargs).Table(DYNAMODB_TABLE)
    return _dynamo


def _venue_cell(lat: float, lon: float, precision: int = 3) -> str:
    """Round coordinates to ~100 m grid cell."""
    return f"{round(lat, precision)}_{round(lon, precision)}"


def _hour_bucket(ts: str) -> str:
    """ISO-8601 timestamp → 'HOUR#YYYY-MM-DDTHH'."""
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return dt.strftime("HOUR#%Y-%m-%dT%H")


def lambda_handler(event, context):
    table = _get_table()

    counters: dict[tuple, dict] = defaultdict(lambda: {
        "ping_count": 0,
        "match_count": 0,
        "expire_count": 0,
    })

    processed = 0
    skipped = 0

    for record in event.get("Records", []):
        try:
            payload = json.loads(
                base64.b64decode(record["kinesis"]["data"]).decode()
            )
        except (KeyError, json.JSONDecodeError) as exc:
            logger.warning("Failed to decode record: %s", exc)
            skipped += 1
            continue

        # Validate required fields
        event_type = payload.get("event_type")
        timestamp = payload.get("timestamp")
        activity_type = payload.get("activity_type")
        location = payload.get("location")

        if not all([event_type, timestamp, activity_type, isinstance(location, dict)]):
            skipped += 1
            continue

        counter_field = COUNTER_FIELDS.get(event_type)
        if not counter_field:
            skipped += 1
            continue

        lat = location.get("lat")
        lon = location.get("lon")
        if lat is None or lon is None:
            skipped += 1
            continue

        pk = f"{_venue_cell(lat, lon)}#{activity_type}"
        sk = _hour_bucket(timestamp)
        counters[(pk, sk)][counter_field] += 1
        processed += 1

    # Batch-write aggregated counters to DynamoDB
    for (pk, sk), counts in counters.items():
        update_parts = []
        expr_values = {}
        for field, val in counts.items():
            if val > 0:
                update_parts.append(f"{field} :d_{field}")
                expr_values[f":d_{field}"] = Decimal(val)

        if not update_parts:
            continue

        table.update_item(
            Key={"pk": pk, "sk": sk},
            UpdateExpression="ADD " + ", ".join(update_parts),
            ExpressionAttributeValues=expr_values,
        )

    logger.info("Processed %d/%d records (%d skipped)",
                processed, len(event.get("Records", [])), skipped)

    return {"statusCode": 200, "processed": processed, "skipped": skipped}
