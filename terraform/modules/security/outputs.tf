output "kms_key_arn" {
  value       = aws_kms_key.main.arn
  description = "KMS Key ARN"
}

output "kms_key_id" {
  value       = aws_kms_key.main.key_id
  description = "KMS Key ID"
}

output "alb_security_group_id" {
  value       = aws_security_group.alb.id
  description = "ALB security group ID"
}

output "ecs_tasks_security_group_id" {
  value       = aws_security_group.ecs_tasks.id
  description = "ECS tasks security group ID"
}

output "rds_security_group_id" {
  value       = aws_security_group.rds.id
  description = "RDS security group ID"
}
