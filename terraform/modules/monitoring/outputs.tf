output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "SNS alerts topic ARN"
}

output "dashboard_name" {
  value       = aws_cloudwatch_dashboard.ops.dashboard_name
  description = "CloudWatch dashboard name"
}

