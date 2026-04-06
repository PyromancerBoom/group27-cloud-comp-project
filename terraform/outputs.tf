output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.this.id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = values(aws_subnet.public)[*].id
}

output "private_app_subnet_ids" {
  description = "Private app subnet IDs"
  value       = values(aws_subnet.private_app)[*].id
}

output "private_data_subnet_ids" {
  description = "Private data subnet IDs"
  value       = values(aws_subnet.private_data)[*].id
}

output "alb_dns_name" {
  description = "Public DNS name of the ALB"
  value       = aws_lb.this.dns_name
}

output "alb_zone_id" {
  description = "Route53 zone ID of the ALB"
  value       = aws_lb.this.zone_id
}

output "backend_target_group_arn" {
  description = "Backend target group ARN"
  value       = aws_lb_target_group.backend.arn
}

output "redis_primary_endpoint" {
  description = "Primary endpoint for Redis"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "kinesis_stream_name" {
  description = "Analytics Kinesis stream name"
  value       = aws_kinesis_stream.analytics.name
}

output "dynamodb_table_name" {
  description = "Analytics DynamoDB table name"
  value       = aws_dynamodb_table.activity_metrics.name
}

output "analytics_archive_bucket" {
  description = "S3 bucket for analytics archive"
  value       = aws_s3_bucket.analytics_archive.bucket
}

output "analytics_lambda_function_name" {
  description = "Analytics Lambda function name"
  value       = aws_lambda_function.analytics_aggregator.function_name
}

output "analytics_lambda_function_arn" {
  description = "Analytics Lambda function ARN"
  value       = aws_lambda_function.analytics_aggregator.arn
}
