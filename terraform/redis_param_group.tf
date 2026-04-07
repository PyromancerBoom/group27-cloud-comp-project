resource "aws_elasticache_parameter_group" "redis" {
  name   = "${replace(local.name_prefix, "_", "-")}-redis-pg"
  family = "redis7"

  parameter {
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-pg"
  })
}
