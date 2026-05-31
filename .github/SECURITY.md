# Security Policy

## Supported Versions

| Version  | Supported          |
| -------- | ------------------ |
| Latest   | :white_check_mark: |
| < Latest | :x:                |

Only the latest release on `main` receives security updates. We recommend always running the most recent version.

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, use one of the following methods:

1. **GitHub Security Advisories (preferred):**
   Navigate to the [Security Advisories](../../security/advisories/new) tab and create a new private advisory. This allows us to collaborate on a fix before public disclosure.

2. **Email:**
   Send details to the repository owner listed in `package.json`. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Affected versions
   - Potential impact

## Response Timeline

| Stage                        | Target                 |
| ---------------------------- | ---------------------- |
| Acknowledgment               | 48 hours               |
| Initial assessment           | 5 business days        |
| Patch release (critical)     | 7 days                 |
| Patch release (high)         | 14 days                |
| Patch release (moderate/low) | Next scheduled release |

## Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- Injection vulnerabilities (SQL, XSS, command injection)
- Sensitive data exposure (credentials, PII leaks)
- Server-side request forgery (SSRF)
- Insecure direct object references
- Security misconfigurations in default deployment

The following are **out of scope**:

- Issues in development-only dependencies
- Vulnerabilities requiring physical access
- Social engineering attacks
- Denial of service (unless trivially exploitable)

## Security Measures

This project implements the following security controls:

- **CI/CD**: Automated security scanning via CodeQL, TruffleHog, npm audit, and a custom security scanner (see `scripts/security-scan.js`)
- **Dependencies**: Dependabot monitors for vulnerable dependencies with auto-merge for patches
- **Runtime**: CSP headers with nonce-based script loading, CSRF protection, rate limiting
- **Authentication**: NextAuth.js with short-lived JWT sessions

For operational security details, see [docs/SECURITY.md](docs/SECURITY.md).

## Disclosure Policy

We follow coordinated disclosure. Once a fix is available, we will:

1. Release a patched version
2. Publish a GitHub Security Advisory
3. Credit the reporter (unless anonymity is requested)
