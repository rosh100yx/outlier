# Security Policy

## Supported Versions

Currently, only the latest release of `outlier` is supported with security updates. 

| Version | Supported          |
| ------- | ------------------ |
| >= 0.3.x| :white_check_mark: |
| < 0.3.0 | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability within Outlier, please send an e-mail to our security team at [rosh.100yx@gmail.com]. 

We take all security reports seriously and will:
1. Acknowledge receipt of your vulnerability report within 48 hours.
2. Provide an estimated timeline for a fix.
3. Notify you when the vulnerability is patched.

We ask that you do not share the vulnerability publicly until a patch is released to ensure the safety of our users.

## Scope of Security Audits
Please note that `outlier` operates as a **local-first** terminal tool. It does not phone home, nor does it send data to cloud APIs. 
Security reports should primarily focus on:
- Local privilege escalation
- Unsafe file execution or path traversal in log parsing
- Malicious injection via `.git` commit signatures or configuration files
