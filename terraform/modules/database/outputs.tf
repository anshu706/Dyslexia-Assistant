output "db_instance_endpoint" {
  value       = aws_db_instance.postgres.endpoint
  description = "RDS endpoint"
}

output "db_instance_address" {
  value       = aws_db_instance.postgres.address
  description = "RDS instance address"
}

output "db_secret_arn" {
  value       = aws_secretsmanager_secret.db_secret.arn
  description = "Secrets Manager secret ARN"
}

