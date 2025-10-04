# Independent Frontend & Backend Workflows

## 📁 Current Structure (Independent)

### Backend (chainy/)
```
chainy/.github/workflows/
├── ci.yml                   # Backend CI (testing, linting)
└── deploy.yml               # Backend deployment (Terraform + Lambda)
```

### Frontend (chainy-web/)
```
chainy-web/.github/workflows/
├── ci.yml                   # Frontend CI (testing, building, deploying)
└── deploy.yml               # Frontend-only deployment (S3 + CloudFront)
```

### Root Level (Ignored)
```
.github/workflows/
└── deploy-production.yml.ignore  # Full-stack deployment (temporarily ignored)
```

## 🎯 Workflow Purposes

### Backend Workflows

#### 1. Backend CI (`chainy/.github/workflows/ci.yml`)
**Purpose**: Backend testing and validation
**Triggers**: Push, Pull requests
**Actions**:
- Run tests
- Lint code
- Build packages

#### 2. Backend Deploy (`chainy/.github/workflows/deploy.yml`)
**Purpose**: Backend-only deployment
**Triggers**: Push to main (backend changes only), Manual dispatch
**Actions**:
- Create terraform.tfvars from secrets
- Run terraform apply
- Deploy Lambda functions
- Verify deployment
- Test API endpoint

### Frontend Workflows

#### 1. Frontend CI (`chainy-web/.github/workflows/ci.yml`)
**Purpose**: Frontend testing, building, and deployment
**Triggers**: Push, Pull requests
**Actions**:
- Run tests
- Lint code
- Build frontend
- Deploy to S3 (on main branch)
- Invalidate CloudFront cache

#### 2. Frontend Deploy (`chainy-web/.github/workflows/deploy.yml`)
**Purpose**: Frontend-only deployment
**Triggers**: Push to main (frontend changes only), Manual dispatch
**Actions**:
- Build frontend
- Deploy to S3
- Invalidate CloudFront cache
- Health check

## 🔧 Usage Instructions

### Backend Deployment
```bash
# Make backend changes
cd chainy
# Edit backend files
git add .
git commit -m "Backend changes"
git push origin main
# Triggers: chainy/.github/workflows/deploy.yml
```

### Frontend Deployment
```bash
# Make frontend changes
cd chainy-web
# Edit frontend files
git add .
git commit -m "Frontend changes"
git push origin main
# Triggers: chainy-web/.github/workflows/deploy.yml
```

### Independent Development
```bash
# Backend only changes
git add chainy/
git commit -m "Backend update"
git push origin main
# Only backend workflow runs

# Frontend only changes
git add chainy-web/
git commit -m "Frontend update"
git push origin main
# Only frontend workflow runs
```

## 📋 Required Secrets

### Backend Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### Frontend Secrets
```
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
CHAINY_API_ENDPOINT
CHAINY_FRONTEND_BUCKET
CHAINY_CLOUDFRONT_DISTRIBUTION_ID
```

## 🚀 Benefits of Independent Workflows

### ✅ Faster Deployments
- Deploy only what changed
- No unnecessary rebuilds
- Reduced deployment time

### ✅ Better Resource Management
- Use only required secrets
- Smaller workflow scope
- Lower resource usage

### ✅ Improved Development Flow
- Work on frontend/backend independently
- Test changes in isolation
- Easier debugging

### ✅ Flexible Deployment
- Deploy backend without frontend
- Deploy frontend without backend
- Manual control over deployments

## 🔍 Path-Based Triggers

### Backend Triggers
```yaml
paths:
  - 'chainy/**'
  - '!chainy-web/**'
```
Only runs when backend files change.

### Frontend Triggers
```yaml
paths:
  - 'chainy-web/**'
  - '!chainy/**'
```
Only runs when frontend files change.

## 📊 Workflow Status

### Current Status
- ✅ Backend workflows: Ready
- ✅ Frontend workflows: Ready
- ⏸️ Root workflow: Ignored (can be restored later)

### Next Steps
1. Add missing secrets to GitHub
2. Test backend deployment
3. Test frontend deployment
4. Verify independent operation

---

**Note**: Root-level full-stack workflow is temporarily ignored but can be restored when needed for complete deployments.
