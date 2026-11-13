variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev/prod)"
}

variable "db_subnet_group_name" {
  type        = string
  description = "DB subnet group name"
}

variable "rds_security_group_id" {
  type        = string
  description = "Security group for RDS"
}

variable "kms_key_arn" {
  type        = string
  description = "KMS Key ARN for encryption"
}

variable "allocated_storage" {
  type        = number
  default     = 20
  description = "Allocated storage in GB"
}

variable "instance_class" {
  type        = string
  default     = "db.t4g.micro"
  description = "RDS instance class"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}

