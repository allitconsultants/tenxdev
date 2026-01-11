# Kubernetes Module
# Provisions managed Kubernetes cluster for AWS (EKS), GCP (GKE), or Azure (AKS)

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

variable "vpc_id" {
  type = string
}

variable "subnet_ids" {
  type = list(string)
}

variable "kubernetes_version" {
  type    = string
  default = "1.28"
}

variable "node_instance_type" {
  type    = string
  default = "t3.medium"
}

variable "node_min_count" {
  type    = number
  default = 2
}

variable "node_max_count" {
  type    = number
  default = 10
}

variable "node_desired_count" {
  type    = number
  default = 3
}

locals {
  name_prefix  = "${var.project_name}-${var.environment}"
  cluster_name = "${local.name_prefix}-cluster"
}

# AWS EKS
resource "aws_iam_role" "eks_cluster" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name = "${local.name_prefix}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  count = var.cloud_provider == "aws" ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster[0].name
}

resource "aws_eks_cluster" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name     = local.cluster_name
  version  = var.kubernetes_version
  role_arn = aws_iam_role.eks_cluster[0].arn

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = true
    endpoint_public_access  = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
}

resource "aws_iam_role" "eks_nodes" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name = "${local.name_prefix}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_worker_node_policy" {
  count = var.cloud_provider == "aws" ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes[0].name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  count = var.cloud_provider == "aws" ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes[0].name
}

resource "aws_iam_role_policy_attachment" "ecr_read_policy" {
  count = var.cloud_provider == "aws" ? 1 : 0

  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes[0].name
}

resource "aws_eks_node_group" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  cluster_name    = aws_eks_cluster.main[0].name
  node_group_name = "${local.name_prefix}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes[0].arn
  subnet_ids      = var.subnet_ids
  instance_types  = [var.node_instance_type]

  scaling_config {
    desired_size = var.node_desired_count
    max_size     = var.node_max_count
    min_size     = var.node_min_count
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.ecr_read_policy,
  ]
}

# GCP GKE
resource "google_container_cluster" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name     = local.cluster_name
  location = var.region

  # Use VPC-native cluster
  network    = var.vpc_id
  subnetwork = var.subnet_ids[0]

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  min_master_version = var.kubernetes_version

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  workload_identity_config {
    workload_pool = "${data.google_project.current[0].project_id}.svc.id.goog"
  }
}

data "google_project" "current" {
  count = var.cloud_provider == "gcp" ? 1 : 0
}

resource "google_container_node_pool" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name       = "${local.name_prefix}-pool"
  location   = var.region
  cluster    = google_container_cluster.main[0].name
  node_count = var.node_desired_count

  autoscaling {
    min_node_count = var.node_min_count
    max_node_count = var.node_max_count
  }

  node_config {
    machine_type = var.cloud_provider == "gcp" ? "e2-medium" : var.node_instance_type

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform",
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# Azure AKS
data "azurerm_resource_group" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rg"
}

resource "azurerm_kubernetes_cluster" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = local.cluster_name
  location            = var.region
  resource_group_name = data.azurerm_resource_group.main[0].name
  dns_prefix          = local.name_prefix
  kubernetes_version  = var.kubernetes_version

  default_node_pool {
    name                = "default"
    node_count          = var.node_desired_count
    vm_size             = var.cloud_provider == "azure" ? "Standard_D2_v2" : var.node_instance_type
    vnet_subnet_id      = var.subnet_ids[0]
    enable_auto_scaling = true
    min_count           = var.node_min_count
    max_count           = var.node_max_count
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "calico"
  }
}

# Outputs
output "cluster_name" {
  value = local.cluster_name
}

output "cluster_endpoint" {
  value = (
    var.cloud_provider == "aws" ? aws_eks_cluster.main[0].endpoint :
    var.cloud_provider == "gcp" ? google_container_cluster.main[0].endpoint :
    var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].fqdn :
    null
  )
}

output "cluster_ca_certificate" {
  value = (
    var.cloud_provider == "aws" ? aws_eks_cluster.main[0].certificate_authority[0].data :
    var.cloud_provider == "gcp" ? google_container_cluster.main[0].master_auth[0].cluster_ca_certificate :
    var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].kube_config[0].cluster_ca_certificate :
    null
  )
  sensitive = true
}

output "kubeconfig" {
  value = (
    var.cloud_provider == "azure" ? azurerm_kubernetes_cluster.main[0].kube_config_raw :
    null
  )
  sensitive = true
}
