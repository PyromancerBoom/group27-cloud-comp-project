locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}

resource "aws_subnet" "public" {
  for_each = {
    for idx, cidr in var.public_subnet_cidrs : idx => {
      cidr = cidr
      az   = local.azs[idx]
    }
  }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-public-${each.value.az}"
    Tier = "public"
  })
}

resource "aws_subnet" "private_app" {
  for_each = {
    for idx, cidr in var.private_app_subnet_cidrs : idx => {
      cidr = cidr
      az   = local.azs[idx]
    }
  }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-app-${each.value.az}"
    Tier = "private-app"
  })
}

resource "aws_subnet" "private_data" {
  for_each = {
    for idx, cidr in var.private_data_subnet_cidrs : idx => {
      cidr = cidr
      az   = local.azs[idx]
    }
  }

  vpc_id                  = aws_vpc.this.id
  cidr_block              = each.value.cidr
  availability_zone       = each.value.az
  map_public_ip_on_launch = false

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-data-${each.value.az}"
    Tier = "private-data"
  })
}

resource "aws_elasticache_subnet_group" "redis" {
  name       = "${replace(local.name_prefix, "_", "-")}-redis-subnets"
  subnet_ids = values(aws_subnet.private_data)[*].id

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-redis-subnet-group"
  })
}
