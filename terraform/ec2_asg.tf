data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-2023*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_launch_template" "backend" {
  name_prefix   = "${local.name_prefix}-backend-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = var.instance_type

  vpc_security_group_ids = [
    aws_security_group.backend.id
  ]

  iam_instance_profile {
    name = aws_iam_instance_profile.backend.name
  }

  monitoring {
    enabled = true
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -euxo pipefail

    exec > >(tee /var/log/user-data.log | logger -t user-data -s 2>/dev/console) 2>&1

    dnf update -y
    dnf install -y git docker

    systemctl enable docker
    systemctl start docker

    mkdir -p /opt/sidekick
    cd /opt/sidekick

    rm -rf repo
    git clone --branch ${var.github_branch} https://github.com/PyromancerBoom/group27-cloud-comp-project.git repo

    cd /opt/sidekick/repo/backend

    docker build -t ${var.backend_container_name}:latest .

    docker rm -f ${var.backend_container_name} || true

    docker run -d \
      --name ${var.backend_container_name} \
      --restart unless-stopped \
      -p ${var.backend_port}:${var.backend_port} \
      -e REDIS_URL=redis://${aws_elasticache_replication_group.redis.primary_endpoint_address}:6379 \
      -e AWS_REGION=${var.aws_region} \
      -e DYNAMODB_TABLE_NAME=${aws_dynamodb_table.activity_metrics.name} \
      -e KINESIS_STREAM_NAME=${aws_kinesis_stream.analytics.name} \
      -e S3_BUCKET_NAME=${aws_s3_bucket.analytics_archive.bucket} \
      ${var.backend_container_name}:latest
  EOF
  )

  tag_specifications {
    resource_type = "instance"

    tags = merge(local.common_tags, {
      Name = "${local.name_prefix}-backend"
      Role = "backend"
    })
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-backend-launch-template"
  })
}

resource "aws_autoscaling_group" "backend" {
  name                      = "${local.name_prefix}-backend-asg"
  desired_capacity          = var.backend_desired_capacity
  min_size                  = var.backend_min_size
  max_size                  = var.backend_max_size
  vpc_zone_identifier       = values(aws_subnet.private_app)[*].id
  health_check_type         = "ELB"
  health_check_grace_period = 300

  target_group_arns = [
    aws_lb_target_group.backend.arn
  ]

  launch_template {
    id      = aws_launch_template.backend.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "${local.name_prefix}-backend"
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = local.common_tags.Project
    propagate_at_launch = true
  }

  tag {
    key                 = "Environment"
    value               = local.common_tags.Environment
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
  }
}
