# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability

Please **do not** open a public issue for security vulnerabilities.

Report privately via [GitHub Security Advisories](https://github.com/matteo-teodori/http-response-kit/security/advisories/new).
You can expect an acknowledgement within 72 hours and a coordinated disclosure timeline.

## Security design of this library

- **5xx messages are never exposed to clients by default** (`expose: false`): internal error details (DB errors, connection strings, stack info) stay server-side.
- Stack traces and cause chains are serialized **only** in development mode.
- `metadata` is omitted for non-exposable errors and can be filtered via the `metadataSanitizer` hook.
- Core response fields (`success`, `status_code`, ...) are protected from override via `additionalFields`.
