# Global input variables for the Chainy root module.

variable "project" {
  description = "Project identifier used for naming resources."
  type        = string
  default     = "chainy"
}

variable "environment" {
  description = "Deployment environment identifier (e.g. dev, prod)."
  type        = string
}

variable "region" {
  description = "AWS region for all primary resources."
  type        = string
  default     = "ap-northeast-1"
}

# Paths to the Lambda build output that Terraform will package into zip files.
variable "redirect_build_dir" {
  description = "Relative or absolute path to the compiled redirect Lambda artifact directory (bundled Node.js files)."
  type        = string
  default     = "dist/redirect"
}

variable "create_build_dir" {
  description = "Relative or absolute path to the compiled create Lambda artifact directory."
  type        = string
  default     = "dist/create"
}

# Operational tuning knobs for log storage and data retention.
variable "log_retention_in_days" {
  description = "CloudWatch Logs retention period for Lambda log groups."
  type        = number
  default     = 14
}

variable "click_events_retention_days" {
  description = "Number of days to retain click-event objects in S3 before transitioning to Glacier."
  type        = number
  default     = 30
}

# Allow callers to attach additional metadata tags to every resource.
variable "extra_tags" {
  description = "Additional resource tags merged with the defaults."
  type        = map(string)
  default     = {}
}
