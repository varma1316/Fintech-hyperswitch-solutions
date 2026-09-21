# ==============================================================================
# AWS Secrets Manager: Consolidated Infrastructure Metadata & Credentials
# ==============================================================================

data "aws_caller_identity" "current" {}

resource "random_password" "jwt_secret" {
  length  = 32
  special = false
}

resource "random_password" "hyperswitch_api_key" {
  length  = 32
  special = false
}

resource "random_password" "hyperswitch_admin_key" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "infra" {
  name                    = "${var.project_name}/infra"
  description             = "Consolidated infrastructure endpoints, credentials, and parameters for Hyperswitch frontend and backend services"
  recovery_window_in_days = 0

  tags = {
    Name = "${var.project_name}-infra-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "infra" {
  secret_id = aws_secretsmanager_secret.infra.id

  secret_string = jsonencode({
    # AWS Region & Account
    AWS_REGION     = var.aws_region
    AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id

    # Amazon EKS Cluster
    EKS_CLUSTER_NAME     = aws_eks_cluster.main.name
    EKS_CLUSTER_ENDPOINT = aws_eks_cluster.main.endpoint
    EKS_CLUSTER_ARN      = aws_eks_cluster.main.arn

    # Kubernetes Namespaces (Dedicated namespace per microservice + Hyperswitch core)
    KUBE_NAMESPACE                 = "hyperswitch"
    NAMESPACE_HYPERSWITCH          = "hyperswitch"
    NAMESPACE_AUTH_SERVICE         = "auth-service"
    NAMESPACE_CART_SERVICE         = "cart-service"
    NAMESPACE_INVENTORY_SERVICE    = "inventory-service"
    NAMESPACE_NOTIFICATION_SERVICE = "notification-service"
    NAMESPACE_ORDER_SERVICE        = "order-service"
    NAMESPACE_PRODUCT_SERVICE      = "product-service"

    # Frontend S3 Bucket & CloudFront CDN
    S3_BUCKET                  = aws_s3_bucket.frontend.id
    S3_BUCKET_ARN              = aws_s3_bucket.frontend.arn
    CLOUDFRONT_DISTRIBUTION_ID = aws_cloudfront_distribution.frontend.id
    CLOUDFRONT_DOMAIN          = aws_cloudfront_distribution.frontend.domain_name
    CLOUDFRONT_URL             = "https://${aws_cloudfront_distribution.frontend.domain_name}"

    # Asynchronous Messaging (SQS & SNS)
    SQS_INVENTORY_QUEUE_URL       = aws_sqs_queue.inventory_queue.url
    SQS_INVENTORY_QUEUE_ARN       = aws_sqs_queue.inventory_queue.arn
    SQS_NOTIFICATION_QUEUE_URL    = aws_sqs_queue.notification_queue.url
    SQS_NOTIFICATION_QUEUE_ARN    = aws_sqs_queue.notification_queue.arn
    SNS_PAYMENT_SUCCESS_TOPIC_ARN = aws_sns_topic.payment_events.arn

    # RDS PostgreSQL Database Credentials & Connection Strings
    DB_HOST      = aws_db_instance.postgres.address
    DB_PORT      = tostring(aws_db_instance.postgres.port)
    DB_NAME      = aws_db_instance.postgres.db_name
    DB_USER      = aws_db_instance.postgres.username
    DB_PASSWORD  = random_password.db_password.result
    DATABASE_URL = "postgresql://${aws_db_instance.postgres.username}:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"
    ORDER_DB_URL = "postgresql://${aws_db_instance.postgres.username}:${random_password.db_password.result}@${aws_db_instance.postgres.endpoint}/${aws_db_instance.postgres.db_name}"

    # ElastiCache Redis Cluster Configuration
    REDIS_HOST = aws_elasticache_cluster.redis.cache_nodes[0].address
    REDIS_PORT = "6379"
    REDIS_URL  = "redis://${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"

    # Application Authentication Tokens & Hyperswitch API Keys
    JWT_SECRET                 = random_password.jwt_secret.result
    HYPERSWITCH_SERVER_URL     = "http://hyperswitch.hyperswitch.svc.cluster.local:8080"
    HYPERSWITCH_API_KEY        = random_password.hyperswitch_api_key.result
    HYPERSWITCH_ADMIN_API_KEY  = random_password.hyperswitch_admin_key.result

    # Amazon ECR Registry & Repository URLs
    ECR_REGISTRY             = "${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    ECR_AUTH_SERVICE         = aws_ecr_repository.services["auth-service"].repository_url
    ECR_CART_SERVICE         = aws_ecr_repository.services["cart-service"].repository_url
    ECR_INVENTORY_SERVICE    = aws_ecr_repository.services["inventory-service"].repository_url
    ECR_NOTIFICATION_SERVICE = aws_ecr_repository.services["notification-service"].repository_url
    ECR_ORDER_SERVICE        = aws_ecr_repository.services["order-service"].repository_url
    ECR_PRODUCT_SERVICE      = aws_ecr_repository.services["product-service"].repository_url
  })
}
