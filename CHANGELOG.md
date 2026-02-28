# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-02-28

### Added
- **`HttpError.details` Property**: Error instances now expose the original definition description via `error.details`, accessible even when a custom message overrides the default.
- **`ErrorResponse.error.stack` Field**: Stack traces are now stored in a dedicated `error.stack` field, separate from `error.details`, so semantic descriptions and debug info coexist.
- **`ErrorResponse.retry_after` Type**: The `retry_after` field is now explicitly declared in the `ErrorResponse` interface for full TypeScript autocompletion.
- **`HttpError.fromStatus()` Method**: Semantic alias for `new HttpError(code)` — creates an error directly from a status code with optional options.
- **`PaginationInput` & `PaginationMeta` Types**: Exported named interfaces for paginated response input and metadata, improving consumer-side type safety.
- **Input Validation**: `HttpError` constructor now throws a `RangeError` for status codes outside the 400–599 range, preventing silent misuse.
- **`fromError` Validation**: `HttpError.fromError()` now validates `fallbackCode` is within 400–599, throwing a clear `RangeError` if not.
- **Division-by-Zero Guard**: `HttpResponse.paginated()` safely handles `limit: 0` by clamping to `1`, avoiding `Infinity` in `total_pages`.
- **Test Suite**: Comprehensive `vitest` suite with 44 tests covering core classes, edge cases, configuration integration, and definition consistency.

### Changed
- **Status Code Fidelity**: `getErrorDefinition` and `getSuccessDefinition` rigorously preserve custom, unmapped status codes (e.g., `499`, `299`) and dynamically build definitions.
- **Structural Integrity Protection**: `HttpResponse.error()` now protects `retry_after` in addition to `success`, `error`, `status_code`, `timestamp`, and `metadata` from `additionalFields` override.
- **Constructor Typing**: `HttpError` constructor now accepts `HttpClientErrorCode | HttpServerErrorCode | number` for better IntelliSense.
- **Deep Merge for `customMessages`**: `configure()` now incrementally merges `customMessages` instead of replacing the entire object, so multiple calls preserve previous entries.
- **Lazy `isDevelopment` Detection**: `process.env.NODE_ENV` is now evaluated at call time instead of at module import, ensuring consistency across environments and test runners.
- **No-Body Status Codes**: `HttpResponse.success()` now excludes `data` for `304 Not Modified` alongside `204` and `205`, in compliance with HTTP specifications.
- **`toJSON()` Includes `details`**: `HttpError.toJSON()` now serializes the `details` property for complete error representation.
- **`getConfig()` Returns `Readonly`**: `getConfig()` now returns `Readonly<LibraryConfig>` to signal immutability of the returned snapshot.
- **Immutable Definitions**: All definition tables (`HttpErrorDefinitions`, `HttpSuccessDefinitions`, etc.) are now frozen with `Object.freeze` and typed with `as const`.


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
