# Networking Module
# Provisions VPC, subnets, and networking resources for AWS, GCP, or Azure

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

variable "vpc_cidr" {
  type    = string
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  type    = list(string)
  default = []
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Default AZs if not provided
  azs = length(var.availability_zones) > 0 ? var.availability_zones : (
    var.cloud_provider == "aws" ? ["${var.region}a", "${var.region}b", "${var.region}c"] :
    var.cloud_provider == "gcp" ? ["${var.region}-a", "${var.region}-b", "${var.region}-c"] :
    ["1", "2", "3"]
  )

  # Subnet CIDRs
  public_subnets  = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 4, i)]
  private_subnets = [for i, az in local.azs : cidrsubnet(var.vpc_cidr, 4, i + length(local.azs))]
}

# AWS VPC
resource "aws_vpc" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${local.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  tags = {
    Name = "${local.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  count = var.cloud_provider == "aws" ? length(local.azs) : 0

  vpc_id                  = aws_vpc.main[0].id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                           = "${local.name_prefix}-public-${count.index + 1}"
    "kubernetes.io/role/elb"                       = "1"
    "kubernetes.io/cluster/${local.name_prefix}"   = "shared"
  }
}

resource "aws_subnet" "private" {
  count = var.cloud_provider == "aws" ? length(local.azs) : 0

  vpc_id            = aws_vpc.main[0].id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = {
    Name                                           = "${local.name_prefix}-private-${count.index + 1}"
    "kubernetes.io/role/internal-elb"              = "1"
    "kubernetes.io/cluster/${local.name_prefix}"   = "shared"
  }
}

resource "aws_eip" "nat" {
  count = var.cloud_provider == "aws" ? 1 : 0

  domain = "vpc"

  tags = {
    Name = "${local.name_prefix}-nat-eip"
  }
}

resource "aws_nat_gateway" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name = "${local.name_prefix}-nat"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  count = var.cloud_provider == "aws" ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = {
    Name = "${local.name_prefix}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count = var.cloud_provider == "aws" ? 1 : 0

  vpc_id = aws_vpc.main[0].id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[0].id
  }

  tags = {
    Name = "${local.name_prefix}-private-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = var.cloud_provider == "aws" ? length(local.azs) : 0

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

resource "aws_route_table_association" "private" {
  count = var.cloud_provider == "aws" ? length(local.azs) : 0

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[0].id
}

# GCP VPC
resource "google_compute_network" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name                    = "${local.name_prefix}-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name          = "${local.name_prefix}-subnet"
  ip_cidr_range = var.vpc_cidr
  region        = var.region
  network       = google_compute_network.main[0].id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}

resource "google_compute_router" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name    = "${local.name_prefix}-router"
  region  = var.region
  network = google_compute_network.main[0].id
}

resource "google_compute_router_nat" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name                               = "${local.name_prefix}-nat"
  router                             = google_compute_router.main[0].name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Azure VNet
resource "azurerm_resource_group" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name     = "${local.name_prefix}-rg"
  location = var.region
}

resource "azurerm_virtual_network" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "${local.name_prefix}-vnet"
  location            = azurerm_resource_group.main[0].location
  resource_group_name = azurerm_resource_group.main[0].name
  address_space       = [var.vpc_cidr]
}

resource "azurerm_subnet" "public" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                 = "${local.name_prefix}-public-subnet"
  resource_group_name  = azurerm_resource_group.main[0].name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = [local.public_subnets[0]]
}

resource "azurerm_subnet" "private" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                 = "${local.name_prefix}-private-subnet"
  resource_group_name  = azurerm_resource_group.main[0].name
  virtual_network_name = azurerm_virtual_network.main[0].name
  address_prefixes     = [local.private_subnets[0]]
}

# Outputs
output "vpc_id" {
  value = (
    var.cloud_provider == "aws" ? aws_vpc.main[0].id :
    var.cloud_provider == "gcp" ? google_compute_network.main[0].id :
    var.cloud_provider == "azure" ? azurerm_virtual_network.main[0].id :
    null
  )
}

output "public_subnet_ids" {
  value = (
    var.cloud_provider == "aws" ? aws_subnet.public[*].id :
    var.cloud_provider == "gcp" ? [google_compute_subnetwork.main[0].id] :
    var.cloud_provider == "azure" ? [azurerm_subnet.public[0].id] :
    []
  )
}

output "private_subnet_ids" {
  value = (
    var.cloud_provider == "aws" ? aws_subnet.private[*].id :
    var.cloud_provider == "gcp" ? [google_compute_subnetwork.main[0].id] :
    var.cloud_provider == "azure" ? [azurerm_subnet.private[0].id] :
    []
  )
}

output "resource_group_name" {
  value = var.cloud_provider == "azure" ? azurerm_resource_group.main[0].name : null
}
