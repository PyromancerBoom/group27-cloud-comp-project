resource "aws_s3_bucket" "analytics_archive" {
  bucket_prefix = "${substr(replace(local.name_prefix, "_", "-"), 0, 32)}-analytics-"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-archive"
  })
}

resource "aws_s3_bucket_versioning" "analytics_archive" {
  bucket = aws_s3_bucket.analytics_archive.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_dynamodb_table" "activity_metrics" {
  name         = "${local.name_prefix}-activity-metrics"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "pk"
  range_key    = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-activity-metrics"
  })
}

resource "aws_kinesis_stream" "analytics" {
  name             = "${local.name_prefix}-analytics"
  shard_count      = 1
  retention_period = 24

  stream_mode_details {
    stream_mode = "PROVISIONED"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics"
  })
}

resource "aws_iam_role" "backend" {
  name = "${local.name_prefix}-backend-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-role"
  })
}

resource "aws_iam_instance_profile" "backend" {
  name = "${local.name_prefix}-backend-profile"
  role = aws_iam_role.backend.name
}

resource "aws_iam_role_policy_attachment" "backend_ssm" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy_attachment" "backend_cloudwatch" {
  role       = aws_iam_role.backend.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_role_policy" "backend_app_access" {
  name = "${local.name_prefix}-backend-app-access"
  role = aws_iam_role.backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KinesisWrite"
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
          "kinesis:PutRecord",
          "kinesis:PutRecords"
        ]
        Resource = aws_kinesis_stream.analytics.arn
      },
      {
        Sid    = "DynamoReadAnalytics"
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.activity_metrics.arn
      },
      {
        Sid    = "S3ArchiveReadWrite"
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.analytics_archive.arn,
          "${aws_s3_bucket.analytics_archive.arn}/*"
        ]
      }
    ]
  })
}