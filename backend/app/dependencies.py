import boto3
import redis.asyncio as aioredis
from functools import lru_cache
from app.config import settings


@lru_cache
def get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)


@lru_cache
def get_kinesis_client():
    kwargs = dict(
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    if settings.kinesis_endpoint_url:
        kwargs["endpoint_url"] = settings.kinesis_endpoint_url
    return boto3.client("kinesis", **kwargs)


@lru_cache
def get_dynamodb_resource():
    kwargs = dict(
        region_name=settings.aws_region,
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
    )
    if settings.dynamodb_endpoint_url:
        kwargs["endpoint_url"] = settings.dynamodb_endpoint_url
    return boto3.resource("dynamodb", **kwargs)
