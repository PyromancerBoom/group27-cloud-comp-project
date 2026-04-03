import boto3
import redis.asyncio as aioredis
from functools import lru_cache
from app.config import settings


@lru_cache
def get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


def _aws_kwargs(endpoint_url: str | None = None) -> dict:
    kwargs = {
        "region_name": settings.aws_region,
    }

    # Only include explicit credentials if they are provided.
    # In real AWS, boto3 should use the EC2 instance role automatically.
    if settings.aws_access_key_id:
        kwargs["aws_access_key_id"] = settings.aws_access_key_id

    if settings.aws_secret_access_key:
        kwargs["aws_secret_access_key"] = settings.aws_secret_access_key

    if endpoint_url:
        kwargs["endpoint_url"] = endpoint_url

    return kwargs


@lru_cache
def get_kinesis_client():
    return boto3.client(
        "kinesis",
        **_aws_kwargs(settings.kinesis_endpoint_url),
    )


@lru_cache
def get_dynamodb_resource():
    return boto3.resource(
        "dynamodb",
        **_aws_kwargs(settings.dynamodb_endpoint_url),
    )