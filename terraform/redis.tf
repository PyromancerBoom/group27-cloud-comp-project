resource "aws_elasticache_replication_group" "redis" {
  replication_group_id       = substr(replace(local.name_prefix, "_", "-"), 0, 40)
  description                = "Redis for ${local.name_prefix}"
  engine                     = "redis"
  engine_version             = var.redis_engine_version
  node_type                  = var.redis_node_type
  parameter_group_name       = aws_elasticache_parameter_group.redis.name
  port                       = 6379
  automatic_failover_enabled = var.redis_num_cache_clusters > 1
  multi_az_enabled           = var.redis_num_cache_clusters > 1
  num_cache_clusters         = var.redis_num_cache_clusters
  subnet_group_name          = aws_elasticache_subnet_group.redis.name
  security_group_ids         = [aws_security_group.redis.id]
  snapshot_retention_limit   = var.redis_snapshot_retention_limit
  at_rest_encryption_enabled = true
  transit_encryption_enabled = false
  apply_immediately          = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis"
  })

  lifecycle {
    ignore_changes = [num_cache_clusters]
  }
}
