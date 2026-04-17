"""
-- FOR LOCAL DEVELOPMENT ONLY --

Clear analytics data by deleting and recreating the activity_metrics table
on LocalStack. Does NOT touch real AWS.

Usage:
    python scripts/clear_analytics.py
"""
import boto3

TABLE_NAME = "activity_metrics"
ENDPOINT_URL = "http://localhost:4566"
REGION = "ap-southeast-1"


def _client():
    return boto3.client(
        "dynamodb",
        endpoint_url=ENDPOINT_URL,
        region_name=REGION,
        aws_access_key_id="test",
        aws_secret_access_key="test",
    )


def clear():
    client = _client()

    print(f"Deleting table '{TABLE_NAME}'...")
    try:
        client.delete_table(TableName=TABLE_NAME)
        client.get_waiter("table_not_exists").wait(TableName=TABLE_NAME)
        print("Table deleted.")
    except client.exceptions.ResourceNotFoundException:
        print("Table not found, skipping delete.")

    print(f"Recreating table '{TABLE_NAME}'...")
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
    print("Done! Analytics data has been wiped and the table is empty.")


if __name__ == "__main__":
    clear()
