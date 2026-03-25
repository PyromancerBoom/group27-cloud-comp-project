"""
Analytics Lambda — triggered by Amazon Kinesis Data Streams.

For each batch of records:
  1. Decode the event payload
  2. Derive a DynamoDB PK (venue grid cell + activity type) and SK (hour bucket)
  3. Increment counters atomically using UpdateItem ADD expressions
"""
import base64
import json
import os
from collections import defaultdict
from datetime import datetime, timezone

import boto3
from decimal import Decimal

DYNAMODB_TABLE = os.environ.get("DYNAMODB_TABLE_NAME", "activity_metrics")
AWS_ENDPOINT_URL = os.environ.get("AWS_ENDPOINT_URL")  # None = real AWS

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
    """Round coordinates to ~100m grid cell."""
    return f"{round(lat, precision)}_{round(lon, precision)}"


def _hour_bucket(ts: str) -> str:
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
    return dt.strftime("HOUR#%Y-%m-%dT%H")


def lambda_handler(event, context):
    table = _get_table()
    # Aggregate counts per (pk, sk) before writing to reduce DynamoDB calls
    counters: dict[tuple, dict] = defaultdict(lambda: {
        "ping_count": 0,
        "match_count": 0,
        "expire_count": 0,
    })

    for record in event.get("Records", []):
        payload = json.loads(base64.b64decode(record["kinesis"]["data"]).decode())
        lat = payload["location"]["lat"]
        lon = payload["location"]["lon"]
        pk = f"{_venue_cell(lat, lon)}#{payload['activity_type']}"
        sk = _hour_bucket(payload["timestamp"])
        key = (pk, sk)

        etype = payload.get("event_type", "")
        if etype == "ping_posted":
            counters[key]["ping_count"] += 1
        elif etype == "match_formed":
            counters[key]["match_count"] += 1
        elif etype == "ping_expired":
            counters[key]["expire_count"] += 1

    for (pk, sk), counts in counters.items():
        update_expr_parts = []
        expr_values = {}
        for field, val in counts.items():
            if val > 0:
                update_expr_parts.append(f"{field} :d_{field}")
                expr_values[f":d_{field}"] = Decimal(val)

        if not update_expr_parts:
            continue

        table.update_item(
            Key={"pk": pk, "sk": sk},
            UpdateExpression="ADD " + ", ".join(update_expr_parts),
            ExpressionAttributeValues=expr_values,
        )

    return {"statusCode": 200, "processed": len(event.get("Records", []))}
