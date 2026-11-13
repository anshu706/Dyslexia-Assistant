variable "project_name" {
  type        = string
  description = "Project name"
}

variable "environment" {
  type        = string
  description = "Environment (dev/prod)"
}

variable "alb_dns_name" {
  type        = string
  description = "ALB DNS name for API origin"
}

variable "tags" {
  type        = map(string)
  default     = {}
  description = "Resource tags"
}
