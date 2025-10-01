# Security Module
# Manages SSM parameters, WAF rules, and security configurations

data "aws_region" "current" {}

# ============================================================================
# SSM Parameter Store - JWT Secret
# ============================================================================

# Generate a random JWT secret if not provided
resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

# Store JWT secret in SSM Parameter Store with encryption
resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project}/${var.environment}/jwt-secret"
  description = "JWT secret for API authentication"
  type        = "SecureString"
  value       = var.jwt_secret != "" ? var.jwt_secret : random_password.jwt_secret.result

  tags = merge(var.tags, {
    Name        = "${var.project}-${var.environment}-jwt-secret"
    Environment = var.environment
    Sensitive   = "true"
  })

  lifecycle {
    ignore_changes = [value]
  }
}

# ============================================================================
# AWS WAF - Web Application Firewall
# ============================================================================

# WAF Web ACL for API Gateway
resource "aws_wafv2_web_acl" "api" {
  name        = "${var.project}-${var.environment}-api-waf"
  description = "WAF rules for Chainy API Gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Rate limiting - prevent abuse
  rule {
    name     = "RateLimitRule"
    priority = 1

    action {
      block {
        custom_response {
          response_code            = 429
          custom_response_body_key = "rate_limit_response"
        }
      }
    }

    statement {
      rate_based_statement {
        limit              = var.rate_limit_per_5min
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: AWS Managed Rules - Common Rule Set
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"

        # Exclude overly strict rules if needed
        rule_action_override {
          name = "SizeRestrictions_BODY"
          action_to_use {
            count {}
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-common-rules"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: AWS Managed Rules - Known Bad Inputs
  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 3

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  # Rule 4: Block requests with suspicious user agents
  rule {
    name     = "BlockSuspiciousUserAgents"
    priority = 4

    action {
      block {}
    }

    statement {
      byte_match_statement {
        search_string = "bot"
        field_to_match {
          single_header {
            name = "user-agent"
          }
        }
        text_transformation {
          priority = 0
          type     = "LOWERCASE"
        }
        positional_constraint = "CONTAINS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-suspicious-ua"
      sampled_requests_enabled   = true
    }
  }

  # Rule 5: Geographic restrictions (optional)
  dynamic "rule" {
    for_each = length(var.blocked_countries) > 0 ? [1] : []
    content {
      name     = "GeoBlockRule"
      priority = 5

      action {
        block {}
      }

      statement {
        geo_match_statement {
          country_codes = var.blocked_countries
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = "${var.project}-geo-block"
        sampled_requests_enabled   = true
      }
    }
  }

  # Custom response for rate limiting
  custom_response_body {
    key = "rate_limit_response"
    content = jsonencode({
      message = "Too many requests. Please try again later."
      error   = "rate_limit_exceeded"
    })
    content_type = "APPLICATION_JSON"
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf-acl"
    sampled_requests_enabled   = true
  }

  tags = merge(var.tags, {
    Name = "${var.project}-${var.environment}-api-waf"
  })
}

# Associate WAF with API Gateway
resource "aws_wafv2_web_acl_association" "api" {
  count        = var.api_gateway_arn != "" ? 1 : 0
  resource_arn = var.api_gateway_arn
  web_acl_arn  = aws_wafv2_web_acl.api.arn
}

# ============================================================================
# CloudWatch Alarms for WAF
# ============================================================================

resource "aws_cloudwatch_metric_alarm" "waf_blocked_requests" {
  alarm_name          = "${var.project}-${var.environment}-waf-blocked-requests"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "Alerts when WAF blocks many requests"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = aws_wafv2_web_acl.api.name
    Region = data.aws_region.current.name
    Rule   = "ALL"
  }

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "waf_rate_limit" {
  alarm_name          = "${var.project}-${var.environment}-waf-rate-limit"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  alarm_description   = "Alerts when rate limiting is triggered frequently"
  treat_missing_data  = "notBreaching"

  dimensions = {
    WebACL = aws_wafv2_web_acl.api.name
    Region = data.aws_region.current.name
    Rule   = "RateLimitRule"
  }

  tags = var.tags
}

# ============================================================================
# CloudWatch Log Group for WAF
# ============================================================================

resource "aws_cloudwatch_log_group" "waf" {
  name              = "/aws/wafv2/${var.project}-${var.environment}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# Enable WAF logging
resource "aws_wafv2_web_acl_logging_configuration" "api" {
  resource_arn            = aws_wafv2_web_acl.api.arn
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]

  redacted_fields {
    single_header {
      name = "authorization"
    }
  }
}

