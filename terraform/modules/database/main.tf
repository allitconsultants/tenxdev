# Database Module
# Provisions managed database for AWS (RDS), GCP (Cloud SQL), or Azure (Azure Database)

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

variable "database_engine" {
  type    = string
  default = "postgres"
}

variable "database_version" {
  type    = string
  default = "15"
}

variable "database_instance_type" {
  type    = string
  default = "db.t3.medium"
}

variable "database_storage_gb" {
  type    = number
  default = 20
}

variable "database_name" {
  type    = string
  default = "app"
}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
}

# Generate random password
resource "random_password" "db" {
  length  = 32
  special = false
}

# AWS RDS
resource "aws_db_subnet_group" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name       = "${local.name_prefix}-db-subnet"
  subnet_ids = var.subnet_ids

  tags = {
    Name = "${local.name_prefix}-db-subnet-group"
  }
}

resource "aws_security_group" "db" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name        = "${local.name_prefix}-db-sg"
  description = "Security group for database"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = var.database_engine == "postgres" ? 5432 : 3306
    to_port     = var.database_engine == "postgres" ? 5432 : 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-db-sg"
  }
}

resource "aws_db_instance" "main" {
  count = var.cloud_provider == "aws" ? 1 : 0

  identifier = "${local.name_prefix}-db"

  engine               = var.database_engine
  engine_version       = var.database_version
  instance_class       = var.database_instance_type
  allocated_storage    = var.database_storage_gb
  storage_type         = "gp3"
  storage_encrypted    = true

  db_name  = var.database_name
  username = "admin"
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.main[0].name
  vpc_security_group_ids = [aws_security_group.db[0].id]

  multi_az               = var.environment == "production"
  publicly_accessible    = false
  skip_final_snapshot    = var.environment != "production"
  deletion_protection    = var.environment == "production"

  backup_retention_period = var.environment == "production" ? 7 : 1

  tags = {
    Name = "${local.name_prefix}-db"
  }
}

resource "aws_secretsmanager_secret" "db_password" {
  count = var.cloud_provider == "aws" ? 1 : 0

  name = "${local.name_prefix}-db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  count = var.cloud_provider == "aws" ? 1 : 0

  secret_id = aws_secretsmanager_secret.db_password[0].id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.db.result
    host     = aws_db_instance.main[0].address
    port     = aws_db_instance.main[0].port
    database = var.database_name
  })
}

# GCP Cloud SQL
resource "google_sql_database_instance" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name             = "${local.name_prefix}-db"
  database_version = var.database_engine == "postgres" ? "POSTGRES_${var.database_version}" : "MYSQL_${var.database_version}"
  region           = var.region

  settings {
    tier = "db-custom-2-4096"

    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_id
    }

    backup_configuration {
      enabled            = true
      binary_log_enabled = var.database_engine == "mysql"
    }

    disk_size = var.database_storage_gb
    disk_type = "PD_SSD"
  }

  deletion_protection = var.environment == "production"
}

resource "google_sql_database" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name     = var.database_name
  instance = google_sql_database_instance.main[0].name
}

resource "google_sql_user" "main" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  name     = "admin"
  instance = google_sql_database_instance.main[0].name
  password = random_password.db.result
}

resource "google_secret_manager_secret" "db_password" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  secret_id = "${local.name_prefix}-db-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  secret = google_secret_manager_secret.db_password[0].id
  secret_data = jsonencode({
    username = "admin"
    password = random_password.db.result
    host     = google_sql_database_instance.main[0].private_ip_address
    database = var.database_name
  })
}

# Azure Database
data "azurerm_resource_group" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0
  name  = "${var.project_name}-${var.environment}-rg"
}

resource "azurerm_postgresql_flexible_server" "main" {
  count = var.cloud_provider == "azure" && var.database_engine == "postgres" ? 1 : 0

  name                   = "${local.name_prefix}-db"
  resource_group_name    = data.azurerm_resource_group.main[0].name
  location               = var.region
  version                = var.database_version
  delegated_subnet_id    = var.subnet_ids[0]
  administrator_login    = "admin"
  administrator_password = random_password.db.result

  storage_mb = var.database_storage_gb * 1024
  sku_name   = "GP_Standard_D2s_v3"

  zone = "1"
}

resource "azurerm_postgresql_flexible_server_database" "main" {
  count = var.cloud_provider == "azure" && var.database_engine == "postgres" ? 1 : 0

  name      = var.database_name
  server_id = azurerm_postgresql_flexible_server.main[0].id
}

resource "azurerm_key_vault_secret" "db_password" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name         = "${local.name_prefix}-db-password"
  value        = random_password.db.result
  key_vault_id = azurerm_key_vault.main[0].id
}

resource "azurerm_key_vault" "main" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name                = "${replace(local.name_prefix, "-", "")}kv"
  location            = var.region
  resource_group_name = data.azurerm_resource_group.main[0].name
  tenant_id           = data.azurerm_client_config.current[0].tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current[0].tenant_id
    object_id = data.azurerm_client_config.current[0].object_id

    secret_permissions = ["Get", "Set", "List", "Delete"]
  }
}

data "azurerm_client_config" "current" {
  count = var.cloud_provider == "azure" ? 1 : 0
}

# Outputs
output "endpoint" {
  value = (
    var.cloud_provider == "aws" ? aws_db_instance.main[0].address :
    var.cloud_provider == "gcp" ? google_sql_database_instance.main[0].private_ip_address :
    var.cloud_provider == "azure" && var.database_engine == "postgres" ? azurerm_postgresql_flexible_server.main[0].fqdn :
    null
  )
  sensitive = true
}

output "port" {
  value = var.database_engine == "postgres" ? 5432 : 3306
}

output "database_name" {
  value = var.database_name
}

output "username" {
  value     = "admin"
  sensitive = true
}

output "password_secret_id" {
  value = (
    var.cloud_provider == "aws" ? aws_secretsmanager_secret.db_password[0].id :
    var.cloud_provider == "gcp" ? google_secret_manager_secret.db_password[0].id :
    var.cloud_provider == "azure" ? azurerm_key_vault_secret.db_password[0].id :
    null
  )
}
