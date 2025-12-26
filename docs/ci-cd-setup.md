# CI/CD Setup Documentation

This document provides detailed instructions for setting up the CI/CD pipeline for the LLM-Wordsearch project.

## Overview

The CI/CD pipeline is configured using GitHub Actions and includes:

- Code linting and type checking
- Unit and integration tests
- Security audits
- Build validation
- Bruno API integration tests
- Staging and production deployments
- Automated versioning and releases

## Prerequisites

### GitHub Secrets

The following secrets must be configured in your GitHub repository settings:

```bash
# Vercel deployment credentials
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id

# API key for integration tests (optional but recommended)
API_KEY=your_openrouter_api_key
```

### GitHub Variables

The following variables should be set in your GitHub repository:

```bash
# Default model name for deployments
COMMUNITY_MODEL_NAME=google/gemini-2.5-flash
```

## Pipeline Configuration

### Branch Protection Rules

For the main branch, configure the following branch protection rules:

1. Require status checks to pass before merging
   - Enable "Require branches to be up to date before merging"
   - Require the following status checks:
     - lint-and-type-check
     - test
     - security-audit
     - build

2. Require at least 1 approving review

3. Require review from Code Owners (if CODEOWNERS file exists)

### GitHub Environments

Create the following environments in your GitHub repository:

#### staging
- Environment URL: `https://staging.your-app.vercel.app`
- Required reviewers: Optional
- Deployment branches: `develop`

#### production
- Environment URL: `https://your-app.vercel.app`
- Required reviewers: Required for all deployments
- Deployment branches: `main`

## Deployment Process

### Staging Deployment

1. Push changes to the `develop` branch
2. The CI pipeline will run automatically
3. If all checks pass, the code will be deployed to staging
4. Integration tests will run against the staging environment

### Production Deployment

1. Merge changes from `develop` to `main`
2. The CI pipeline will run automatically
3. If all checks pass, the code will be deployed to production
4. A GitHub release will be created automatically
5. Post-deployment tests will run against the production environment

## Testing Strategy

### Unit Tests
- Run with `npm run test:run`
- Code coverage report generated with `npm run test:coverage`
- Results uploaded to Codecov

### Integration Tests
- API endpoint tests
- LLM proxy functionality tests
- Bruno collection tests

### Bruno API Tests
- Located in `bruno/` directory
- Can be run locally with `npm run test:bruno` (after installing Bruno CLI)
- Run in CI/CD as part of integration tests

## Security Measures

### Security Audit
- Runs `npm audit` to check for vulnerabilities
- Fails if moderate or higher severity issues are found

### Code Scanning
- Enabled via GitHub CodeQL
- Scans for security vulnerabilities in the code

### Dependency Review
- Reviews dependencies for known vulnerabilities before merging

## Versioning and Releases

### Semantic Versioning
- Uses standard-version for automated versioning
- Follows semantic versioning (MAJOR.MINOR.PATCH)
- Git tags created automatically

### Release Process
1. When changes are merged to `main`, the release workflow is triggered
2. Changelog is automatically generated
3. Git tag is created
4. GitHub release is published
5. Version is bumped in package.json

## Troubleshooting

### Common Issues

#### API Key Not Set in CI
- Ensure `API_KEY` secret is set in GitHub repository settings
- Integration tests will be skipped if API key is not available

#### Vercel Deployment Fails
- Verify Vercel credentials are correct
- Check that VERCEL_PROJECT_ID matches your Vercel project
- Ensure the project is properly linked to Vercel

#### Bruno Tests Failing
- Verify Bruno CLI is installed in the CI environment
- Check that the API endpoints are accessible during testing
- Ensure proper environment variables are set for tests

### Debugging Tips

#### Enable Debug Logging
Add the following to your GitHub workflow to enable debug logging:
```yaml
env:
  DEBUG: true
```

#### Manual Deployment
If automatic deployment fails, you can deploy manually:
```bash
npm run deploy:vercel
```

## Monitoring and Observability

### Deployment Notifications
- Configure Slack/Discord notifications for deployment status
- Set up email notifications for failed deployments

### Performance Monitoring
- Monitor build times and deployment duration
- Track test execution times
- Monitor API response times in production

## Best Practices

### Pull Request Guidelines
- Write meaningful commit messages following conventional commits
- Include tests for new features
- Update documentation when necessary
- Ensure all CI checks pass before merging

### Branch Strategy
- Use feature branches for new development
- Keep `develop` branch stable
- Use `main` branch for production-ready code
- Delete feature branches after merging

### Security Best Practices
- Never commit API keys or secrets to the repository
- Use environment variables for sensitive data
- Regularly rotate API keys
- Monitor for security vulnerabilities