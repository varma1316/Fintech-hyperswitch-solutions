# ==============================================================================
# Amazon Elastic Container Registry (ECR) for Microservices
# ==============================================================================

locals {
  backend_services = [
    "auth-service",
    "cart-service",
    "inventory-service",
    "notification-service",
    "order-service",
    "product-service"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.backend_services)
  name                 = "${var.project_name}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name    = "${var.project_name}-${each.key}-ecr"
    Service = each.key
  }
}

# ==============================================================================
# ECR Lifecycle Policy (Keep last 10 tagged images, expire untagged after 7 days)
# ==============================================================================

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = toset(local.backend_services)
  repository = aws_ecr_repository.services[each.key].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep last 10 tagged images"
        selection = {
          tagStatus     = "tagged"
          tagPrefixList = ["v", "sha", "master", "latest"]
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
