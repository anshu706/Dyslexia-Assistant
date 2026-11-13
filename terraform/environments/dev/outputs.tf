output "dev_frontend_url" {
  value       = "https://${module.frontend.cloudfront_domain_name}"
  description = "Public Dev CloudFront URL"
}

output "dev_api_alb_endpoint" {
  value       = "http://${module.ecs_api.alb_dns_name}"
  description = "Direct ALB URL for Dev API"
}

output "dev_ecr_repository" {
  value       = module.ecs_api.ecr_repository_url
  description = "ECR Image Repository"
}

output "dev_s3_bucket" {
  value       = module.frontend.s3_bucket_id
  description = "Frontend Assets S3 Bucket"
}
