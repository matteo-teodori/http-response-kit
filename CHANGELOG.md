# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-06

### Added

- **HttpError class** with 35+ factory methods for all HTTP error codes (400-511)
  - Client errors (4xx): `badRequest()`, `unauthorized()`, `forbidden()`, `notFound()`, `conflict()`, `tooManyRequests()`, and more
  - Server errors (5xx): `internalServerError()`, `badGateway()`, `serviceUnavailable()`, and more
  - Utility methods: `fromError()`, `isHttpError()`, `isClientError()`, `isServerError()`
  - Support for custom messages, metadata, and retry-after headers

- **HttpResponse class** for consistent response formatting
  - Success methods: `success()`, `ok()`, `created()`, `accepted()`, `noContent()`, `partialContent()`
  - Error method: `error()`, `fromError()`
  - Pagination helper: `paginated()`
  - Type guards: `isSuccess()`, `isError()`

- **Complete HTTP status code enums**
  - `HttpSuccessCode` (2xx)
  - `HttpClientErrorCode` (4xx)
  - `HttpServerErrorCode` (5xx)
  - `HttpRedirectCode` (3xx)
  - `HttpInfoCode` (1xx)

- **Global configuration system**
  - `configure()` for library-wide settings
  - Development mode with stack traces
  - Timestamp toggle
  - Custom default messages per status code
  - Response transformer for custom formatting

- **Full TypeScript support**
  - Complete type definitions
  - Exported interfaces for all structures
  - Dual ESM/CommonJS builds

- **Documentation**
  - Comprehensive README with examples
  - Example usage file
  - Express.js integration patterns
