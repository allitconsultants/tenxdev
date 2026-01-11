# Project Configuration
variable "project_name" {
  description = "Name of the project"
  type        = string
}

variable "environment" {
  description = "Environment (staging, production)"
  type        = string
  default     = "staging"

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be 'staging' or 'production'."
  }
}

variable "cloud_provider" {
  description = "Cloud provider (aws, gcp, azure)"
  type        = string

  validation {
    condition     = contains(["aws", "gcp", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be 'aws', 'gcp', or 'azure'."
  }
}

variable "region" {
  description = "Cloud region for resources"
  type        = string
}

# Provider-specific variables
variable "gcp_project_id" {
  description = "GCP Project ID (only for GCP)"
  type        = string
  default     = ""
}

variable "azure_subscription_id" {
  description = "Azure Subscription ID (only for Azure)"
  type        = string
  default     = ""
}

# Networking Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = []
}

# Kubernetes Configuration
variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "node_instance_type" {
  description = "Instance type for Kubernetes nodes"
  type        = string
  default     = "t3.medium"
}

variable "node_min_count" {
  description = "Minimum number of nodes in the cluster"
  type        = number
  default     = 2
}

variable "node_max_count" {
  description = "Maximum number of nodes in the cluster"
  type        = number
  default     = 10
}

variable "node_desired_count" {
  description = "Desired number of nodes in the cluster"
  type        = number
  default     = 3
}

# Database Configuration
variable "database_engine" {
  description = "Database engine (postgres, mysql)"
  type        = string
  default     = "postgres"

  validation {
    condition     = contains(["postgres", "mysql"], var.database_engine)
    error_message = "Database engine must be 'postgres' or 'mysql'."
  }
}

variable "database_version" {
  description = "Database version"
  type        = string
  default     = "15"
}

variable "database_instance_type" {
  description = "Instance type for database"
  type        = string
  default     = "db.t3.medium"
}

variable "database_storage_gb" {
  description = "Storage size in GB for database"
  type        = number
  default     = 20
}

variable "database_name" {
  description = "Name of the default database"
  type        = string
  default     = "app"
}

# Monitoring Configuration
variable "enable_grafana" {
  description = "Enable Grafana dashboard"
  type        = bool
  default     = true
}

variable "enable_prometheus" {
  description = "Enable Prometheus monitoring"
  type        = bool
  default     = true
}

variable "alert_email" {
  description = "Email address for alerts"
  type        = string
  default     = ""
}
