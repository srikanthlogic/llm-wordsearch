# Contributing to LLM-Wordsearch

Thank you for your interest in contributing! This document outlines how to contribute to this project.

## How to Contribute

### Bug Reports

- Use the [GitHub Issues](https://github.com/srikanthlogic/llm-wordsearch/issues) page
- Include a clear description, steps to reproduce, and relevant environment details
- Include screenshots if applicable

### Feature Requests

- Open a new issue with the `feature request` label
- Describe the feature, use case, and expected behavior

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes following the coding standards
4. Run tests and ensure linting passes
5. Commit using conventional commit format
6. Push to your fork and submit a PR

## Development Setup

```bash
# Clone the repository
git clone https://github.com/srikanthlogic/llm-wordsearch.git
cd llm-wordsearch

# Install dependencies
npm install

# Set up environment variables
cp env.sample .env.local
# Add your API_KEY (see README.md for details)

# Start development server
npm run dev
```

For detailed setup instructions, see the [README.md](README.md).

## Coding Standards

- **TypeScript**: Follow existing patterns in the codebase
- **React**: Use functional components with hooks
- **Imports**: Order imports by: built-in → external → internal → parent → sibling
- **Naming**: PascalCase for components, camelCase for variables
- **ESLint**: Runs automatically; fix warnings before committing

Run linting:
```bash
npm run lint        # Fix issues automatically
npm run lint:check  # Check only
npm run type-check  # TypeScript validation
```

## Testing Requirements

All tests must pass before submitting a PR:

```bash
# Run tests once
npm run test:run

# Run with coverage
npm run test:coverage
```

The project uses Vitest with @testing-library/react. Tests are located alongside source files or in the `test/` directory.

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

### Examples

```
feat(grid): add diagonal word placement
fix(timer): reset timer when starting new game
docs(readme): update installation instructions
```

## PR Process

1. **Before submitting**:
   - Run `npm run test:run` — all tests must pass
   - Run `npm run lint:check` — no errors
   - Run `npm run type-check` — no errors

2. **PR Description**:
   - Clear title describing the change
   - Link to any related issues
   - Summary of changes and motivation

3. **Review**:
   - PRs require review before merging
   - Address feedback promptly

## Questions?

- Open an issue for bugs or feature requests
- For general questions, start a discussion

We appreciate all contributions, from bug reports to new features!