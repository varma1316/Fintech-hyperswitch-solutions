variable "aws_region" {
  type        = string
  description = "AWS region to deploy resources in"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Generic project name prefix for resource naming and tagging"
  default     = "hyperswitch"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for the 2 public subnets"
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for the 2 private application subnets (routed via NAT Gateway)"
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

variable "private_db_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for the 2 private database subnets (isolated, no NAT/IGW route)"
  default     = ["10.0.21.0/24", "10.0.22.0/24"]
}

variable "single_nat_gateway" {
  type        = bool
  description = "Set to true for a single NAT Gateway across all private app subnets, or false for high availability (1 per AZ)"
  default     = true
}

variable "s3_bucket_name" {
  type        = string
  description = "Name of the S3 bucket used for frontend hosting"
  default     = "hyperswitch-frontend-assets"
}

# --- EKS Cluster Variables ---
variable "eks_cluster_name" {
  type        = string
  description = "Name of the Amazon EKS cluster"
  default     = "hyperswitch-cluster"
}

variable "eks_cluster_version" {
  type        = string
  description = "Kubernetes version for the EKS cluster"
  default     = "1.30"
}

variable "eks_node_instance_types" {
  type        = list(string)
  description = "EC2 instance types for EKS managed node group"
  default     = ["t3.medium"]
}

variable "eks_node_desired_size" {
  type        = number
  description = "Desired number of worker nodes in the node group"
  default     = 2
}

variable "eks_node_min_size" {
  type        = number
  description = "Minimum number of worker nodes in the node group"
  default     = 1
}

variable "eks_node_max_size" {
  type        = number
  description = "Maximum number of worker nodes in the node group"
  default     = 3
}

# --- RDS PostgreSQL Database Variables ---
variable "db_instance_class" {
  type        = string
  description = "RDS DB instance class"
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  type        = number
  description = "Allocated storage size in GB for RDS PostgreSQL (AWS minimum 20 GB for gp3)"
  default     = 20
}

variable "db_name" {
  type        = string
  description = "Name of the default database created in RDS"
  default     = "hyperswitch"
}

variable "db_username" {
  type        = string
  description = "Master username for RDS PostgreSQL instance"
  default     = "postgresadmin"
}
