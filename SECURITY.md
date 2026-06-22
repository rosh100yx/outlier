# Security Policy

## Supported Versions
Currently, only the latest minor version of `outlier` is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 0.4.x   | :white_check_mark: |
| < 0.4.0 | :x:                |

## Reporting a Vulnerability

Outlier is designed as a **Zero-Trust, Local-First** framework. We consider any unintended external network request, data exfiltration, or telemetry leakage to be a critical P0 security vulnerability.

If you discover a vulnerability, please do NOT open a public issue. Instead, email the maintainers directly. 

### What we consider a vulnerability:
1. Any code that sends `.git` history or `~/.claude` session logs to an external server.
2. Any code execution vulnerabilities triggered by parsing the `Co-Authored-By` strings in Git history.
3. Supply chain attacks or malicious dependencies introduced in `package.json`.

We will respond within 48 hours and issue a patch immediately.
