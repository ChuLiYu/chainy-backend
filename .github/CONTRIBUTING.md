# Contributing Guide

Welcome to contribute to the Chainy Web frontend project! Please follow these guidelines to ensure code quality and project consistency.

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
feat(ui): add short URL creation form

- Implement URL input form
- Add form validation
- Integrate API calls

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

## Code Standards

### React/JavaScript

- Use ESLint and Prettier
- Follow Airbnb code style
- Use functional components and Hooks
- Use meaningful variable and function names
- Add appropriate comments

### Component Design

- Keep components small and focused
- Use PropTypes or TypeScript for type checking
- Follow single responsibility principle
- Use custom Hooks to extract logic

### Styling Standards

- Prioritize Tailwind CSS classes
- Maintain responsive design
- Use consistent spacing and colors
- Follow design system

### Testing

- Write tests for new components
- Use React Testing Library
- Ensure test coverage
- Use descriptive test names

## Pull Request Guidelines

### PR Title

Use the same format as commit messages:

```
feat(ui): add short URL creation form
```

### PR Description

Include the following content:

- Change summary
- Related Issue numbers
- Testing instructions
- Screenshots or GIFs (if applicable)

### PR Checklist

- [ ] Code follows project standards
- [ ] All tests pass
- [ ] Update related documentation
- [ ] Add appropriate comments
- [ ] Responsive design testing
- [ ] No ESLint errors

## Development Environment Setup

### Required Tools

- Node.js 18+
- npm or yarn
- Git

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test

# Code linting
npm run lint

# Build
npm run build
```

### Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_APP_NAME=Chainy
```

## Issue Reporting

When reporting issues using GitHub Issues, please include:

1. **Issue Description** - Clearly describe the issue
2. **Reproduction Steps** - How to reproduce the issue
3. **Expected Behavior** - What should happen
4. **Actual Behavior** - What actually happened
5. **Environment Information** - Browser, OS, Node.js version, etc.
6. **Related Screenshots** - If applicable
7. **Console Errors** - If there are error messages

## Feature Requests

When proposing new features, please include:

1. **Feature Description** - Detailed description of the feature
2. **Use Cases** - Why this feature is needed
3. **Design Suggestions** - UI/UX design ideas
4. **Implementation Suggestions** - Ideas on how to implement
5. **Alternatives** - Other solutions considered

## Design Guidelines

### UI/UX Principles

- Keep it simple and clear
- Prioritize user experience
- Follow accessibility design principles
- Maintain consistent visual style

### Component Library

- Create reusable components
- Use Storybook to showcase components
- Maintain consistent component API
- Provide appropriate default values

## Contact

For any questions, please contact through:

- GitHub Issues
- Pull Request comments
- Project discussion board

Thank you for your contribution!
