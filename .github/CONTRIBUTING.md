# Contributing Guide

Welcome to contribute to the Chainy project! Please follow these guidelines to ensure code quality and project consistency.

## Git Workflow

### Branch Strategy

We use the **Git Flow** branch model:

- `main` - Production branch, contains only stable releases
- `develop` - Development branch, integrates all feature development
- `feature/*` - Feature branches, created from `develop` branch
- `hotfix/*` - Hotfix branches, created from `main` branch
- `release/*` - Release preparation branches, created from `develop` branch

### Commit Message Convention

Use [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types (type)**:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Code style changes (doesn't affect functionality)
- `refactor`: Code refactoring
- `test`: Test related
- `chore`: Build process or auxiliary tool changes

**Examples**:

```
feat(api): add short URL creation API endpoint

- Implement POST /links endpoint
- Add DynamoDB table integration
- Include input validation and error handling

Closes #123
```

### Development Process

1. **Create Feature Branch**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Develop and Commit**

   ```bash
   git add .
   git commit -m "feat: implement new feature"
   ```

3. **Push Branch**

   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**

   - From `feature/your-feature-name` to `develop`
   - Fill in detailed PR description
   - Ensure all checks pass

5. **Code Review**

   - Wait for reviewer feedback
   - Modify code based on suggestions
   - Resubmit changes

6. **Merge**
   - Merge to `develop` after review approval
   - Delete feature branch

### Release Process

1. **Create Release Branch**

   ```bash
   git checkout develop
   git checkout -b release/v1.0.0
   ```

2. **Prepare Release**

   - Update version numbers
   - Update CHANGELOG
   - Fix release-related issues

3. **Merge to main**

   ```bash
   git checkout main
   git merge release/v1.0.0
   git tag v1.0.0
   ```

4. **Merge back to develop**
   ```bash
   git checkout develop
   git merge release/v1.0.0
   ```

## Code Standards

### TypeScript/JavaScript

- Use ESLint and Prettier
- Follow Airbnb code style
- Use meaningful variable and function names
- Add appropriate comments

### Terraform

- Use `terraform fmt` to format code
- Follow Terraform best practices
- Use meaningful resource names
- Add appropriate comments and descriptions

### Testing

- Write tests for new features
- Ensure test coverage
- Use descriptive test names

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:

```
feat(api): add short URL creation API endpoint
```

### PR Description

Include the following content:

- Change summary
- Related Issue numbers
- Testing instructions
- Deployment notes

### PR Checklist

- [ ] Code follows project standards
- [ ] All tests pass
- [ ] Update related documentation
- [ ] Add appropriate comments
- [ ] Consider backward compatibility

## Issue Reporting

When reporting issues using GitHub Issues, please include:

1. **Issue Description** - Clearly describe the issue
2. **Reproduction Steps** - How to reproduce the issue
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happened
5. **Environment Information** - OS, Node.js version, etc.
6. **Related Screenshots** - If applicable

## Feature Requests

When proposing new features, please include:

1. **Feature Description** - Detailed description of the feature
2. **Use Cases** - Why this feature is needed
3. **Implementation Suggestions** - Ideas on how to implement
4. **Alternatives** - Other solutions considered

## Contact

For any questions, please contact through:

- GitHub Issues
- Pull Request comments
- Project discussion board

Thank you for your contribution!