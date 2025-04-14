# Development Guide

This document provides information for developers working on NeuralLog Neurallog-log-server.

## Development Environment Setup

### Prerequisites

- Node.js 22 or later
- npm 10 or later
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/NeuralLog/log-server.git
   cd log-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Run tests:
   ```bash
   npm test
   ```

## Project Structure

```
log-server/
├── src/                  # Source code
│   ├── index.ts          # Main entry point
│   ├── types.ts          # Type definitions
│   ├── utils/            # Utility functions
│   └── components/       # Component implementations
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── docs/                 # Documentation
├── examples/             # Example code
└── scripts/              # Build and utility scripts
```

## Build Process

The build process uses TypeScript and follows these steps:

1. Clean the output directory:
   ```bash
   npm run clean
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Build the package:
   ```bash
   npm run build
   ```

## Testing

### Unit Tests

Unit tests are located in the `tests/unit` directory and use Jest as the test framework.

To run unit tests:

```bash
npm run test:unit
```

### Integration Tests

Integration tests are located in the `tests/integration` directory and test the component's interaction with other components.

To run integration tests:

```bash
npm run test:integration
```

### Code Coverage

To generate a code coverage report:

```bash
npm run test:coverage
```

The report will be available in the `coverage` directory.

## Coding Standards

### TypeScript Guidelines

- Use TypeScript for all new code
- Follow the [TypeScript Style Guide](https://github.com/basarat/typescript-book/blob/master/docs/styleguide/styleguide.md)
- Use strict mode (`"strict": true` in tsconfig.json)
- Document all public APIs with JSDoc comments

### Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for at least 80% code coverage
- Use descriptive test names that explain what is being tested
- Follow the AAA pattern (Arrange, Act, Assert)

### Git Workflow

1. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them:
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

3. Push your branch to GitHub:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a pull request on GitHub

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: Code changes that neither fix a bug nor add a feature
- `perf`: Performance improvements
- `test`: Adding or correcting tests
- `chore`: Changes to the build process or auxiliary tools

## Debugging

### Logging

The component uses a structured logging system. To enable debug logs:

```javascript
const component = new Component({
  logLevel: 'debug'
});
```

### Troubleshooting

Common development issues and solutions:

1. **TypeScript Compilation Errors**:
   - Check your TypeScript version (`npm list typescript`)
   - Ensure your code follows the TypeScript configuration

2. **Test Failures**:
   - Check if you're running the latest dependencies
   - Ensure your environment is properly set up

3. **Build Issues**:
   - Clear the `node_modules` directory and reinstall dependencies
   - Check for conflicting dependencies

## Publishing

To publish a new version:

1. Update the version in `package.json`:
   ```bash
   npm version patch # or minor, or major
   ```

2. Build the package:
   ```bash
   npm run build
   ```

3. Publish to the registry:
   ```bash
   npm publish
   ```

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NeuralLog Architecture](https://neurallog.github.io/docs/architecture/overview)
