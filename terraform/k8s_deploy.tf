# ==============================================================================
# Kubernetes Workloads & Helm Releases Orchestrated by Terraform
# Manages Namespaces, External Secrets Operator, AWS Load Balancer Controller,
# Monitoring Stack (Prometheus/Grafana/Loki/Tempo), and Hyperswitch Core.
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. Kubernetes Namespaces (Dedicated namespace per microservice + Hyperswitch & Monitoring)
# ------------------------------------------------------------------------------
resource "kubernetes_namespace" "namespaces" {
  for_each = toset([
    "auth-service",
    "cart-service",
    "inventory-service",
    "notification-service",
    "order-service",
    "product-service",
    "hyperswitch",
    "monitoring"
  ])

  metadata {
    name = each.key
    labels = {
      name                        = each.key
      "app.kubernetes.io/part-of" = "hyperswitch-platform"
    }
  }

  depends_on = [aws_eks_node_group.main]
}

# ------------------------------------------------------------------------------
# 2. Helm Release: External Secrets Operator (with AWS Secrets Manager IRSA)
# ------------------------------------------------------------------------------
resource "helm_release" "external_secrets" {
  name             = "external-secrets"
  repository       = "https://charts.external-secrets.io"
  chart            = "external-secrets"
  version          = "0.9.19"
  namespace        = "kube-system"
  create_namespace = false

  set {
    name  = "installCRDs"
    value = "true"
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "external-secrets"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.external_secrets.arn
  }

  depends_on = [aws_eks_node_group.main]
}

# ------------------------------------------------------------------------------
# 3. Helm Release: AWS Load Balancer Controller (with IRSA)
# ------------------------------------------------------------------------------
resource "helm_release" "aws_load_balancer_controller" {
  name             = "aws-load-balancer-controller"
  repository       = "https://aws.github.io/eks-charts"
  chart            = "aws-load-balancer-controller"
  version          = "1.8.1"
  namespace        = "kube-system"
  create_namespace = false

  set {
    name  = "clusterName"
    value = aws_eks_cluster.main.name
  }

  set {
    name  = "serviceAccount.create"
    value = "true"
  }

  set {
    name  = "serviceAccount.name"
    value = "aws-load-balancer-controller"
  }

  set {
    name  = "serviceAccount.annotations.eks\\.amazonaws\\.com/role-arn"
    value = aws_iam_role.aws_lb_controller.arn
  }

  set {
    name  = "region"
    value = var.aws_region
  }

  set {
    name  = "vpcId"
    value = aws_vpc.main.id
  }

  depends_on = [aws_eks_node_group.main]
}

# ------------------------------------------------------------------------------
# 4. Helm Release: Kube Prometheus Stack (Prometheus & Grafana)
# ------------------------------------------------------------------------------
resource "helm_release" "kube_prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  version          = "58.2.2"
  namespace        = "monitoring"
  create_namespace = false

  values = [
    file("${path.module}/../k8s/monitoring/kube-prometheus-stack-values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["monitoring"]
  ]
}

# ------------------------------------------------------------------------------
# 5. Helm Release: Grafana Loki (Logging)
# ------------------------------------------------------------------------------
resource "helm_release" "loki" {
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki"
  version          = "5.47.2"
  namespace        = "monitoring"
  create_namespace = false

  values = [
    file("${path.module}/../k8s/monitoring/loki-values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["monitoring"]
  ]
}

# ------------------------------------------------------------------------------
# 6. Helm Release: Grafana Tempo (Tracing)
# ------------------------------------------------------------------------------
resource "helm_release" "tempo" {
  name             = "tempo"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "tempo"
  version          = "1.8.2"
  namespace        = "monitoring"
  create_namespace = false

  values = [
    file("${path.module}/../k8s/monitoring/tempo-values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["monitoring"]
  ]
}

# ------------------------------------------------------------------------------
# 7. Helm Release: Hyperswitch Core Router
# ------------------------------------------------------------------------------
resource "helm_release" "hyperswitch" {
  name             = "hyperswitch"
  repository       = "https://juspay.github.io/hyperswitch-helm"
  chart            = "hyperswitch-app"
  version          = "1.3.1"
  namespace        = "hyperswitch"
  create_namespace = false

  values = [
    file("${path.module}/../k8s/hyperswitch/values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["hyperswitch"],
    helm_release.external_secrets,
    aws_db_instance.postgres,
    aws_elasticache_cluster.redis
  ]
}

# ------------------------------------------------------------------------------
# 8. Kubernetes Workloads Deployment (ClusterSecretStore, Services, Ingress)
# ------------------------------------------------------------------------------
resource "null_resource" "k8s_workloads" {
  triggers = {
    manifest_hash = sha256(join("", [
      file("${path.module}/../k8s/external-secrets/cluster-secret-store.yaml"),
      file("${path.module}/../k8s/ingress/alb-ingress.yaml")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}
      kubectl -n kube-system wait --for=condition=Available deployment/external-secrets-webhook --timeout=120s || sleep 15
      kubectl apply -f ${path.module}/../k8s/external-secrets/cluster-secret-store.yaml
      kubectl apply -f ${path.module}/../k8s/services/auth-service/
      kubectl apply -f ${path.module}/../k8s/services/cart-service/
      kubectl apply -f ${path.module}/../k8s/services/inventory-service/
      kubectl apply -f ${path.module}/../k8s/services/notification-service/
      kubectl apply -f ${path.module}/../k8s/services/order-service/
      kubectl apply -f ${path.module}/../k8s/services/product-service/
      kubectl apply -f ${path.module}/../k8s/hyperswitch/external-secret.yaml
      kubectl apply -f ${path.module}/../k8s/ingress/alb-ingress.yaml
    EOT
  }

  depends_on = [
    aws_eks_node_group.main,
    helm_release.external_secrets,
    helm_release.aws_load_balancer_controller,
    kubernetes_namespace.namespaces
  ]
}
