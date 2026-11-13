terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.72"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "dyslexia-assistant-tfstate-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "dyslexia-assistant-tf-locks-dev"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "dyslexia-assistant"
      Environment = "dev"
      Owner       = "devops"
      CostCenter  = "engineering-dev"
      ManagedBy   = "terraform"
    }
  }
}

module "networking" {
  source             = "../../modules/networking"
  project_name       = var.project_name
  environment        = "dev"
  availability_zones = ["us-east-1a", "us-east-1b"]
}

module "security" {
  source       = "../../modules/security"
  project_name = var.project_name
  environment  = "dev"
  vpc_id       = module.networking.vpc_id
}

module "database" {
  source                = "../../modules/database"
  project_name          = var.project_name
  environment           = "dev"
  db_subnet_group_name  = module.networking.db_subnet_group_name
  rds_security_group_id = module.security.rds_security_group_id
  kms_key_arn           = module.security.kms_key_arn
  instance_class        = "db.t4g.micro"
  allocated_storage     = 20
}

module "ecs_api" {
  source                      = "../../modules/ecs_api"
  project_name                = var.project_name
  environment                 = "dev"
  vpc_id                      = module.networking.vpc_id
  public_subnet_ids           = module.networking.public_subnet_ids
  private_app_subnet_ids      = module.networking.private_app_subnet_ids
  alb_security_group_id       = module.security.alb_security_group_id
  ecs_tasks_security_group_id = module.security.ecs_tasks_security_group_id
  db_secret_arn               = module.database.db_secret_arn
  desired_count               = 1
  cpu                         = 256
  memory                      = 512
}

module "frontend" {
  source       = "../../modules/frontend"
  project_name = var.project_name
  environment  = "dev"
  alb_dns_name = module.ecs_api.alb_dns_name
}

module "monitoring" {
  source           = "../../modules/monitoring"
  project_name     = var.project_name
  environment      = "dev"
  ecs_cluster_name = module.ecs_api.ecs_cluster_name
  ecs_service_name = module.ecs_api.ecs_service_name
  budget_limit_usd = 25
  alert_email      = var.alert_email
}
