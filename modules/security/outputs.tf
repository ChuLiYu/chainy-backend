output "jwt_secret_parameter_name" {
  description = "Name of the SSM parameter containing JWT secret"
  value       = aws_ssm_parameter.jwt_secret.name
}

output "jwt_secret_parameter_arn" {
  description = "ARN of the SSM parameter containing JWT secret"
  value       = aws_ssm_parameter.jwt_secret.arn
}

output "waf_web_acl_id" {
  description = "ID of the WAF Web ACL"
  value       = aws_wafv2_web_acl.api.id
}

output "waf_web_acl_arn" {
  description = "ARN of the WAF Web ACL"
  value       = aws_wafv2_web_acl.api.arn
}

output "waf_web_acl_name" {
  description = "Name of the WAF Web ACL"
  value       = aws_wafv2_web_acl.api.name
}

output "waf_log_group_name" {
  description = "Name of the CloudWatch log group for WAF logs"
  value       = aws_cloudwatch_log_group.waf.name
}

