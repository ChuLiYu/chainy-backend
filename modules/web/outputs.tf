output "bucket_name" {
  description = "Name of the S3 bucket storing the web assets."
  value       = aws_s3_bucket.web.bucket
}

output "cloudfront_domain_name" {
  description = "CloudFront distribution domain name."
  value       = aws_cloudfront_distribution.web.domain_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID."
  value       = aws_cloudfront_distribution.web.id
}

output "full_domain" {
  description = "Fully qualified domain name served by CloudFront."
  value       = "${var.subdomain}.${var.domain}"
}

output "certificate_arn" {
  description = "ARN of the ACM certificate used by CloudFront."
  value       = aws_acm_certificate_validation.web.certificate_arn
}
