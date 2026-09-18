# ==============================================================================
# Backend Microservices IAM Role
# ==============================================================================

resource "aws_iam_role" "backend_service_role" {
  name        = "${var.project_name}-backend-service-role"
  description = "Execution role for Hyperswitch backend microservices"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = [
            "ec2.amazonaws.com",
            "ecs-tasks.amazonaws.com",
            "eks.amazonaws.com"
          ]
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-backend-service-role"
  }
}

# ==============================================================================
# IAM Policies
# ==============================================================================

# 1. Messaging Policy (SQS & SNS)
resource "aws_iam_policy" "backend_messaging_policy" {
  name        = "${var.project_name}-backend-messaging-policy"
  description = "Allows backend microservices to publish to SNS and consume/produce with SQS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SQSOperations"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.inventory_queue.arn,
          aws_sqs_queue.inventory_dlq.arn,
          aws_sqs_queue.notification_queue.arn,
          aws_sqs_queue.notification_dlq.arn
        ]
      },
      {
        Sid    = "SNSPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = [
          aws_sns_topic.payment_events.arn
        ]
      }
    ]
  })
}

# 2. Secrets Manager & SSM Parameter Store Policy
resource "aws_iam_policy" "backend_secrets_policy" {
  name        = "${var.project_name}-backend-secrets-policy"
  description = "Allows backend microservices to retrieve application credentials and configs"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          "arn:aws:secretsmanager:*:*:secret:${var.project_name}/*"
        ]
      },
      {
        Sid    = "SSMParametersAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:*:*:parameter/${var.project_name}/*"
        ]
      }
    ]
  })
}

# 3. S3 Bucket Policy for Backend
resource "aws_iam_policy" "backend_s3_policy" {
  name        = "${var.project_name}-backend-s3-policy"
  description = "Allows backend microservices read access to frontend assets and receipts"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3ReadAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      }
    ]
  })
}

# 4. CloudWatch Logs Policy
resource "aws_iam_policy" "backend_logging_policy" {
  name        = "${var.project_name}-backend-logging-policy"
  description = "Allows backend microservices to stream application logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "CloudWatchLogsAccess"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:log-group:/aws/${var.project_name}/*"
      }
    ]
  })
}

# ==============================================================================
# IAM Policy Attachments
# ==============================================================================

resource "aws_iam_role_policy_attachment" "messaging" {
  role       = aws_iam_role.backend_service_role.name
  policy_arn = aws_iam_policy.backend_messaging_policy.arn
}

resource "aws_iam_role_policy_attachment" "secrets" {
  role       = aws_iam_role.backend_service_role.name
  policy_arn = aws_iam_policy.backend_secrets_policy.arn
}

resource "aws_iam_role_policy_attachment" "s3" {
  role       = aws_iam_role.backend_service_role.name
  policy_arn = aws_iam_policy.backend_s3_policy.arn
}

resource "aws_iam_role_policy_attachment" "logging" {
  role       = aws_iam_role.backend_service_role.name
  policy_arn = aws_iam_policy.backend_logging_policy.arn
}

resource "aws_iam_role_policy_attachment" "ecr_pull" {
  role       = aws_iam_role.backend_service_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# ==============================================================================
# IAM Instance Profile (for EC2 / self-managed worker nodes)
# ==============================================================================

resource "aws_iam_instance_profile" "backend_profile" {
  name = "${var.project_name}-backend-instance-profile"
  role = aws_iam_role.backend_service_role.name
}
