"""
-- FOR LOCAL DEVELOPMENT ONLY --

Seed analytics data into LocalStack DynamoDB for dashboard development.
Does NOT touch real AWS.

Usage:
    python scripts/seed_analytics.py
"""
import random
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import boto3

TABLE_NAME = "activity_metrics"
ENDPOINT_URL = "http://localhost:4566"
REGION = "ap-southeast-1"
DAYS_BACK = 20
ITEMS_PER_DAY = 75  # target item count per day (sparse sampling)

# Matches the activity types in dashboard/src/components/ActivityBreakdown.tsx
ACTIVITY_TYPES = ["gym_spotter", "running", "table_tennis", "board_game", "badminton"]

# Fake venue grid cells (lat_lon rounded to 3dp, as per lambda/handler.py _venue_cell).
VENUE_CELLS = [
    "1.304_103.831",
    "1.290_103.851",
    "1.352_103.688",
    "1.319_103.707",
    "1.283_103.845",
]


def _client(service: str):
    return boto3.client(
        service,
        region_name=REGION,
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )


def _resource(service: str):
    return boto3.resource(
        service,
        region_name=REGION,
        endpoint_url=ENDPOINT_URL,
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )


def ensure_table_exists(client):
    existing = client.list_tables()["TableNames"]
    if TABLE_NAME in existing:
        print(f"Table '{TABLE_NAME}' already exists.")
        return
    client.create_table(
        TableName=TABLE_NAME,
        KeySchema=[
            {"AttributeName": "pk", "KeyType": "HASH"},
            {"AttributeName": "sk", "KeyType": "RANGE"},
        ],
        AttributeDefinitions=[
            {"AttributeName": "pk", "AttributeType": "S"},
            {"AttributeName": "sk", "AttributeType": "S"},
        ],
        BillingMode="PAY_PER_REQUEST",
    )
    client.get_waiter("table_exists").wait(TableName=TABLE_NAME)
    print(f"Created table '{TABLE_NAME}'.")


def hour_multiplier(hour: int, weekday: int) -> float:
    """Shape demand across the day. weekday: 0=Mon..6=Sun."""
    is_weekend = weekday >= 5

    if hour < 6:
        return 0.15                              # dead of night
    if 6 <= hour < 9:
        return 2.2 if not is_weekend else 1.0    # weekday gym rush
    if 9 <= hour < 12:
        return 1.0 if not is_weekend else 2.4    # weekend morning sports
    if 12 <= hour < 14:
        return 1.8                               # lunch
    if 14 <= hour < 17:
        return 0.9
    if 17 <= hour < 22:
        return 3.0 if not is_weekend else 2.0    # weekday evening peak
    return 0.5


def seed():
    random.seed(42)  # deterministic output across runs

    ensure_table_exists(_client("dynamodb"))
    table = _resource("dynamodb").Table(TABLE_NAME)

    now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
    written = 0

    # Build the full set of (hour, cell, activity) slots, weighted by time-of-day
    # so peak hours are more likely to be sampled.
    for day_offset in range(DAYS_BACK):
        day_date_obj = now - timedelta(days=day_offset)
        slots = []
        weights = []
        for hour in range(24):
            ts = day_date_obj.replace(hour=hour)
            mult = hour_multiplier(ts.hour, ts.weekday())
            for cell in VENUE_CELLS:
                for activity in ACTIVITY_TYPES:
                    slots.append((ts, cell, activity, mult))
                    weights.append(mult)

        # Weighted sample without replacement
        sampled = set()
        target = min(ITEMS_PER_DAY, len(slots))
        while len(sampled) < target:
            idx = random.choices(range(len(slots)), weights=weights, k=1)[0]
            sampled.add(idx)

        day_written = 0
        with table.batch_writer() as batch:
            for idx in sampled:
                ts, cell, activity, mult = slots[idx]
                sk = ts.strftime("HOUR#%Y-%m-%dT%H")

                base = random.randint(2, 10)
                pings = max(1, int(base * mult))
                match_rate = random.uniform(0.35, 0.75)
                matches = int(pings * match_rate)
                expires = pings - matches

                batch.put_item(Item={
                    "pk": f"{cell}#{activity}",
                    "sk": sk,
                    "ping_count": Decimal(pings),
                    "match_count": Decimal(matches),
                    "expire_count": Decimal(expires),
                })
                day_written += 1

        written += day_written
        print(f"  day -{day_offset:<2} ({day_date_obj.strftime('%Y-%m-%d')}): {day_written} items  [total: {written}]")

    print(f"Seeded {written} items into '{TABLE_NAME}' on LocalStack.")


if __name__ == "__main__":
    seed()
