from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Redis
    # Local Docker Compose should use redis://redis:6379
    # EC2/Terraform can override this with the ElastiCache endpoint
    redis_url: str = "redis://redis:6379"

    # AWS
    aws_region: str = "ap-southeast-1"

    # For local emulators like DynamoDB Local / LocalStack
    # In real AWS on EC2, leave these unset and boto3 will use the instance role
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None

    dynamodb_endpoint_url: str | None = None
    kinesis_endpoint_url: str | None = None

    # Resource names
    kinesis_stream_name: str = "need-a-sidekick-events"
    dynamodb_table_name: str = "activity_metrics"
    s3_bucket_name: str = "need-a-sidekick-archive"

    # App settings
    lobby_ttl_seconds: int = 900
    default_radius_meters: int = 10
    max_radius_meters: int = 100


settings = Settings()