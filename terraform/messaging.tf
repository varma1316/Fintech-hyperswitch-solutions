# ==============================================================================
# SQS Dead Letter Queues (DLQ)
# ==============================================================================

resource "aws_sqs_queue" "inventory_dlq" {
  name                      = "${var.project_name}-inventory-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "${var.project_name}-inventory-dlq"
  }
}

resource "aws_sqs_queue" "notification_dlq" {
  name                      = "${var.project_name}-notification-dlq"
  message_retention_seconds = 1209600 # 14 days
  sqs_managed_sse_enabled   = true

  tags = {
    Name = "${var.project_name}-notification-dlq"
  }
}

# ==============================================================================
# SQS Application Queues
# ==============================================================================

resource "aws_sqs_queue" "inventory_queue" {
  name                      = "${var.project_name}-inventory-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 10     # Long polling
  sqs_managed_sse_enabled   = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.inventory_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Name = "${var.project_name}-inventory-queue"
  }
}

resource "aws_sqs_queue" "notification_queue" {
  name                      = "${var.project_name}-notification-queue"
  delay_seconds             = 0
  max_message_size          = 262144
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 10     # Long polling
  sqs_managed_sse_enabled   = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Name = "${var.project_name}-notification-queue"
  }
}

# ==============================================================================
# SNS Topic
# ==============================================================================

resource "aws_sns_topic" "payment_events" {
  name = "${var.project_name}-payment-events-topic"

  tags = {
    Name = "${var.project_name}-payment-events-topic"
  }
}

# ==============================================================================
# SNS to SQS Subscriptions
# ==============================================================================

resource "aws_sns_topic_subscription" "inventory" {
  topic_arn            = aws_sns_topic.payment_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.inventory_queue.arn
  raw_message_delivery = true
}

resource "aws_sns_topic_subscription" "notification" {
  topic_arn            = aws_sns_topic.payment_events.arn
  protocol             = "sqs"
  endpoint             = aws_sqs_queue.notification_queue.arn
  raw_message_delivery = true
}

# ==============================================================================
# SQS Queue Policies (Allow SNS to publish to queues)
# ==============================================================================

resource "aws_sqs_queue_policy" "inventory" {
  queue_url = aws_sqs_queue.inventory_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSSendMessages"
        Effect    = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.inventory_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.payment_events.arn
          }
        }
      }
    ]
  })
}

resource "aws_sqs_queue_policy" "notification" {
  queue_url = aws_sqs_queue.notification_queue.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSNSSendMessages"
        Effect    = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
        Action    = "sqs:SendMessage"
        Resource  = aws_sqs_queue.notification_queue.arn
        Condition = {
          ArnEquals = {
            "aws:SourceArn" = aws_sns_topic.payment_events.arn
          }
        }
      }
    ]
  })
}
