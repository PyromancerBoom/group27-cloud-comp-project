resource "aws_cloudwatch_log_group" "analytics_firehose" {
  name              = "/aws/kinesisfirehose/${local.name_prefix}-analytics-archive"
  retention_in_days = 14

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-firehose-logs"
  })
}

resource "aws_cloudwatch_log_stream" "analytics_firehose" {
  name           = "S3Delivery"
  log_group_name = aws_cloudwatch_log_group.analytics_firehose.name
}

resource "aws_iam_role" "analytics_firehose" {
  name = "${local.name_prefix}-analytics-firehose-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "firehose.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-firehose-role"
  })
}

resource "aws_iam_role_policy" "analytics_firehose_access" {
  name = "${local.name_prefix}-analytics-firehose-access"
  role = aws_iam_role.analytics_firehose.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KinesisRead"
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
          "kinesis:GetShardIterator",
          "kinesis:GetRecords",
          "kinesis:ListShards"
        ]
        Resource = aws_kinesis_stream.analytics.arn
      },
      {
        Sid    = "S3WriteArchive"
        Effect = "Allow"
        Action = [
          "s3:AbortMultipartUpload",
          "s3:GetBucketLocation",
          "s3:ListBucket",
          "s3:ListBucketMultipartUploads",
          "s3:PutObject"
        ]
        Resource = [
          aws_s3_bucket.analytics_archive.arn,
          "${aws_s3_bucket.analytics_archive.arn}/*"
        ]
      },
      {
        Sid    = "CloudWatchLogsWrite"
        Effect = "Allow"
        Action = [
          "logs:PutLogEvents"
        ]
        Resource = aws_cloudwatch_log_stream.analytics_firehose.arn
      }
    ]
  })
}

resource "aws_kinesis_firehose_delivery_stream" "analytics_archive" {
  name        = "${local.name_prefix}-analytics-archive"
  destination = "extended_s3"

  kinesis_source_configuration {
    kinesis_stream_arn = aws_kinesis_stream.analytics.arn
    role_arn           = aws_iam_role.analytics_firehose.arn
  }

  extended_s3_configuration {
    role_arn           = aws_iam_role.analytics_firehose.arn
    bucket_arn         = aws_s3_bucket.analytics_archive.arn
    buffering_size     = var.analytics_firehose_buffering_size
    buffering_interval = var.analytics_firehose_buffering_interval
    compression_format = var.analytics_firehose_compression_format

    prefix              = var.analytics_firehose_s3_prefix
    error_output_prefix = var.analytics_firehose_error_output_prefix

    cloudwatch_logging_options {
      enabled         = true
      log_group_name  = aws_cloudwatch_log_group.analytics_firehose.name
      log_stream_name = aws_cloudwatch_log_stream.analytics_firehose.name
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-archive"
  })
}