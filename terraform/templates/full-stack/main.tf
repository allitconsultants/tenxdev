# Full-Stack Infrastructure Template
# Provisions networking, Kubernetes cluster, database, and monitoring

terraform {
  required_version = ">= 1.5.0"

  # Backend configured dynamically via -backend-config
  backend "s3" {}

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Provider configuration based on cloud_provider variable
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "tenxdev-terraform"
    }
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.region
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

# Networking Module
module "networking" {
  source = "../../modules/networking"

  project_name   = var.project_name
  environment    = var.environment
  cloud_provider = var.cloud_provider
  region         = var.region

  vpc_cidr           = var.vpc_cidr
  availability_zones = var.availability_zones
}

# Kubernetes Module
module "kubernetes" {
  source = "../../modules/kubernetes"

  project_name   = var.project_name
  environment    = var.environment
  cloud_provider = var.cloud_provider
  region         = var.region

  vpc_id             = module.networking.vpc_id
  subnet_ids         = module.networking.private_subnet_ids
  kubernetes_version = var.kubernetes_version

  node_instance_type = var.node_instance_type
  node_min_count     = var.node_min_count
  node_max_count     = var.node_max_count
  node_desired_count = var.node_desired_count
}

# Database Module
module "database" {
  source = "../../modules/database"

  project_name   = var.project_name
  environment    = var.environment
  cloud_provider = var.cloud_provider
  region         = var.region

  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  database_engine       = var.database_engine
  database_version      = var.database_version
  database_instance_type = var.database_instance_type
  database_storage_gb   = var.database_storage_gb
  database_name         = var.database_name
}

# Monitoring Module
module "monitoring" {
  source = "../../modules/monitoring"

  project_name   = var.project_name
  environment    = var.environment
  cloud_provider = var.cloud_provider
  region         = var.region

  cluster_name        = module.kubernetes.cluster_name
  enable_grafana      = var.enable_grafana
  enable_prometheus   = var.enable_prometheus
  alert_email         = var.alert_email
}
