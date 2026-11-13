variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev/prod)"
}

variable "ecs_cluster_name" {
  type        = string
  description = "ECS cluster name"
}

variable "ecs_service_name" {
  type        = string
  description = "ECS service name"
}

variable "budget_limit_usd" {
  type        = number
  default     = 25
  description = "Monthly budget limit in USD"
}

variable "alert_email" {
  type        = string
  default     = "devops-alerts@example.com"
  description = "Email address for alerts"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}

