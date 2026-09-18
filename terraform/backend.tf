terraform {
  backend "s3" {
    # Supply your S3 state bucket dynamically during init:
    # terraform init -backend-config="bucket=<YOUR_STATE_BUCKET>"
    # Or uncomment and set your bucket name directly:
    # bucket  = "your-terraform-state-bucket"
    key     = "terraform/terraform.tfstate"
    region  = "us-east-1"
    encrypt = true
  }
}
