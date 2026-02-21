# Contributing to Engram

Thank you for your interest in contributing to Engram! This document provides guidelines and information for contributors.

## Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow:

- Be respectful and inclusive
- Focus on what is best for the community
- Show empathy towards other community members
- Be collaborative
- Be mindful of your language and behavior

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
1. Check the [existing issues](https://github.com/Terronex-dev/engram/issues) to avoid duplicates
2. Test with the latest version to ensure the bug still exists
3. Gather relevant information (version, environment, steps to reproduce)

When submitting a bug report, include:
- **Clear title** summarizing the issue
- **Description** of what happened vs. what you expected
- **Steps to reproduce** the issue
- **Environment details** (Node.js version, OS, etc.)
- **Code samples** if applicable
- **Error messages** and stack traces

### Suggesting Features

We welcome feature suggestions! Before submitting:
1. Check if the feature already exists or is planned
2. Consider if it fits the project's goals and scope
3. Think about the impact on existing users

Feature requests should include:
- **Clear use case** and motivation
- **Detailed description** of the proposed feature
- **Examples** of how it would be used
- **Alternatives considered**

### Contributing Code

#### Development Setup

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/engram.git
   cd engram
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

#### Development Workflow

1. **Make your changes** following our coding standards
2. **Add tests** for new functionality
3. **Run the test suite**:
   ```bash
   npm test
   ```
4. **Run linting**:
   ```bash
   npm run lint
   npm run lint:fix  # Auto-fix issues
   ```
5. **Build the project**:
   ```bash
   npm run build
   ```
6. **Commit your changes** with a clear message:
   ```bash
   git commit -m "feat: add hierarchical search optimization"
   ```

#### Pull Request Process

1. **Update documentation** if needed (README, API docs, etc.)
2. **Add tests** for new features or bug fixes
3. **Ensure all tests pass** and coverage remains high
4. **Update CHANGELOG.md** with your changes
5. **Submit a pull request** with:
   - Clear title and description
   - Reference to related issues
   - Screenshots/examples if applicable

#### Commit Message Format

We use conventional commits for clear history:

```
type(scope): short description

[optional longer description]

[optional footer]
```

Types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation updates
- `style`: Formatting changes
- `refactor`: Code restructuring
- `test`: Test additions/updates
- `chore`: Maintenance tasks

Examples:
```
feat(search): add temporal decay scoring
fix(io): handle corrupted file headers gracefully
docs(api): update MemoryTree documentation
test(core): add edge cases for node deletion
```

## Coding Standards

### TypeScript Guidelines

- Use **strict TypeScript** configuration
- **Export interfaces** and types that might be used by consumers
- **Document public APIs** with JSDoc comments
- **Prefer composition** over inheritance
- **Use meaningful variable names** and avoid abbreviations

### Code Style

- **Indentation**: 2 spaces
- **Line length**: 100 characters maximum
- **Semicolons**: Required
- **Quotes**: Single quotes for strings
- **Trailing commas**: Required in multi-line structures

### Example:

```typescript
/**
 * Searches memory nodes using semantic similarity and temporal decay.
 * 
 * @param nodes - Array of memory nodes to search
 * @param options - Search configuration options
 * @returns Ranked search results with relevance scores
 */
export function searchNodes(
  nodes: MemoryNode[],
  options: SearchOptions
): SearchResult[] {
  const {
    query,
    topK = 10,
    minScore = 0.1,
    timeDecay = 0.1,
    filters,
  } = options;

  // Implementation...
}
```

### Testing Guidelines

- **Write tests first** (TDD approach encouraged)
- **Test public APIs** thoroughly
- **Include edge cases** and error conditions
- **Use descriptive test names**
- **Maintain >95% code coverage**

Example test structure:
```typescript
describe('MemoryTree', () => {
  describe('add', () => {
    it('should add node to empty tree', () => {
      const tree = new MemoryTree();
      const node = createTestNode();
      
      const id = tree.add(node);
      
      expect(tree.get(id)).toEqual(node);
      expect(tree.size()).toBe(1);
    });

    it('should throw error for duplicate node IDs', () => {
      const tree = new MemoryTree();
      const node = createTestNode();
      
      tree.add(node);
      
      expect(() => tree.add(node)).toThrow('Node with ID already exists');
    });
  });
});
```

## Project Structure

```
engram/
├── src/
│   ├── core.ts          # Main MemoryTree class and utilities
│   ├── types.ts         # TypeScript interfaces and types
│   ├── io.ts           # File I/O operations
│   └── index.ts        # Public API exports
├── tests/
│   ├── core.test.ts
│   ├── io.test.ts
│   └── fixtures/       # Test data files
├── docs/
│   ├── api/            # Generated API documentation
│   └── guides/         # User guides and tutorials
├── examples/
│   ├── basic-usage.ts
│   └── advanced/       # Complex examples
└── dist/               # Built output (not in git)
```

## Documentation

### API Documentation

- Use **JSDoc comments** for all public functions and classes
- Include **parameter descriptions** and **return types**
- Provide **usage examples** for complex APIs
- Document **error conditions** and **edge cases**

### User Documentation

- Keep **README.md** up to date with new features
- Add **examples** to the `examples/` directory
- Update **guides** for significant changes
- Maintain **accuracy** and **clarity**

## Performance Considerations

### Memory Management
- **Avoid memory leaks** in long-running processes
- **Use streaming** for large datasets
- **Implement lazy loading** where appropriate
- **Profile performance** impact of changes

### Binary Format
- **Maintain backward compatibility** when possible
- **Document format changes** in migration guides
- **Consider file size** impact of new features
- **Test with large files** (multi-GB)

## Security Guidelines

### Encryption & Privacy
- **Never log sensitive data** (passwords, private keys)
- **Use secure defaults** for cryptographic operations
- **Validate input data** to prevent injection attacks
- **Follow least privilege** principle

### Dependencies
- **Keep dependencies updated** for security patches
- **Audit new dependencies** for vulnerabilities
- **Minimize dependency count** when possible
- **Use reputable packages** from known authors

## Release Process

1. **Version bump** in package.json following semver
2. **Update CHANGELOG.md** with new features and fixes
3. **Create git tag** for the release
4. **Build and test** the release candidate
5. **Publish to npm** (maintainers only)
6. **Create GitHub release** with release notes

## Getting Help

- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bugs and feature requests  
- **Email**: terronex.dev@gmail.com for private matters
- **Documentation**: Check the wiki and API docs first

## Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

Thank you for contributing to Engram!