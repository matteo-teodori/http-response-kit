# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-06

### Added
- **RFC 9457 Problem Details**: `HttpError.toProblemDetails()`, `HttpResponse.problem()`, `toProblem()`, `isProblemDetails()`, `PROBLEM_CONTENT_TYPE`, and a `format: 'problem'` config that switches adapters to `application/problem+json` output. Configurable `problemTypeBase` for `type` URIs.
- **`expose` security flag** on `HttpError` (default: `true` for 4xx, `false` for 5xx) with `safeMessage` getter. Per-response override via `ErrorResponseConfig.expose` and global `exposeServerErrors` (discouraged).
- **Isolated instances**: `createResponseKit()` / `ResponseKit` class — per-instance configuration with zero shared state, for multi-tenant and multi-package setups. The static `HttpResponse` API now delegates to a default kit bound to the global config.
- **Domain error catalog**: `createErrorCatalog()` produces typed factories with stable `errorCode`s (serialized as `error.code` and Problem Details `code`).
- **Structured validation errors**: `HttpError.validation()` factory and `ValidationIssue` type; serialized as `error.errors` and RFC 9457 `errors` extension.
- **Framework adapters** (zero-dependency subpath exports): `http-response-kit/express` (`errorHandler`, `notFoundHandler`), `/fastify` (`fastifyErrorHandler` with automatic AJV validation mapping, `fastifyNotFoundHandler`), `/koa` (`koaErrorHandler`), `/hono` (`honoErrorHandler`). All support `onError` logging hook, request-id extraction, error headers, and Problem Details mode.
- **HTTP header support**: `HttpError.getHeaders()` (auto `Retry-After`) and `headers` option (e.g. `WWW-Authenticate`, `Allow`).
- **Correlation IDs**: `requestId` option on success/error responses, serialized as `request_id`; automatic header extraction in adapters (`x-request-id`, configurable).
- **Cursor pagination**: `HttpResponse.paginatedCursor()` / `kit.paginatedCursor()`.
- **Socket/system error mapping**: `mapSystemError()` + `SystemErrorStatusMap`, integrated in `HttpError.fromError()` — Node system errors (ECONNREFUSED, ETIMEDOUT, EAI_AGAIN, undici/fetch codes, also via `cause` chain) map to 502/503/504 with the syscall code as `errorCode`; never exposed to clients.
- **i18n hook**: `messageResolver` config for message localization/override.
- **Metadata sanitizer**: `metadataSanitizer` config hook to strip PII/secrets before serialization.
- **Output casing**: `casing: 'snake' | 'camel'` config for response keys.
- **Cause chains**: `HttpError.getCauseChain()`; serialized as `error.causes` in development mode only. `cause` is now also the native ES2022 `Error.cause`.
- **JSON Schemas / OpenAPI**: `http-response-kit/schemas` subpath with JSON Schema (2020-12) for all response shapes and ready-to-merge OpenAPI 3.1 `components`.
- **Agent Skill**: `skills/http-response-kit/` (SKILL.md + API reference) teaches AI coding agents the library conventions; installable via `npx skills add matteo-teodori/http-response-kit`. Eval-validated (assertion pass rate 15% -> 100% vs no skill).
- **Repository infrastructure**: GitHub Actions CI (Node 18/20/22 matrix + Windows), npm-provenance release workflow, ESLint (typescript-eslint flat config), coverage via V8, issue/PR templates, SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, type-level tests.

### Removed
- **BREAKING — `HttpResponse` static facade and global `configure()`/`getConfig()`/`resetConfig()`/`isDevelopment()`.** The library is now kit-only: `createResponseKit(config)` is the single entry point and every instance owns its configuration (zero global state). All former statics exist on the kit with identical signatures; `HttpResponse.isSuccess`/`isError` became the standalone `isSuccessResponse`/`isErrorResponse` type guards.
- **BREAKING — `HttpError.fromStatus()`** removed (redundant alias of `new HttpError(code, options)`).
- **BREAKING — `LibraryConfig`** type renamed to `KitConfig`.

### Changed
- **BREAKING — `customMessages`** moved from global config to the kit and now act as per-status *default* messages applied at serialization time (explicit messages still win on exposable errors; for sanitized 5xx they replace the generic description).
- **BREAKING — 5xx sanitization**: error messages of non-exposable errors (all 5xx by default, including `fromError()` wraps) are replaced with the generic status description in serialized responses, and `metadata` is omitted. Opt out per error with `expose: true`.
- **BREAKING — Node >= 18** (`engines` bumped from >= 16; Node 16 is EOL).
- `tsup` build now emits six entry points (core + 4 adapters + schemas) with sourcemaps and treeshaking; `sideEffects: false` added for bundlers.
- `package.json` exports map extended with subpaths; `publishConfig.provenance` enabled.
- `HttpResponse` statics now delegate to the default `ResponseKit` (behavior preserved except sanitization above).

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
