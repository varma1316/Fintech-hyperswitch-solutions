# Hyperswitch AWS Platform

This repository contains the Terraform and Kubernetes deployment for the Hyperswitch payment platform. It provisions the AWS infrastructure, configures GitHub Actions access through OIDC, stores shared infrastructure values in AWS Secrets Manager, and deploys the application and supporting services to Amazon EKS.

The deployment is split into two Terraform layers:

1. `aws_github_oidc/` bootstraps the GitHub Actions OIDC provider, IAM roles and policies, GitHub repository secrets, and the shared Terraform state bucket.
2. `hyperswitch-solution/terraform/` creates the application infrastructure and deploys the Kubernetes workloads.

The normal delivery path is pull request → Terraform plan → merge to `master` → Terraform apply.

## Repository layout

```text
Fintech-hyperswitch-github-oidc/
├── aws_github_oidc/                         # GitHub OIDC and bootstrap Terraform
├── hyperswitch-solution/
│   ├── terraform/                            # AWS and Kubernetes Terraform
│   ├── k8s/                                  # Helm values and Kubernetes manifests
│   ├── .github/workflows/ci-plan.yml         # Pull-request Terraform plan
│   └── .github/workflows/cd-apply.yml        # Apply after merge to master
├── aws_hyperswitch_backend/                  # Backend microservices source
└── aws_hyperswitch_frontend/                 # Frontend source
```

The exact directory layout may differ if the components are maintained in separate Git repositories. The Terraform paths and workflow paths above are the paths used by this project.

## Architecture created by Terraform

The infrastructure layer provisions:

- A VPC with public subnets, private application subnets, private database subnets, an Internet Gateway, NAT Gateway, and route tables.
- An Amazon EKS cluster and managed node group. The default cluster name is `hyperswitch-cluster`, Kubernetes version is `1.31`, and the default node type is `t3.large`.
- The Amazon EBS CSI add-on and a Kubernetes `gp3` StorageClass.
- Amazon RDS PostgreSQL 15.7 and Amazon ElastiCache Redis 7.1.
- Amazon ECR repositories for `auth-service`, `cart-service`, `inventory-service`, `notification-service`, `order-service`, and `product-service`.
- Amazon SQS queues and dead-letter queues for inventory and notification processing, plus an SNS payment-events topic.
- An encrypted, versioned S3 bucket for frontend assets and a CloudFront distribution with Origin Access Control and SPA routing.
- AWS Secrets Manager secret `hyperswitch/infra`, containing generated credentials, endpoints, EKS information, messaging URLs, ECR URLs, and frontend deployment values.
- IAM roles for EKS, External Secrets, the AWS Load Balancer Controller, the EBS CSI driver, backend workloads, and GitHub Actions.

The Kubernetes layer deploys:

- Namespaces for Hyperswitch, monitoring, and each backend service.
- External Secrets Operator and an AWS Secrets Manager `ClusterSecretStore`.
- AWS Load Balancer Controller.
- Hyperswitch Core Router through the `juspay/hyperswitch-app` Helm chart.
- Prometheus Operator, Prometheus, Grafana, Loki, Tempo, kube-state-metrics, and node exporters.
- The backend service Deployments, Services, ExternalSecrets, and the ALB Ingress.

## Prerequisites

Use a dedicated EC2 instance as the Terraform administration host. Ubuntu 22.04/24.04 or Amazon Linux 2023 is suitable.

The EC2 instance needs:

- Git
- Terraform `>= 1.5.0`
- AWS CLI
- `kubectl`
- Helm, useful for troubleshooting and chart inspection
- Network access to AWS APIs, GitHub, Helm repositories, container registries, and the EKS API

Attach an EC2 instance profile with `AdministratorAccess` during initial bootstrap, as requested for this project. This is highly privileged access. For production, replace it with a restricted provisioning policy after the environment is bootstrapped.

Confirm that the EC2 role is active:

```bash
aws sts get-caller-identity
aws configure get region || true
```

Example Ubuntu package setup:

```bash
sudo apt-get update
sudo apt-get install -y git unzip curl jq awscli
```

Install Terraform from the official HashiCorp distribution and ensure the installed version satisfies the project requirement:

```bash
terraform version
```

Install `kubectl` and Helm using their official installation instructions if they are not already installed. Terraform's Kubernetes and Helm providers use the AWS CLI exec plugin to obtain EKS credentials, and the Terraform `local-exec` steps also call `aws` and `kubectl` directly.

## Clone the repository

Clone the repository named `Fintech-hyperswitch-github-oidc` using the appropriate GitHub owner or organization:

```bash
git clone https://github.com/<github-owner>/Fintech-hyperswitch-github-oidc.git
cd Fintech-hyperswitch-github-oidc
```

If the project is private, configure the EC2 instance with an SSH key or a GitHub access token before cloning.

## Phase 1: Bootstrap GitHub OIDC and the Terraform state bucket

Run the bootstrap Terraform from `aws_github_oidc/`. It creates the identity and state resources required by the later GitHub Actions workflows.

### Bootstrap variables

Create `aws_github_oidc/terraform.tfvars` with values similar to the following:

```hcl
aws_region  = "us-east-1"
project_name = "hyperswitch"

github_owner        = "your-github-username-or-org"
terraform_repo_name = "your-terraform-repo-name"
frontend_repo_name  = "your-frontend-repo-name"
backend_repo_name   = "your-backend-repo-name"

# S3 bucket names are globally unique.
state_bucket_name = "hyperswitch-terraform-state-<unique-suffix>"
create_state_bucket = true

# Prefer TF_VAR_github_token or an environment variable instead of storing
# the token in this file.
# github_token = "<github-token>"
```

The GitHub token must be able to read the configured repositories and create or update their Actions secrets. Prefer an environment variable so the token is not written to disk:

```bash
export TF_VAR_github_token="<github-token>"
```

Never commit `terraform.tfvars`, a GitHub token, or a Terraform state file.

### First-run backend bootstrap

The state bucket is created by this same Terraform configuration, so it cannot be used as a backend before the bucket exists. For the first bootstrap run:

1. Temporarily comment the `backend "s3"` block in `aws_github_oidc/backend.tf`, as described by the comments in that file. This makes the first run use local state.
2. Initialize and apply locally:

```bash
cd aws_github_oidc
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

3. After the state bucket has been created, restore the `backend "s3"` block and migrate the local bootstrap state into S3:

```bash
terraform init -migrate-state \
  -backend-config="bucket=hyperswitch-terraform-state-<unique-suffix>"
```

The bootstrap backend stores its state at:

```text
github_oidc/terraform.tfstate
```

The state bucket is configured with versioning, server-side encryption, public-access blocking, and placeholder prefixes for both `github_oidc/` and `terraform/` state.

### Resources created by the bootstrap layer

The `aws_github_oidc` layer creates:

- The GitHub Actions OIDC provider in AWS IAM.
- A Terraform GitHub Actions role with `AdministratorAccess`, trusted only by the configured Terraform repository pattern.
- A frontend GitHub Actions role with S3, CloudFront, Secrets Manager, and SSM permissions.
- A backend GitHub Actions role with ECR, EKS API, Secrets Manager, and SSM permissions.
- The GitHub repository secret `AWS_ROLE_ARN` in each configured repository.
- The GitHub repository secret `TF_STATE_BUCKET` in the Terraform repository.
- The optional shared S3 state bucket when `create_state_bucket = true`.

The GitHub Actions secrets are written by Terraform through the GitHub provider. Verify that the repository names and owner are correct before applying.

## Phase 2: Configure the infrastructure Terraform

Move into the infrastructure Terraform directory:

```bash
cd hyperswitch-solution/terraform
```

Create `terraform.tfvars` for infrastructure-specific settings. The GitHub owner and repository variables belong to the bootstrap layer and are not variables in this directory.

```hcl
aws_region  = "us-east-1"
project_name = "hyperswitch"

# Use a globally unique bucket name if the default is already taken.
s3_bucket_name = "hyperswitch-frontend-assets-<unique-suffix>"

# Optional sizing overrides. Defaults are suitable for the project baseline.
eks_node_instance_types = ["t3.large"]
eks_node_desired_size   = 3
eks_node_min_size       = 1
eks_node_max_size       = 4
db_instance_class       = "db.t3.micro"
db_allocated_storage    = 20
```

Initialize Terraform against the state bucket created in Phase 1:

```bash
terraform init \
  -backend-config="bucket=hyperswitch-terraform-state-<unique-suffix>"
```

The infrastructure backend uses:

```text
Bucket: <state bucket>
Key:    terraform/terraform.tfstate
Region: us-east-1
Encryption: enabled
```

The current backend configuration does not define a DynamoDB lock table. Do not run competing Terraform applies against the same state. Use one CI apply at a time.

Review and apply the infrastructure:

```bash
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

The apply creates the AWS resources first, then uses the Terraform AWS, Kubernetes, Helm, and `local-exec` resources to configure EKS. The EC2 instance must retain AWS credentials and network access while the apply is running.

## Kubernetes deployment behavior

Terraform manages the Kubernetes resources in `terraform/k8s_deploy.tf`.

The deployment sequence includes:

1. Create application and monitoring namespaces.
2. Install External Secrets Operator with its AWS IAM role.
3. Install the AWS Load Balancer Controller with its IAM role.
4. Create the `gp3` StorageClass through the EBS CSI driver.
5. Install kube-prometheus-stack, Loki, and Tempo.
6. Create the Hyperswitch Kubernetes secret and external AWS service DNS names for RDS and Redis.
7. Install the Hyperswitch Helm chart using AWS RDS and ElastiCache instead of the chart's bundled databases.
8. Apply the ClusterSecretStore, backend service manifests, ExternalSecrets, and ALB Ingress.

Hyperswitch is configured to use the AWS-managed services:

- PostgreSQL: AWS RDS through the `hyperswitch-postgres` ExternalName Service.
- Redis: Amazon ElastiCache through the `hyperswitch-redis` ExternalName Service.
- Kafka: not deployed by this stack; Hyperswitch event output is configured for logs.
- Superposition: the Helm chart's version-matched fallback seed is enabled so workloads can start when the bundled Superposition service is disabled.

Prometheus uses a 5 GiB `gp3` persistent volume claim. The expected Prometheus PVC is created by the Prometheus Operator after the operator becomes healthy; it is not a manually maintained PVC manifest.

## GitHub Actions workflow

The bootstrap layer creates the GitHub Actions secrets required by the repositories. The workflows then use GitHub's OIDC token to assume AWS roles without storing long-lived AWS access keys.

### Terraform CI plan

`.github/workflows/ci-plan.yml` runs for pull requests targeting `master` when Terraform files or the CI workflow change. It:

1. Checks out the pull request.
2. Assumes the Terraform GitHub OIDC role.
3. Initializes Terraform using `TF_STATE_BUCKET`.
4. Runs `terraform fmt -check`.
5. Runs `terraform plan`.

The plan should be reviewed in the pull request before merge.

### Terraform CD apply

`.github/workflows/cd-apply.yml` runs after a push to `master` when `terraform/**`, `k8s/**`, or the CD workflow changes. It can also be started manually with `workflow_dispatch`. It:

1. Checks out the merged commit.
2. Assumes the Terraform GitHub OIDC role.
3. Initializes the S3 backend using `TF_STATE_BUCKET`.
4. Runs `terraform apply -auto-approve`.

The intended operating procedure is:

```text
Create branch → change Terraform/Kubernetes → open PR → CI plan → review → merge to master → CD apply
```

The current workflow branch filter is `master`. If the organization uses `main`, update both workflow files before relying on automatic execution.

## Backend and frontend delivery

The backend and frontend repositories use the roles created by `aws_github_oidc`.

Backend CI/CD can:

- Build and push the six backend service images to their ECR repositories.
- Access EKS to deploy or update Kubernetes workloads.
- Read the shared `hyperswitch/infra` secret and SSM parameters.

Frontend CI/CD can:

- Build the frontend applications.
- Upload the applications to the shared S3 frontend bucket.
- Invalidate CloudFront after deployment.
- Read the required Secrets Manager and SSM values.

The frontend bucket contains these logical prefixes:

```text
control-center/
web/
ecommerce-store/
```

CloudFront routes the three SPAs through the CloudFront Function configured in `terraform/cloudfront.tf`.

## Shared Secrets Manager data

Terraform creates the consolidated secret:

```text
hyperswitch/infra
```

It contains values such as:

- AWS region and account ID
- EKS cluster name, endpoint, and ARN
- Kubernetes namespace names
- RDS host, port, database, username, password, and connection URLs
- Redis host, port, and URL
- Hyperswitch API and JWT secrets
- SQS queue URLs and ARNs
- SNS topic ARN
- ECR registry and repository URLs
- S3 bucket and CloudFront distribution information

External Secrets Operator maps only the required keys into Kubernetes Secrets in each namespace. Application source repositories should retrieve runtime values from AWS Secrets Manager or the Kubernetes Secret created by External Secrets rather than committing credentials.

To inspect the secret metadata without printing its value:

```bash
aws secretsmanager describe-secret --secret-id hyperswitch/infra
```

Avoid printing the complete secret in shared terminals or CI logs.

## Validation after deployment

Configure local access to EKS:

```bash
aws eks update-kubeconfig \
  --region us-east-1 \
  --name hyperswitch-cluster
```

Check the cluster and workloads:

```bash
kubectl get nodes
kubectl get namespaces
kubectl get pods -A
kubectl get ingress -n hyperswitch
kubectl get pvc -n monitoring
kubectl get prometheus -n monitoring
```

Useful focused checks:

```bash
kubectl get pods -n hyperswitch
kubectl get pods -n monitoring
kubectl get externalsecrets -A
kubectl get secretstore,clustersecretstore -A
kubectl get storageclass
kubectl get events -n monitoring --sort-by=.lastTimestamp
```

Expected monitoring checks include a healthy Prometheus Operator, Prometheus pod, and a Prometheus PVC bound to the `gp3` StorageClass. Loki and Tempo also use persistent storage.

## Troubleshooting

### Terraform cannot initialize the S3 backend

Confirm that:

- The state bucket already exists.
- The bucket name passed to `terraform init -backend-config` is exact.
- The EC2 instance role or GitHub OIDC role can access the bucket.
- The `aws_github_oidc` bootstrap was migrated to S3 only after the bucket was created.

### GitHub Actions cannot assume AWS

Check:

- `AWS_ROLE_ARN` exists in the relevant repository.
- The role trust policy contains the correct GitHub owner and repository name.
- The workflow has `id-token: write` permission.
- The workflow region matches the deployment region.

### Prometheus is missing or has no PVC

Run:

```bash
kubectl get deployment -n monitoring kube-prometheus-stack-operator
kubectl get pods -n monitoring
kubectl get prometheus -n monitoring
kubectl get pvc -n monitoring
kubectl describe pod -n monitoring \
  -l app=kube-prometheus-stack-operator
kubectl get events -n monitoring --sort-by=.lastTimestamp
```

The operator must become `Ready` before it can create the Prometheus StatefulSet and PVC. The expected Prometheus storage is declared in `k8s/monitoring/kube-prometheus-stack-values.yaml`.

### Hyperswitch tries to resolve `kafka0:29092`

This stack does not deploy Kafka. Confirm that the live ConfigMap contains logs mode:

```bash
kubectl get configmap hyperswitch-hyperswitch-configs -n hyperswitch \
  -o jsonpath='{.data.ROUTER__EVENTS__SOURCE}{"\n"}{.data.ROUTER__EVENTS__KAFKA__BROKERS}{"\n"}'
```

If the value is stale, run Terraform apply again so the Helm release receives the current `k8s/hyperswitch/values.yaml`. If Kafka is required for production event durability, deploy a supported Kafka service and change the Hyperswitch event source and broker configuration deliberately.

### Hyperswitch fails to initialize Superposition

Inspect the init container and application logs:

```bash
kubectl get pods -n hyperswitch
kubectl describe pod -n hyperswitch <pod-name>
kubectl logs -n hyperswitch <pod-name> -c fetch-superposition-seed
kubectl logs -n hyperswitch <pod-name> --previous
```

The fallback fetch requires outbound HTTPS access from the worker subnets. This project routes private application subnets through a NAT Gateway. If outbound access is intentionally blocked, provide the seed through the chart's ConfigMap fallback mode instead of the fetch mode.

### Terraform local-exec fails

The Terraform deployment uses `aws`, `kubectl`, and Bash in local provisioners. Confirm:

```bash
aws sts get-caller-identity
aws eks update-kubeconfig --region us-east-1 --name hyperswitch-cluster
kubectl get nodes
```

Also confirm that the External Secrets webhook and EKS API are reachable from the Terraform runner.

## Security and operational notes

- The EC2 bootstrap role and Terraform GitHub role use administrator-level access in the current design. Reduce permissions before production use.
- Do not commit GitHub tokens, `terraform.tfvars`, Kubernetes Secret manifests containing real values, or Terraform state files.
- Terraform-generated passwords and secrets are stored in Terraform state as sensitive values. Protect the S3 state bucket and restrict access to the state.
- The current S3 state backend does not configure a DynamoDB lock table. Prevent concurrent applies.
- RDS, Redis, EKS, NAT Gateway, CloudFront, and EBS resources incur AWS charges.
- Run `terraform plan` and review destruction or replacement actions before every apply.

## Destroying the environment

Destroying the infrastructure removes AWS resources and can interrupt all workloads. Review the plan carefully before running:

```bash
cd hyperswitch-solution/terraform
terraform plan -destroy
terraform destroy
```

The application frontend bucket is configured with `force_destroy = true`; the separate Terraform state bucket is configured with `force_destroy = false` and should be preserved until its state is no longer needed.
