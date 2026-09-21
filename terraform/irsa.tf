# ==============================================================================
# IAM Roles for Service Accounts (IRSA) & EKS OIDC Provider
# ==============================================================================

data "tls_certificate" "eks" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "eks" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.eks.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = {
    Name = "${var.project_name}-eks-irsa-provider"
  }
}

# ==============================================================================
# 1. External Secrets Operator IAM Role
# ==============================================================================

resource "aws_iam_role" "external_secrets" {
  name        = "${var.project_name}-external-secrets-role"
  description = "IAM role for External Secrets Operator to read Secrets Manager"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:*:external-secrets*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-external-secrets-role"
  }
}

resource "aws_iam_policy" "external_secrets" {
  name        = "${var.project_name}-external-secrets-policy"
  description = "Allows External Secrets Operator to retrieve secret values"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:ListSecrets"
        ]
        Resource = [
          "arn:aws:secretsmanager:*:*:secret:${var.project_name}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}

# ==============================================================================
# 2. AWS Load Balancer Controller IAM Role
# ==============================================================================

resource "aws_iam_role" "aws_lb_controller" {
  name        = "${var.project_name}-aws-lb-controller-role"
  description = "IAM role for AWS Load Balancer Controller on EKS"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-load-balancer-controller"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-aws-lb-controller-role"
  }
}

resource "aws_iam_policy" "aws_lb_controller" {
  name        = "${var.project_name}-aws-lb-controller-policy"
  description = "Policy for AWS Load Balancer Controller to manage ALBs, Target Groups and Listeners"

  policy = file("${path.module}/aws_lb_controller_policy.json")
}

resource "aws_iam_role_policy_attachment" "aws_lb_controller" {
  role       = aws_iam_role.aws_lb_controller.name
  policy_arn = aws_iam_policy.aws_lb_controller.arn
}

# ==============================================================================
# 3. AWS EBS CSI Driver IAM Role
# ==============================================================================

resource "aws_iam_role" "ebs_csi" {
  name        = "${var.project_name}-ebs-csi-role"
  description = "IAM role for AWS EBS CSI Driver on EKS"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.eks.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            "${replace(aws_eks_cluster.main.identity[0].oidc[0].issuer, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-*"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ebs-csi-role"
  }
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  role       = aws_iam_role.ebs_csi.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}
