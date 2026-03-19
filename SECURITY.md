# Security Policy

## Scope

RenderScope is a static website, a Python CLI tool, and an npm component library. It does not operate servers, store user credentials, or process sensitive data.

The security scope covers:
- **Web app:** Cross-site scripting (XSS) vulnerabilities in rendered content
- **Python CLI:** Code execution risks in benchmark runners, dependency vulnerabilities
- **npm package:** XSS in rendered components, dependency vulnerabilities
- **Data files:** Injection of malicious content in renderer JSON data

## Supported Versions

| Package | Supported |
|---------|-----------|
| Web App (latest deployment) | Yes |
| Python CLI (latest PyPI release) | Yes |
| npm Package (latest npm release) | Yes |
| Older versions | No |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT open a public GitHub issue.**
2. Email **security@renderscope.dev** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. You will receive an acknowledgment within **48 hours**.
4. We will work with you to understand and address the issue before any public disclosure.

## Security Practices

- Dependencies are kept up to date via Dependabot.
- All PR contributions are reviewed before merge.
- The web app is statically generated — no server-side code execution in production.
- JSON data files are validated against strict schemas before acceptance.

Thank you for helping keep RenderScope safe.
