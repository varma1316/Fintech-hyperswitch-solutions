# --- Frontend Static S3 Bucket ---
resource "aws_s3_bucket" "frontend" {
  bucket        = var.s3_bucket_name
  force_destroy = true

  tags = {
    Name = "${var.project_name}-frontend-bucket"
  }
}

# Block all public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket versioning
resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Server-side encryption (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bucket policy allowing CloudFront OAC to read objects
resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.frontend.arn
          }
        }
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# ==============================================================================
# Folder Placeholders for the 3 Frontend Apps in the Single S3 Bucket
# ==============================================================================

resource "aws_s3_object" "control_center_folder" {
  bucket  = aws_s3_bucket.frontend.id
  key     = "control-center/"
  content = ""
}

resource "aws_s3_object" "web_folder" {
  bucket  = aws_s3_bucket.frontend.id
  key     = "web/"
  content = ""
}

resource "aws_s3_object" "ecommerce_store_folder" {
  bucket  = aws_s3_bucket.frontend.id
  key     = "ecommerce-store/"
  content = ""
}
