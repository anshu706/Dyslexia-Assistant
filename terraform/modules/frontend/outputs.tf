output "cloudfront_distribution_id" {
  value       = aws_cloudfront_distribution.cdn.id
  description = "CloudFront Distribution ID"
}

output "cloudfront_domain_name" {
  value       = aws_cloudfront_distribution.cdn.domain_name
  description = "CloudFront Domain Name"
}

output "s3_bucket_id" {
  value       = aws_s3_bucket.frontend.id
  description = "S3 Frontend Assets Bucket ID"
}

