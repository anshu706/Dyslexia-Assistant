variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS deployment region"
}

variable "project_name" {
  type        = string
  default     = "dyslexia-assistant"
  description = "Project name"
}

variable "alert_email" {
  type        = string
  default     = "devops-dev@example.com"
  description = "Operational notification email"
}
