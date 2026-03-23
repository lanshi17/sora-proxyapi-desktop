# Contributing to Sora Desktop

Thank you for your interest in contributing to Sora Desktop! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Rust** (for Tauri development)
- **Git**

### Platform-Specific Requirements

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev \
  librsvg2-dev patchelf pkg-config libssl-dev
```

#### macOS
No additional dependencies required.

#### Windows
No additional dependencies required.

### Installation

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone git@github.com:your-username/sora-proxyapi-desktop.git
   cd sora-proxyapi-desktop
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run the development server:
   ```bash
   npm run tauri dev
   ```

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commits format:
- `feat: add new video preview component`
- `fix: resolve CORS error on image upload`
- `docs: update README with API examples`
- `test: add unit tests for model fetching`
- `refactor: simplify error handling in hooks`

### Code Style

- Use TypeScript strict mode
- Follow existing file naming conventions
- Write tests for new features
- Keep functions focused and small
- Use meaningful variable names

## Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Place unit tests in `tests/unit/`
- Place integration tests in `tests/integration/`
- Name test files with `.test.ts` suffix
- Use descriptive test names
- Follow AAA pattern: Arrange, Act, Assert

Example:
```typescript
describe('featureName', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Submitting Changes

1. **Create a branch**: `git checkout -b feature/my-feature`
2. **Make changes**: Write code and tests
3. **Run tests**: Ensure all tests pass
4. **Commit**: `git commit -m 'feat: add new feature'`
5. **Push**: `git push origin feature/my-feature`
6. **Create Pull Request**: Open a PR on GitHub

### Pull Request Guidelines

- Provide a clear description of changes
- Reference related issues
- Ensure CI checks pass
- Request review from maintainers
- Be responsive to feedback

## Code Review Process

1. PR is reviewed by maintainers
2. Feedback is provided
3. Changes are made if requested
4. Approved and merged by maintainer

## Reporting Issues

### Bug Reports

Include:
- Description of the bug
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (OS, browser, app version)
- Screenshots if applicable

### Feature Requests

Include:
- Description of the feature
- Use case
- Proposed implementation (optional)
- Additional context

## Project Structure

```
src/
├── app/              # Application shell
├── components/       # Shared components
├── features/         # Feature modules
│   ├── config/       # Settings
│   ├── models/       # Model fetching
│   ├── uploads/      # Image handling
│   ├── video-generation/  # Video API
│   ├── video/        # Video preview
│   └── workspace/    # Workspaces
└── lib/              # Utilities

tests/
├── unit/            # Unit tests
└── integration/     # Integration tests
```

## Questions?

Feel free to:
- Open an issue for questions
- Join discussions in existing issues
- Contact maintainers

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

Thank you for contributing!
