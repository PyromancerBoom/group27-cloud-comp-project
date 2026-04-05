# --- S3 Buckets for Frontend Hosting ---

resource "aws_s3_bucket" "frontend_pwa" {
  bucket_prefix = "${substr(replace(local.name_prefix, "_", "-"), 0, 32)}-pwa-"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-frontend-pwa"
  })
}

resource "aws_s3_bucket_public_access_block" "frontend_pwa" {
  bucket = aws_s3_bucket.frontend_pwa.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "admin_dashboard" {
  bucket_prefix = "${substr(replace(local.name_prefix, "_", "-"), 0, 32)}-dashboard-"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-admin-dashboard"
  })
}

resource "aws_s3_bucket_public_access_block" "admin_dashboard" {
  bucket = aws_s3_bucket.admin_dashboard.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# --- CloudFront Origin Access Control (OAC) ---
# This ensures that S3 buckets are only accessible via CloudFront.

resource "aws_cloudfront_origin_access_control" "this" {
  name                              = "${local.name_prefix}-oac"
  description                       = "OAC for Frontend S3 buckets"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# --- CloudFront Distribution for Frontend PWA ---

resource "aws_cloudfront_distribution" "frontend_pwa" {
  origin {
    domain_name              = aws_s3_bucket.frontend_pwa.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
    origin_id                = "S3-FrontendPWA"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  # Caching Behavior (optimized for SPAs like React)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-FrontendPWA"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0      # Force revalidation for index.html
    max_ttl                = 300    # Short max TTL for the entry point
  }

  # Fingerprinted assets can be cached for a long time (1 year)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-FrontendPWA"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000 # 1 year
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  # SPA Routing: Redirect 404/403 to index.html so React Router handles it
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-pwa-distribution"
  })
}

# --- CloudFront Distribution for Admin Dashboard ---

resource "aws_cloudfront_distribution" "admin_dashboard" {
  origin {
    domain_name              = aws_s3_bucket.admin_dashboard.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.this.id
    origin_id                = "S3-AdminDashboard"
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-AdminDashboard"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 0      # Force revalidation for index.html
    max_ttl                = 300    # Short max TTL
  }

  # Fingerprinted assets can be cached for a long time (1 year)
  ordered_cache_behavior {
    path_pattern     = "/assets/*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-AdminDashboard"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 31536000 # 1 year
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  # SPA Routing for Dashboard
  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 10
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-dashboard-distribution"
  })
}

# --- S3 Bucket Policies to allow CloudFront Access ---

resource "aws_s3_bucket_policy" "frontend_pwa" {
  bucket = aws_s3_bucket.frontend_pwa.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_pwa.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend_pwa.arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "admin_dashboard" {
  bucket = aws_s3_bucket.admin_dashboard.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipalReadOnly"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.admin_dashboard.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.admin_dashboard.arn
          }
        }
      }
    ]
  })
}
