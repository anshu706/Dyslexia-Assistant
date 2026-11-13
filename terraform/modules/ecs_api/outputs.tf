output "alb_dns_name" {
  value       = aws_lb.api.dns_name
  description = "ALB DNS Name"
}

output "alb_zone_id" {
  value       = aws_lb.api.zone_id
  description = "ALB Canonical Hosted Zone ID"
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.api.repository_url
  description = "ECR Repository URL"
}

output "ecs_service_name" {
  value       = aws_ecs_service.api.name
  description = "ECS Service Name"
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS Cluster Name"
}
