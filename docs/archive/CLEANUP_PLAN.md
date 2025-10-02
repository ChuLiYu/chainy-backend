# Project Cleanup Plan

This document outlines the cleanup plan for removing unused scripts and organizing documentation.

## 🗑️ Scripts to Remove

### Duplicate OAuth Fix Scripts
These scripts are redundant since we have `fix-google-oauth.sh` which is the main working solution:

- `auto-fix-google-console.py` - Duplicate OAuth fix tool
- `auto-fix-oauth.py` - Duplicate OAuth fix tool  
- `oauth-auto-fix.py` - Duplicate OAuth fix tool
- `fix-oauth-config.sh` - Duplicate OAuth fix tool

### Duplicate Test Scripts
These test scripts are redundant since OAuth is now working:

- `test-google-auth.sh` - OAuth test script (OAuth is working)
- `test-google-auth.zh-TW.sh` - Chinese version of OAuth test
- `test-responsive-google-auth.sh` - Responsive OAuth test

### Duplicate Deploy Scripts
These deploy scripts are redundant since we have `deploy-production.sh`:

- `deploy-google-auth.sh` - Specific OAuth deploy (now integrated)
- `deploy-google-auth.zh-TW.sh` - Chinese version

## 📁 Scripts to Keep

### Essential Scripts
- `fix-google-oauth.sh` - Main OAuth fix tool (working solution)
- `deploy-production.sh` - Main production deployment script
- `env-switch.sh` - Environment switching utility
- `config/env-manager.sh` - Environment management

### Git Management Scripts
- `git-merge-complete-guide.sh` - Git merge guide (useful for future)
- `git-merge-guide.sh` - Git merge guide (useful for future)

## 📚 Documentation to Organize

### Create Archive Directory Structure
```
docs/
├── archive/           # Historical/obsolete documentation
├── troubleshooting/  # Problem-solving documentation
├── guides/           # How-to guides
└── reference/        # Reference materials
```

### Move to Archive
- Old troubleshooting logs
- Obsolete setup guides
- Historical implementation plans

### Keep Active
- Main README files
- Current environment guides
- Active troubleshooting archive
- Documentation index

## 🎯 Cleanup Actions

1. **Remove duplicate scripts** - Delete redundant OAuth and test scripts
2. **Organize documentation** - Create proper directory structure
3. **Archive old docs** - Move obsolete documentation to archive
4. **Update references** - Update any references to removed files
5. **Clean up root directory** - Move scripts to appropriate subdirectories

## ✅ Benefits

- **Reduced confusion** - Clear which scripts to use
- **Better organization** - Logical file structure
- **Easier maintenance** - Less duplicate code to maintain
- **Cleaner repository** - Professional appearance
- **Faster navigation** - Easier to find relevant files
