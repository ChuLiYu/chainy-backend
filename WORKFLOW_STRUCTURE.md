# GitHub Actions Workflow Structure

## 📁 Current Structure (After Cleanup)

### Root Level (Full Stack Deployment)
```
.github/workflows/
└── deploy-production.yml    # Complete production deployment
```

### Backend (chainy/)
```
chainy/.github/workflows/
├── ci.yml                   # Backend CI (testing, linting)
└── deploy.yml               # Backend-only deployment
```

### Frontend (chainy-web/)
```
chainy-web/.github/workflows/
└── ci.yml                   # Frontend CI (testing, building)
```

## 🎯 Workflow Purposes

### 1. Root Level - Full Stack Production Deployment
**File**: `.github/workflows/deploy-production.yml`
**Purpose**: Complete production deployment
**Triggers**: Push to main, Manual dispatch
**Actions**:
- Deploy backend (Terraform + Lambda)
- Build and deploy frontend (S3 + CloudFront)
- Health checks

### 2. Backend - CI and Development Deployment
**File**: `chainy/.github/workflows/ci.yml`
**Purpose**: Backend testing and validation
**Triggers**: Push, Pull requests
**Actions**:
- Run tests
- Lint code
- Build packages

**File**: `chainy/.github/workflows/deploy.yml`
**Purpose**: Backend-only deployment
**Triggers**: Push to main, Manual dispatch
**Actions**:
- Deploy Lambda functions
- Update infrastructure

### 3. Frontend - CI and Development
**File**: `chainy-web/.github/workflows/ci.yml`
**Purpose**: Frontend testing and validation
**Triggers**: Push, Pull requests
**Actions**:
- Run tests
- Lint code
- Build frontend
- Deploy to development S3

## 🔧 Recommended Usage

### For Production Deployment
Use: `.github/workflows/deploy-production.yml`
- Complete full-stack deployment
- Uses all secrets
- Deploys to production

### For Development/Testing
Use: Individual component workflows
- `chainy/.github/workflows/ci.yml` - Test backend changes
- `chainy-web/.github/workflows/ci.yml` - Test frontend changes

### For Backend-Only Updates
Use: `chainy/.github/workflows/deploy.yml`
- Deploy only backend changes
- Faster deployment
- Less resource usage

## 📋 Secrets Required

### Root Level (Full Stack)
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
CHAINY_CLOUDFRONT_DISTRIBUTION_ID
CHAINY_FRONTEND_BUCKET
```

### Backend Only
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### Frontend Only
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
CHAINY_CLOUDFRONT_DISTRIBUTION_ID
CHAINY_FRONTEND_BUCKET
```

## 🚀 Deployment Strategy

### Option 1: Full Stack (Recommended for Production)
```bash
# Push to main branch triggers full deployment
git push origin main
```

### Option 2: Component-Based
```bash
# Backend only
cd chainy
git push origin main

# Frontend only  
cd chainy-web
git push origin main
```

### Option 3: Manual Deployment
```bash
# Use GitHub Actions UI to trigger manual deployment
# Go to Actions tab → Select workflow → Run workflow
```
