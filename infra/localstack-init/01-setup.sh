#!/bin/bash
# Runs inside LocalStack on startup — creates required AWS resources

echo "==> Creating Kinesis stream..."
awslocal kinesis create-stream \
  --stream-name need-a-sidekick-events \
  --shard-count 1

echo "==> Creating DynamoDB table..."
awslocal dynamodb create-table \
  --table-name activity_metrics \
  --attribute-definitions \
    AttributeName=pk,AttributeType=S \
    AttributeName=sk,AttributeType=S \
  --key-schema \
    AttributeName=pk,KeyType=HASH \
    AttributeName=sk,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST

echo "==> Creating S3 archive bucket..."
awslocal s3 mb s3://need-a-sidekick-archive

echo "==> LocalStack init complete."
