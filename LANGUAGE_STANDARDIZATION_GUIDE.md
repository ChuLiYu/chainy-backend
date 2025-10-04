# Language Standardization Guidelines

## Overview
This document outlines the language standards for the Chainy project documentation to ensure consistency and clarity.

## Language Rules

### English Documentation (_EN.md files)
- **Primary Language**: English only
- **Code Examples**: Use English comments and variable names
- **Technical Terms**: Use standard English technical terminology
- **No Chinese**: Absolutely no Chinese characters in English documentation

### Chinese Documentation (_ZH.md files)
- **Primary Language**: Traditional Chinese (繁體中文)
- **Code Examples**: 
  - Comments should be in Chinese
  - Variable names can remain in English (technical standards)
  - Commands and technical terms can remain in English
- **Mixed Content Allowed**: 
  - Technical commands: `terraform apply`, `npm install`
  - Variable names: `google_client_id`, `api_endpoint`
  - URLs and technical identifiers
  - Error messages and logs (as they appear in English)

## Examples

### ✅ Correct Chinese Documentation
```bash
# 初始化 Terraform（會下載新的 provider）
terraform init

# 查看計劃變更
terraform plan

# 應該看到以下新資源：
# + module.security.aws_ssm_parameter.jwt_secret
```

### ❌ Incorrect Chinese Documentation
```bash
# Initialize Terraform (will download new provider)
terraform init

# View planned changes
terraform plan
```

### ✅ Correct English Documentation
```bash
# Initialize Terraform (will download new provider)
terraform init

# View planned changes
terraform plan

# Should see new resources:
# + module.security.aws_ssm_parameter.jwt_secret
```

## Implementation Plan

### Phase 1: Review Current State
- [x] Identify mixed language content
- [x] Document current issues
- [ ] Create correction plan

### Phase 2: Fix Critical Files
- [ ] Fix Chinese documentation with excessive English
- [ ] Ensure English documentation is pure English
- [ ] Update code examples and comments

### Phase 3: Establish Standards
- [ ] Create templates for new documentation
- [ ] Update contribution guidelines
- [ ] Train team on language standards

## Files Requiring Attention

### Chinese Files with Excessive English
1. `chainy/README-COST-OPTIMIZATION_ZH.md` - Many English comments
2. `ENVIRONMENT_CONFIGURATION_GUIDE_ZH.md` - Mixed language
3. `GOOGLE_OAUTH_FIX_GUIDE_ZH.md` - English technical terms
4. `chainy/docs/security-deployment-guide_ZH.md` - Code examples

### English Files Status
- ✅ All English files appear to be pure English
- ✅ No Chinese characters found in English documentation

## Recommendations

1. **Keep Technical Terms in English**: Commands, variable names, and technical identifiers should remain in English even in Chinese documentation
2. **Translate Comments**: All explanatory comments should be in the target language
3. **Consistent Formatting**: Use consistent formatting for code blocks and examples
4. **Review Process**: Implement review process for new documentation

## Next Steps

1. Fix the most critical Chinese documentation files
2. Create templates for consistent documentation
3. Update contribution guidelines
4. Implement automated checks for language consistency
