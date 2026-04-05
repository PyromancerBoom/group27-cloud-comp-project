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

output "frontend_pwa_url" {
  description = "Public URL for the Frontend PWA"
  value       = "https://${aws_cloudfront_distribution.frontend_pwa.domain_name}"
}

output "admin_dashboard_url" {
  description = "Public URL for the Admin Dashboard"
  value       = "https://${aws_cloudfront_distribution.admin_dashboard.domain_name}"
}

output "frontend_pwa_bucket" {
  description = "S3 bucket name for the Frontend PWA"
  value       = aws_s3_bucket.frontend_pwa.bucket
}

output "admin_dashboard_bucket" {
  description = "S3 bucket name for the Admin Dashboard"
  value       = aws_s3_bucket.admin_dashboard.bucket
}

output "vite_api_url" {
  description = "The backend URL for frontend environment variables"
  value       = "http://${aws_lb.this.dns_name}"
}

output "deployment_instructions" {
  description = "Helper commands for deployment"
  value = <<EOT
To deploy the frontend:
1. Create .env.production in frontend/ and dashboard/ with:
   VITE_API_URL=http://${aws_lb.this.dns_name}
2. Build: npm run build
3. Sync PWA: aws s3 sync ./frontend/dist s3://${aws_s3_bucket.frontend_pwa.bucket} --delete
4. Sync Dashboard: aws s3 sync ./dashboard/dist s3://${aws_s3_bucket.admin_dashboard.bucket} --delete
EOT
}
