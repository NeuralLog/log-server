# Contributing to NeuralLog Neurallog-log-server

Thank you for your interest in contributing to NeuralLog Neurallog-log-server! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](https://github.com/NeuralLog/docs/blob/main/CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

- **Ensure the bug was not already reported** by searching on GitHub under [Issues](https://github.com/NeuralLog/log-server/issues).
- If you're unable to find an open issue addressing the problem, [open a new one](https://github.com/NeuralLog/log-server/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** or an **executable test case** demonstrating the expected behavior that is not occurring.

### Suggesting Enhancements

- **Ensure the enhancement was not already suggested** by searching on GitHub under [Issues](https://github.com/NeuralLog/log-server/issues).
- If you're unable to find an open issue for your enhancement, [open a new one](https://github.com/NeuralLog/log-server/issues/new). Be sure to include a **title and clear description**, as much relevant information as possible, and a **code sample** if applicable.

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies** by running `npm install`.
3. **Make your changes** and add tests if applicable.
4. **Run the tests** to ensure they pass.
5. **Update the documentation** to reflect any changes.
6. **Submit a pull request** to the `main` branch.

## Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/log-server.git
   cd log-server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Coding Guidelines

### Code Style

We use ESLint and Prettier to enforce a consistent code style. Please ensure your code follows these guidelines:

- Run `npm run lint` to check for style issues.
- Run `npm run format` to automatically fix style issues.

### Testing

- Write tests for all new features and bug fixes.
- Ensure all tests pass before submitting a pull request.
- Run tests with `npm test`.

### Documentation

- Update the documentation to reflect any changes.
- Document all public APIs.
- Use JSDoc comments for all public methods and classes.

## Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to the build process or auxiliary tools and libraries

Example:
```
feat: add support for authentication
```

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a build.
2. Update the README.md or documentation with details of changes to the interface, this includes new environment variables, exposed ports, useful file locations, and container parameters.
3. The pull request will be merged once you have the sign-off of at least one maintainer.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
