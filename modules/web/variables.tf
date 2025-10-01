variable "project" {
  description = "Project identifier used for resource naming."
  type        = string
}

variable "environment" {
  description = "Deployment environment (e.g. dev, prod)."
  type        = string
}

variable "domain" {
  description = "Root domain (e.g. example.com) that hosts the front-end."
  type        = string
}

variable "subdomain" {
  description = "Subdomain used for the CloudFront alias (e.g. chainy -> chainy.example.com)."
  type        = string
  default     = "chainy"
}

variable "hosted_zone_id" {
  description = "Route 53 hosted zone ID for the provided domain."
  type        = string
}

variable "bucket_name" {
  description = "Optional override for the S3 bucket name. Defaults to <project>-<environment>-web."
  type        = string
  default     = null
}

variable "price_class" {
  description = "CloudFront price class controlling edge locations (PriceClass_All, PriceClass_200, PriceClass_100)."
  type        = string
  default     = "PriceClass_100"
}

variable "index_document" {
  description = "Default document returned by CloudFront."
  type        = string
  default     = "index.html"
}

variable "error_document" {
  description = "Document returned for 404/5xx responses."
  type        = string
  default     = "index.html"
}

variable "tags" {
  description = "Common tags applied to created resources."
  type        = map(string)
  default     = {}
}

variable "api_domain_name" {
  description = "API Gateway domain name for short link redirects (without https://)."
  type        = string
}
