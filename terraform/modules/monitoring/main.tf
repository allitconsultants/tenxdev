# Monitoring Module
# Provisions monitoring infrastructure (Prometheus, Grafana, alerting)

variable "project_name" {
  type = string
}

variable "environment" {
  type = string
}

variable "cloud_provider" {
  type = string
}

variable "region" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "enable_grafana" {
  type    = bool
  default = true
}

variable "enable_prometheus" {
  type    = bool
  default = true
}

variable "alert_email" {
  type    = string
  default = ""
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# Kubernetes provider configured at the template level
# This module assumes the kubernetes provider is already configured

# Prometheus namespace
resource "kubernetes_namespace" "monitoring" {
  count = var.enable_prometheus || var.enable_grafana ? 1 : 0

  metadata {
    name = "monitoring"

    labels = {
      "app.kubernetes.io/managed-by" = "terraform"
      project                        = var.project_name
      environment                    = var.environment
    }
  }
}

# Deploy Prometheus using Helm
resource "helm_release" "prometheus" {
  count = var.enable_prometheus ? 1 : 0

  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring[0].metadata[0].name
  version    = "55.0.0"

  values = [
    yamlencode({
      prometheus = {
        prometheusSpec = {
          retention = "15d"
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                accessModes = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }
        }
      }

      alertmanager = {
        enabled = var.alert_email != ""
        config = var.alert_email != "" ? {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            group_by        = ["alertname", "namespace"]
            group_wait      = "30s"
            group_interval  = "5m"
            repeat_interval = "12h"
            receiver        = "email"
          }
          receivers = [{
            name = "email"
            email_configs = [{
              to   = var.alert_email
              from = "alerts@tenxdev.ai"
            }]
          }]
        } : null
      }

      grafana = {
        enabled = var.enable_grafana
        adminPassword = "admin"  # Should be changed after deployment
        ingress = {
          enabled = true
          annotations = {
            "kubernetes.io/ingress.class" = "nginx"
          }
          hosts = ["grafana.${local.name_prefix}.local"]
        }
        persistence = {
          enabled = true
          size    = "10Gi"
        }
      }
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Cloud-specific monitoring integrations
# AWS CloudWatch Container Insights
resource "aws_cloudwatch_log_group" "eks" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name              = "/aws/eks/${var.cluster_name}/cluster"
  retention_in_days = 30
}

# GCP Cloud Monitoring (enabled by default in GKE)
# Azure Monitor for Containers
resource "azurerm_log_analytics_workspace" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "${local.name_prefix}-logs"
  location            = var.region
  resource_group_name = "${var.project_name}-${var.environment}-rg"
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Outputs
output "grafana_url" {
  value = var.enable_grafana ? "https://grafana.${local.name_prefix}.local" : null
}

output "prometheus_url" {
  value = var.enable_prometheus ? "http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local:9090" : null
}

output "alertmanager_url" {
  value = var.enable_prometheus && var.alert_email != "" ? "http://prometheus-kube-prometheus-alertmanager.monitoring.svc.cluster.local:9093" : null
}
