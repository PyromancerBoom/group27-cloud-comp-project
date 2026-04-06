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