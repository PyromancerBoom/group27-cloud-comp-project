variable "project_name" {
  description = "Project name prefix for all resources."
  type        = string
  default     = "need-a-sidekick"
}

variable "environment" {
  description = "Environment name, e.g. dev, staging, prod."
  type        = string
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region to deploy into."
  type        = string
  default     = "ap-southeast-1"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Two public subnet CIDRs, one per AZ."
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "Two private app subnet CIDRs, one per AZ."
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "private_data_subnet_cidrs" {
  description = "Two private data subnet CIDRs, one per AZ."
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

variable "enable_nat_gateway" {
  description = "Whether to provision a NAT Gateway for private app subnets."
  type        = bool
  default     = true
}

variable "backend_port" {
  description = "Backend application port exposed on EC2."
  type        = number
  default     = 8000
}

variable "backend_health_check_path" {
  description = "Health check path for the backend target group."
  type        = string
  default     = "/health"
}

variable "instance_type" {
  description = "EC2 instance type for backend nodes."
  type        = string
  default     = "t3.small"
}

variable "backend_desired_capacity" {
  description = "Desired number of backend instances."
  type        = number
  default     = 2
}

variable "backend_min_size" {
  description = "Minimum number of backend instances."
  type        = number
  default     = 2
}

variable "backend_max_size" {
  description = "Maximum number of backend instances."
  type        = number
  default     = 4
}

variable "backend_image" {
  description = "Container image URI for the backend service, ideally an ECR image."
  type        = string
  default     = "public.ecr.aws/docker/library/nginx:stable"
}

variable "backend_container_name" {
  description = "Container name for the backend service."
  type        = string
  default     = "sidekick-backend"
}

variable "ssh_key_name" {
  description = "Optional EC2 key pair name. Leave null to disable SSH key injection."
  type        = string
  default     = null
}

variable "allowed_ingress_cidrs" {
  description = "CIDRs allowed to reach the internet-facing ALB."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "alb_certificate_arn" {
  description = "Optional ACM certificate ARN for HTTPS on the ALB. If null, only HTTP listener is created."
  type        = string
  default     = null
}

variable "redis_node_type" {
  description = "ElastiCache node type."
  type        = string
  default     = "cache.t4g.micro"
}

variable "redis_engine_version" {
  description = "Redis engine version."
  type        = string
  default     = "7.1"
}

variable "redis_num_cache_clusters" {
  description = "Number of cache clusters in the replication group."
  type        = number
  default     = 2
}

variable "redis_snapshot_retention_limit" {
  description = "Daily snapshot retention limit in days."
  type        = number
  default     = 1
}

variable "common_tags" {
  description = "Extra tags applied to all resources."
  type        = map(string)
  default     = {}
}

variable "github_branch" {
  description = "Git branch to deploy from GitHub"
  type        = string
  default     = "main"
}

variable "analytics_lambda_function_name" {
  description = "Name of the analytics aggregation Lambda function."
  type        = string
  default     = "need-a-sidekick-dev-analytics-aggregator"
}

variable "analytics_lambda_handler" {
  description = "Handler entrypoint for the analytics Lambda."
  type        = string
  default     = "handler.lambda_handler"
}

variable "analytics_lambda_runtime" {
  description = "Runtime for the analytics Lambda."
  type        = string
  default     = "python3.11"
}

variable "analytics_lambda_zip_path" {
  description = "Path to the built Lambda zip, relative to the terraform directory."
  type        = string
  default     = "../lambda/dist/analytics_lambda.zip"
}

variable "analytics_lambda_timeout" {
  description = "Timeout in seconds for the analytics Lambda."
  type        = number
  default     = 30
}

variable "analytics_lambda_memory_size" {
  description = "Memory size in MB for the analytics Lambda."
  type        = number
  default     = 256
}

variable "analytics_lambda_batch_size" {
  description = "Number of Kinesis records to batch per Lambda invocation."
  type        = number
  default     = 100
}
