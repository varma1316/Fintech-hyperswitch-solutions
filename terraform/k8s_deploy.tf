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
# 3b. Kubernetes StorageClass: gp3 (AWS EBS CSI Driver)
# ------------------------------------------------------------------------------
resource "kubernetes_storage_class_v1" "gp3" {
  metadata {
    name = "gp3"
    annotations = {
      "storageclass.kubernetes.io/is-default-class" = "true"
    }
  }

  storage_provisioner    = "ebs.csi.aws.com"
  volume_binding_mode    = "WaitForFirstConsumer"
  allow_volume_expansion = true

  parameters = {
    type = "gp3"
  }

  depends_on = [
    aws_eks_addon.ebs_csi
  ]
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
  wait             = false
  timeout          = 600
  cleanup_on_fail  = true

  values = [
    file("${path.module}/../k8s/monitoring/kube-prometheus-stack-values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["monitoring"],
    aws_eks_addon.ebs_csi,
    kubernetes_storage_class_v1.gp3
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
  wait             = false
  timeout          = 600
  cleanup_on_fail  = true

  values = [
    file("${path.module}/../k8s/monitoring/loki-values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["monitoring"],
    aws_eks_addon.ebs_csi,
    kubernetes_storage_class_v1.gp3
  ]
}

# ------------------------------------------------------------------------------
# 6. Helm Release: Grafana Tempo (Tracing)
# ------------------------------------------------------------------------------
resource "helm_release" "tempo" {
  name             = "tempo"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "tempo"
  version          = "1.24.4"
  namespace        = "monitoring"
  create_namespace = false
  wait             = false
  timeout          = 600
  cleanup_on_fail  = true

  values = [
    file("${path.module}/../k8s/monitoring/tempo-values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["monitoring"],
    aws_eks_addon.ebs_csi,
    kubernetes_storage_class_v1.gp3
  ]
}

# ------------------------------------------------------------------------------
# 7. Hyperswitch Kubernetes Secret (Database & Redis credentials)
# ------------------------------------------------------------------------------
resource "kubernetes_secret" "hyperswitch_secrets" {
  metadata {
    name      = "hyperswitch-secrets"
    namespace = "hyperswitch"
  }

  data = {
    DB_HOST       = aws_db_instance.postgres.address
    DB_PORT       = tostring(aws_db_instance.postgres.port)
    DB_NAME       = aws_db_instance.postgres.db_name
    DB_USER       = aws_db_instance.postgres.username
    DB_PASSWORD   = random_password.db_password.result
    REDIS_HOST    = aws_elasticache_cluster.redis.cache_nodes[0].address
    REDIS_PORT    = "6379"
    ADMIN_API_KEY = random_password.hyperswitch_admin_key.result
    JWT_SECRET    = random_password.jwt_secret.result
  }

  depends_on = [
    kubernetes_namespace.namespaces["hyperswitch"],
    aws_db_instance.postgres,
    aws_elasticache_cluster.redis
  ]
}

# ------------------------------------------------------------------------------
# 8. Helm Release: Hyperswitch Core Router
# ------------------------------------------------------------------------------
resource "helm_release" "hyperswitch" {
  name             = "hyperswitch"
  repository       = "https://juspay.github.io/hyperswitch-helm"
  chart            = "hyperswitch-app"
  version          = "1.3.1"
  namespace        = "hyperswitch"
  create_namespace = false
  wait             = false
  timeout          = 600
  cleanup_on_fail  = true

  values = [
    file("${path.module}/../k8s/hyperswitch/values.yaml")
  ]

  depends_on = [
    aws_eks_node_group.main,
    kubernetes_namespace.namespaces["hyperswitch"],
    kubernetes_secret.hyperswitch_secrets,
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
    manifest_hash            = sha256(join("", [
      file("${path.module}/../k8s/external-secrets/cluster-secret-store.yaml"),
      file("${path.module}/../k8s/ingress/alb-ingress.yaml")
    ]))
    kube_prometheus_stack_id = helm_release.kube_prometheus_stack.id
    hyperswitch_id           = helm_release.hyperswitch.id
    lb_policy_hash           = sha256(file("${path.module}/aws_lb_controller_policy.json"))
    services_hash            = sha256(join("", [
      file("${path.module}/../k8s/services/auth-service/deployment.yaml"),
      file("${path.module}/../k8s/services/cart-service/deployment.yaml"),
      file("${path.module}/../k8s/services/inventory-service/deployment.yaml"),
      file("${path.module}/../k8s/services/notification-service/deployment.yaml"),
      file("${path.module}/../k8s/services/order-service/deployment.yaml"),
      file("${path.module}/../k8s/services/product-service/deployment.yaml")
    ]))
  }

  provisioner "local-exec" {
    command = <<-EOT
      aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}
      kubectl -n kube-system wait --for=condition=Available deployment/external-secrets-webhook --timeout=120s || sleep 15
      kubectl apply -f ${path.module}/../k8s/monitoring/storageclass.yaml
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
    helm_release.kube_prometheus_stack,
    helm_release.hyperswitch,
    kubernetes_namespace.namespaces
  ]
}
