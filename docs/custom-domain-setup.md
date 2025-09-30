# Chainy Custom Domain Setup Guide

## 🌐 Setting up chainy.luichu.dev Domain

### Step 1: Check Route 53 Hosted Zone

First, check if you already have a Hosted Zone for `luichu.dev`:

```bash
aws route53 list-hosted-zones --query "HostedZones[?Name=='luichu.dev.'].{Name:Name,Id:Id}" --output table
```

### Step 2: Create Hosted Zone if it doesn't exist

```bash
# Create Hosted Zone for luichu.dev
aws route53 create-hosted-zone \
  --name luichu.dev \
  --caller-reference $(date +%s) \
  --hosted-zone-config Comment="Hosted zone for luichu.dev"
```

### Step 3: Get Hosted Zone ID

```bash
# Get Hosted Zone ID
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='luichu.dev.'].Id" --output text | sed 's|/hostedzone/||')
echo "Hosted Zone ID: $HOSTED_ZONE_ID"
```

### Step 4: Update terraform.tfvars

Update `terraform.tfvars` with the obtained Hosted Zone ID:

```hcl
# Optional: Configure front-end hosting (CloudFront + S3)
web_domain         = "luichu.dev"
web_subdomain      = "chainy"
web_hosted_zone_id = "Z1234567890ABCDEFG" # Replace with actual Hosted Zone ID
web_price_class    = "PriceClass_100"
```

### Step 5: Update DNS Settings

If you're using an external DNS provider (like Cloudflare, GoDaddy, etc.), you need to:

1. **Get Name Servers**:
```bash
aws route53 get-hosted-zone --id $HOSTED_ZONE_ID --query "DelegationSet.NameServers" --output table
```

2. **Configure in your DNS provider**:
   - Point `luichu.dev` Name Servers to AWS Route 53 Name Servers
   - Or create CNAME record pointing to CloudFront distribution

### Step 6: Deploy Infrastructure

```bash
terraform plan
terraform apply
```

### Step 7: Verify Setup

After deployment, verify domain configuration:

```bash
# Check CloudFront distribution
terraform output web_cloudfront_domain

# Check full domain
terraform output web_domain

# Test DNS resolution
nslookup chainy.luichu.dev
```

## 🔧 Alternative: Using Existing DNS Provider

If you don't want to use Route 53, you can:

### Option 1: Using Cloudflare

1. Add `luichu.dev` domain in Cloudflare
2. Create CNAME record:
   - Name: `chainy`
   - Content: `d1234567890.cloudfront.net` (get from terraform output)
   - Proxy status: Proxied (orange cloud)

### Option 2: Using Other DNS Providers

1. Create CNAME record:
   - Hostname: `chainy.luichu.dev`
   - Points to: CloudFront distribution domain
2. Wait for DNS propagation (usually 5-15 minutes)

## 📋 Complete terraform.tfvars Example

```hcl
# Environment name (dev, staging, prod)
environment = "dev"

# AWS region for resources
region = "ap-northeast-1"

# SSM parameter names for hashing salts
hash_salt_parameter_name    = "/chainy/dev/hash-salt"
ip_hash_salt_parameter_name = "/chainy/dev/ip-hash-salt"

# Fallback values for SSM parameters (used if SSM fails)
hash_salt_fallback    = "your-fallback-hash-salt"
ip_hash_salt_fallback = "your-fallback-ip-salt"

# Lambda environment variables (additional)
lambda_additional_environment = {}

# Domain configuration
web_domain         = "luichu.dev"
web_subdomain      = "chainy"
web_hosted_zone_id = "Z1234567890ABCDEFG" # Replace with actual Hosted Zone ID
web_price_class    = "PriceClass_100"

# Optional: Additional tags for all resources
extra_tags = {
  Project     = "chainy"
  Environment = "dev"
  ManagedBy   = "terraform"
}
```

## 🚀 Usage After Deployment

After deployment, your short links will use the following format:

- **API Endpoint**: `https://chainy.luichu.dev/api/`
- **Short Links**: `https://chainy.luichu.dev/abc123`
- **Frontend Interface**: `https://chainy.luichu.dev/`

## 🔍 Troubleshooting

### Common Issues

1. **DNS Resolution Failed**
   - Check if CNAME record is correct
   - Wait for DNS propagation to complete
   - Use `dig chainy.luichu.dev` to check resolution

2. **SSL Certificate Issues**
   - CloudFront will automatically handle SSL certificates
   - Ensure domain is verified

3. **CloudFront Cache Issues**
   - Clear CloudFront cache
   - Check Origin settings

### Verification Commands

```bash
# Check DNS resolution
dig chainy.luichu.dev

# Check SSL certificate
openssl s_client -connect chainy.luichu.dev:443 -servername chainy.luichu.dev

# Test API endpoint
curl -I https://chainy.luichu.dev/api/health
```

## 🔒 Security Best Practices

1. **Regular API Key Rotation**
2. **Monitor Abnormal Access Patterns**
3. **Use WAF Protection**
4. **Enable CloudTrail Auditing**
5. **Regular Dependency Updates**

## 📞 Support

If you need assistance, please provide:
1. Your current DNS provider
2. DNS settings for `luichu.dev`
3. Any error messages