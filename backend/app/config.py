from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"

    aws_region: str = "ap-southeast-1"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    dynamodb_endpoint_url: str | None = None  # None = real AWS
    kinesis_endpoint_url: str | None = None   # None = real AWS (or drop events locally)

    kinesis_stream_name: str = "need-a-sidekick-events"
    dynamodb_table_name: str = "activity_metrics"
    s3_bucket_name: str = "need-a-sidekick-archive"

    lobby_ttl_seconds: int = 900
    default_radius_meters: int = 10
    max_radius_meters: int = 100

    class Config:
        env_file = ".env"


settings = Settings()
