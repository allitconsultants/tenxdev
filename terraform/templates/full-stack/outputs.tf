# Networking Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = module.networking.vpc_id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = module.networking.public_subnet_ids
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = module.networking.private_subnet_ids
}

# Kubernetes Outputs
output "cluster_name" {
  description = "Name of the Kubernetes cluster"
  value       = module.kubernetes.cluster_name
}

output "cluster_endpoint" {
  description = "Endpoint for the Kubernetes API server"
  value       = module.kubernetes.cluster_endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "CA certificate for the Kubernetes cluster"
  value       = module.kubernetes.cluster_ca_certificate
  sensitive   = true
}

output "kubeconfig" {
  description = "Kubeconfig for accessing the cluster"
  value       = module.kubernetes.kubeconfig
  sensitive   = true
}

# Database Outputs
output "database_endpoint" {
  description = "Endpoint for the database"
  value       = module.database.endpoint
  sensitive   = true
}

output "database_port" {
  description = "Port for the database"
  value       = module.database.port
}

output "database_name" {
  description = "Name of the database"
  value       = module.database.database_name
}

output "database_username" {
  description = "Username for the database"
  value       = module.database.username
  sensitive   = true
}

output "database_password_secret_id" {
  description = "ID of the secret containing database password"
  value       = module.database.password_secret_id
}

# Monitoring Outputs
output "grafana_url" {
  description = "URL for Grafana dashboard"
  value       = module.monitoring.grafana_url
}

output "prometheus_url" {
  description = "URL for Prometheus"
  value       = module.monitoring.prometheus_url
}

# Summary Output
output "infrastructure_summary" {
  description = "Summary of provisioned infrastructure"
  value = {
    project        = var.project_name
    environment    = var.environment
    cloud_provider = var.cloud_provider
    region         = var.region
    kubernetes = {
      cluster_name = module.kubernetes.cluster_name
      version      = var.kubernetes_version
      node_count   = var.node_desired_count
    }
    database = {
      engine   = var.database_engine
      version  = var.database_version
      endpoint = module.database.endpoint
    }
    monitoring = {
      grafana_enabled    = var.enable_grafana
      prometheus_enabled = var.enable_prometheus
    }
  }
}
