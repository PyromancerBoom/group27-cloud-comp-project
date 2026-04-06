resource "aws_cloudwatch_log_group" "analytics_lambda" {
  name              = "/aws/lambda/${var.analytics_lambda_function_name}"
  retention_in_days = 14

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-lambda-logs"
  })
}

resource "aws_iam_role" "analytics_lambda" {
  name = "${local.name_prefix}-analytics-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-lambda-role"
  })
}

resource "aws_iam_role_policy_attachment" "analytics_lambda_basic" {
  role       = aws_iam_role.analytics_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "analytics_lambda_access" {
  name = "${local.name_prefix}-analytics-lambda-access"
  role = aws_iam_role.analytics_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "KinesisRead"
        Effect = "Allow"
        Action = [
          "kinesis:DescribeStream",
          "kinesis:DescribeStreamSummary",
          "kinesis:GetRecords",
          "kinesis:GetShardIterator",
          "kinesis:ListShards",
          "kinesis:SubscribeToShard"
        ]
        Resource = aws_kinesis_stream.analytics.arn
      },
      {
        Sid    = "DynamoReadWriteAnalytics"
        Effect = "Allow"
        Action = [
          "dynamodb:DescribeTable",
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.activity_metrics.arn
      }
    ]
  })
}

resource "aws_lambda_function" "analytics_aggregator" {
  function_name = var.analytics_lambda_function_name
  role          = aws_iam_role.analytics_lambda.arn
  handler       = var.analytics_lambda_handler
  runtime       = var.analytics_lambda_runtime
  filename      = "${path.module}/${var.analytics_lambda_zip_path}"

  source_code_hash = filebase64sha256("${path.module}/${var.analytics_lambda_zip_path}")
  timeout          = var.analytics_lambda_timeout
  memory_size      = var.analytics_lambda_memory_size

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.activity_metrics.name
      KINESIS_STREAM_NAME = aws_kinesis_stream.analytics.name
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.analytics_lambda,
    aws_iam_role_policy_attachment.analytics_lambda_basic,
    aws_iam_role_policy.analytics_lambda_access
  ]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-analytics-lambda"
  })
}

resource "aws_lambda_event_source_mapping" "analytics_kinesis" {
  event_source_arn  = aws_kinesis_stream.analytics.arn
  function_name     = aws_lambda_function.analytics_aggregator.arn
  starting_position = "LATEST"
  batch_size        = var.analytics_lambda_batch_size
  enabled           = true
}
