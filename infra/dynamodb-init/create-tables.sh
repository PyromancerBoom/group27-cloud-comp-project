#!/bin/bash
# Creates DynamoDB tables in dynamodb-local on first startup.
# Called from docker-compose as an init container or run manually:
#   docker compose run --rm dynamodb-init

ENDPOINT=http://dynamodb-local:8000

echo "==> Creating activity_metrics table..."
aws dynamodb create-table \
  --endpoint-url "$ENDPOINT" \
  --region ap-southeast-1 \
  --table-name activity_metrics \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo "==> Done."
