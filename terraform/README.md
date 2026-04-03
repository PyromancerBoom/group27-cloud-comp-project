# Infrastructure (Terraform)

This folder contains the Terraform configuration for deploying the **Need A Sidekick** backend system on AWS.  
Each `.tf` file defines a specific part of the infrastructure. Together, they form a complete cloud deployment.

---

## Overview

Terraform treats all `.tf` files in this directory as a **single configuration**.  
Each file focuses on a specific layer of the system:

- Networking (VPC, subnets, routing)
- Security (security groups, IAM)
- Compute (EC2, Auto Scaling)
- Data (Redis, DynamoDB, S3)
- Integration (Kinesis, endpoints)

---

## File Descriptions

### `vpc.tf`
Defines the **Virtual Private Cloud (VPC)**.

- Creates the main network boundary
- Sets CIDR block for all resources
- Enables DNS support and hostnames

---

### `subnets.tf`
Defines all subnets across availability zones.

- `public` → for ALB and internet-facing resources  
- `private_app` → for EC2 backend instances  
- `private_data` → for Redis and internal services  
- Also defines:
  - `aws_elasticache_subnet_group.redis` for Redis placement

---

### `route_tables.tf`
Configures routing inside the VPC.

- Public route table → routes traffic to Internet Gateway  
- Private route tables → route traffic through NAT Gateway  
- Associates route tables with correct subnets  

---

### `security_groups.tf`
Defines firewall rules between components.

- `backend` → allows traffic from ALB to EC2  
- `redis` → allows traffic only from backend instances  
- Controls inbound/outbound access between services  

---

### `alb.tf`
Defines the Application Load Balancer.

- Internet-facing ALB in public subnets  
- Target group for backend instances  
- Health check endpoint (`/health`)  
- Listener routing (HTTP → backend)

---

### `ec2_asg.tf`
Defines the backend compute layer.

- Launch Template:
  - installs Docker + Git
  - clones GitHub repo
  - builds backend image
  - runs FastAPI container
- Auto Scaling Group:
  - deploys instances in private app subnets
  - attaches to ALB target group

---

### `redis.tf`
Defines the Redis (ElastiCache) cluster.

- Uses `aws_elasticache_replication_group`
- Runs inside private data subnets
- Uses subnet group defined in `subnets.tf`
- Accessible only from backend security group

---

### `iam.tf`
Defines IAM roles and permissions.

- EC2 instance role + instance profile  
- Permissions for:
  - Kinesis (write events)
  - DynamoDB (read analytics)
  - S3 (archive storage)
- Also creates:
  - DynamoDB table (`activity_metrics`)
  - Kinesis stream (`analytics`)
  - S3 bucket (`analytics_archive`)

---

### `endpoints.tf`
Defines VPC endpoints (optional but recommended).

- Allows private access to AWS services without internet
- Typically includes:
  - S3
  - DynamoDB

---

### `outputs.tf`
Defines outputs after deployment.

Examples:
- ALB DNS name (public URL)
- Redis endpoint
- Resource identifiers

Used for:
- debugging
- connecting frontend to backend

---

## Key Concepts

### Modular design
Each file focuses on one concern:
- easier to maintain
- easier to debug

### Shared references
Resources are linked across files using names like:

```hcl
aws_lb_target_group.backend
aws_subnet.private_app
aws_elasticache_replication_group.redis