# Security Policy

## Supported Versions

We actively support the following versions of Engram with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The Engram project maintainers take security vulnerabilities seriously. We appreciate your efforts to responsibly disclose your findings.

### How to Report

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please send an email to: security@terronex.dev

Include the following information:
- Type of issue (buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### Response Timeline

- **Initial Response**: We will acknowledge receipt of your report within 48 hours
- **Investigation**: We will investigate and validate the vulnerability within 7 days
- **Resolution**: We will work to resolve confirmed vulnerabilities and release patches as quickly as possible
- **Disclosure**: We will coordinate public disclosure with you after the issue is resolved

### Security Features

Engram includes several security features:

- **Encryption**: AES-256-GCM encryption with PBKDF2 key derivation (100,000 iterations, SHA-256)
- **Integrity**: Cryptographic integrity verification for all data
- **Privacy**: Local-first architecture with optional cloud sync
- **Access Control**: Hierarchical permission system for sensitive data
- **Audit Trail**: Optional logging of all memory access and modifications

### Best Practices

When using Engram in production:

1. **Encryption**: Always enable encryption for sensitive data using strong passwords
2. **Access Control**: Implement proper authentication and authorization
3. **Updates**: Keep Engram updated to the latest stable version
4. **Environment**: Use proper environment variable management for sensitive configuration
5. **Validation**: Validate all input data before processing
6. **Monitoring**: Implement monitoring for unusual access patterns

### Security Audits

Engram undergoes regular security reviews:
- Code review for all releases
- Dependency scanning for known vulnerabilities
- Static analysis security testing
- Third-party security audits for major releases

For questions about security practices, please contact: security@terronex.dev