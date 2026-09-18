# ==============================================================================
# CloudFront Origin Access Control (OAC)
# ==============================================================================

resource "aws_cloudfront_origin_access_control" "default" {
  name                              = "${var.project_name}-oac"
  description                       = "Origin Access Control for Hyperswitch frontend S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ==============================================================================
# CloudFront Function for Multi-SPA Subpath Routing
# ==============================================================================
# Correctly routes:
#  - /control-center/* -> /control-center/index.html
#  - /web/*            -> /web/index.html
#  - /* (Storefront)   -> /index.html
# Preserves static asset requests with file extensions (e.g., .js, .css, .svg)
# ==============================================================================

resource "aws_cloudfront_function" "spa_router" {
  name    = "${var.project_name}-spa-router"
  runtime = "cloudfront-js-2.0"
  comment = "Multi-SPA URL rewrite router for control-center, web, and ecommerce-store"
  publish = true

  code = <<-EOT
    function handler(event) {
        var request = event.request;
        var uri = request.uri;

        // If the request ends with a trailing slash, append index.html
        if (uri.endsWith('/')) {
            request.uri += 'index.html';
        }
        // If the request does NOT contain a dot, treat it as an SPA client-side route
        else if (!uri.includes('.')) {
            if (uri.startsWith('/control-center')) {
                request.uri = '/control-center/index.html';
            } else if (uri.startsWith('/web')) {
                request.uri = '/web/index.html';
            } else {
                request.uri = '/index.html';
            }
        }

        return request;
    }
  EOT
}

# ==============================================================================
# CloudFront Distribution
# ==============================================================================

resource "aws_cloudfront_distribution" "frontend" {
  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.frontend.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.default.id
  }

  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  comment             = "CloudFront distribution for Hyperswitch Multi-SPA frontends"

  # Free Tier / Lowest cost tier (North America & Europe)
  price_class = "PriceClass_100"

  # 1. Ordered Cache Behavior: Control Center Dashboard (/control-center*)
  ordered_cache_behavior {
    path_pattern     = "/control-center*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS Managed CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  # 2. Ordered Cache Behavior: Web Checkout & SDK (/web*)
  ordered_cache_behavior {
    path_pattern     = "/web*"
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS Managed CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  # 3. Default Cache Behavior: E-Commerce Storefront (/*)
  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.frontend.id}"

    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    cache_policy_id        = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS Managed CachingOptimized

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_router.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
