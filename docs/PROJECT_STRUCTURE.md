# Project Structure Guide

This document explains the organized structure of the Chainy project after cleanup and reorganization.

## 📁 Directory Structure

```
chainy/                          # Backend Lambda functions
├── handlers/                     # API endpoints
├── lib/                         # Shared utilities
├── modules/                     # Terraform modules
├── scripts/                     # Backend-specific scripts
├── tests/                       # E2E tests
└── docs/                        # Backend documentation

chainy-web/                      # Frontend React application
├── src/                         # React components
├── public/                      # Static assets
├── docs/                        # Frontend documentation
└── scripts/                     # Frontend-specific scripts

config/                          # Environment configuration
├── environments.toml           # Environment settings
└── env-manager.sh              # Environment management

docs/                           # Project documentation
├── archive/                    # Historical/obsolete docs
├── troubleshooting/            # Problem-solving docs
├── guides/                     # How-to guides
└── reference/                  # Reference materials

scripts/                        # Project scripts
├── deployment/                 # Deployment scripts
├── maintenance/                # Maintenance scripts
└── testing/                    # Testing scripts
```

## 🗂️ File Organization

### Essential Scripts
- `scripts/deployment/deploy-production.sh` - Main production deployment
- `scripts/maintenance/fix-google-oauth.sh` - OAuth troubleshooting
- `scripts/maintenance/env-switch.sh` - Environment switching
- `scripts/maintenance/git-merge-*.sh` - Git management guides

### Documentation Categories

#### Active Documentation
- `README.md` - Main project documentation
- `PROJECT_README.md` - Project overview
- `docs/reference/DOCUMENTATION_INDEX.md` - Documentation index
- `ENVIRONMENT_CONFIGURATION_GUIDE_EN.md` - Environment management
- `GOOGLE_OAUTH_FIX_GUIDE_EN.md` - OAuth troubleshooting
- `GOOGLE_CLOUD_CONSOLE_PRODUCTION_SETUP_EN.md` - Production setup

#### Troubleshooting
- `docs/troubleshooting/TROUBLESHOOTING_ARCHIVE.md` - Problem solutions archive

#### Archived Documentation
- `docs/archive/` - Historical and obsolete documentation
- `docs/archive/AI_WORK_SUMMARY.md` - AI work summary
- `docs/archive/GOOGLE_OAUTH_SETUP_GUIDE_ZH.md` - Old OAuth setup guide
- `docs/archive/GOOGLE_RESPONSIVE_AUTH_GUIDE_ZH.md` - Old responsive auth guide

## 🎯 Usage Guidelines

### For Development
1. **Main scripts**: Use scripts in `scripts/` directory
2. **Environment management**: Use `config/env-manager.sh` and `scripts/maintenance/env-switch.sh`
3. **Deployment**: Use `scripts/deployment/deploy-production.sh`

### For Troubleshooting
1. **Check archive**: Look in `docs/troubleshooting/TROUBLESHOOTING_ARCHIVE.md`
2. **OAuth issues**: Use `scripts/maintenance/fix-google-oauth.sh`
3. **Reference docs**: Check `docs/reference/DOCUMENTATION_INDEX.md`

### For Documentation
1. **Main docs**: Start with `README.md`
2. **Language-specific**: Use `*_EN.md` for English, `*_ZH.md` for Chinese
3. **Archive**: Check `docs/archive/` for historical information

## 🧹 Cleanup Benefits

### Removed Duplicates
- **OAuth scripts**: Removed 4 duplicate OAuth fix scripts
- **Test scripts**: Removed 3 duplicate test scripts  
- **Deploy scripts**: Removed 2 duplicate deploy scripts

### Organized Structure
- **Clear separation**: Scripts, docs, and config in separate directories
- **Logical grouping**: Related files grouped together
- **Easy navigation**: Clear directory structure

### Maintained Functionality
- **All working scripts preserved**: No functionality lost
- **Documentation accessible**: All important docs still available
- **Cleaner root**: Root directory is now organized

## 📋 Maintenance

### Adding New Files
- **Scripts**: Place in appropriate `scripts/` subdirectory
- **Documentation**: Place in appropriate `docs/` subdirectory
- **Configuration**: Place in `config/` directory

### Updating Documentation
- **Update index**: Modify `docs/reference/DOCUMENTATION_INDEX.md`
- **Archive old docs**: Move obsolete docs to `docs/archive/`
- **Update troubleshooting**: Add new problems to `docs/troubleshooting/TROUBLESHOOTING_ARCHIVE.md`

### Script Management
- **Test before removing**: Ensure scripts are truly unused
- **Document purpose**: Add comments explaining script purpose
- **Version control**: Keep track of script changes

## 🔄 Future Improvements

1. **Automated cleanup**: Script to identify unused files
2. **Documentation generation**: Auto-generate docs from code
3. **Script testing**: Automated testing for all scripts
4. **Dependency tracking**: Track which files depend on which scripts

---

**Last Updated**: 2025-10-02  
**Maintained By**: Development Team
