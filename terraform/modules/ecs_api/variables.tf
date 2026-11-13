variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "vpc_id" {
  type        = string
  description = "VPC ID"
}

variable "public_subnet_ids" {
  type        = list(string)
  description = "Public subnet IDs for ALB"
}

variable "private_app_subnet_ids" {
  type        = list(string)
  description = "Private subnet IDs for ECS tasks"
}

variable "alb_security_group_id" {
  type        = string
  description = "ALB security group ID"
}

variable "ecs_tasks_security_group_id" {
  type        = string
  description = "ECS tasks security group ID"
}

variable "db_secret_arn" {
  type        = string
  description = "Database secret ARN from Secrets Manager"
}

variable "image_tag" {
  type        = string
  default     = "latest"
  description = "Docker image tag"
}

variable "cpu" {
  type        = number
  default     = 256
  description = "Task CPU units"
}

variable "memory" {
  type        = number
  default     = 512
  description = "Task memory in MB"
}

variable "desired_count" {
  type        = number
  default     = 1
  description = "Desired number of ECS tasks"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
