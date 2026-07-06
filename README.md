<p align="center">
  <img src="https://raw.githubusercontent.com/matteo-teodori/http-response-kit/main/logo.png" alt="http-response-kit logo" width="300" />
</p>

> 🚀 Framework-agnostic HTTP error & response standardization for Node.js — secure by default, RFC 9457 ready.

[![CI](https://github.com/matteo-teodori/http-response-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/matteo-teodori/http-response-kit/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/http-response-kit.svg)](https://www.npmjs.com/package/http-response-kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Secure by default** — 5xx error messages are never leaked to clients unless explicitly exposed (`expose` flag, à la industry best practice)
- ✅ **RFC 9457 Problem Details** — first-class `application/problem+json` support (`toProblemDetails()`, `format: 'problem'`)
- ✅ **Domain error catalogs** — stable machine-readable codes (`USER_NOT_FOUND`) decoupled from HTTP status
- ✅ **Structured validation errors** — standard `errors: [{ field, message, code }]` shape
- ✅ **Zero global state** — every `createResponseKit()` is an isolated instance; safe for multi-tenant / multi-package setups
- ✅ **Framework adapters** — Express, Fastify, Koa, Hono via subpath exports (still zero dependencies)
- ✅ **Socket/system error mapping** — ECONNREFUSED, ETIMEDOUT, DNS and undici/fetch failures automatically become the correct 502/503/504
- ✅ **Correlation IDs** — `request_id` support end-to-end, header extraction in adapters
- ✅ **HTTP header helpers** — `Retry-After`, `WWW-Authenticate`, custom headers via `getHeaders()`
- ✅ **Offset & cursor pagination**, i18n message resolver, metadata sanitizer hook
- ✅ **JSON Schema / OpenAPI 3.1 components** — `http-response-kit/schemas` for contract testing
- ✅ **Complete HTTP status codes**, TypeScript-first, ESM & CommonJS, zero dependencies
- ✅ **Agent-ready** — ships an installable Agent Skill (`npx skills add matteo-teodori/http-response-kit`) so AI coding agents follow the project conventions

## Installation

```bash
npm install http-response-kit
```

Requires Node.js >= 18.

## Quick Start

One entry point: `createResponseKit()`. Every kit is an isolated formatter that
owns its configuration — the library has **no global mutable state**.

```typescript
import { createResponseKit, HttpError } from 'http-response-kit';

const api = createResponseKit(); // sane defaults, configure only what you need

// Throw HTTP errors anywhere in your code
throw HttpError.notFound('User not found');
throw HttpError.badRequest('Invalid email format');
throw new HttpError(429, { message: 'Slow down!', retryAfter: 60 });

// Structured validation errors
throw HttpError.validation([
  { field: 'email', message: 'Invalid email format', code: 'invalid_format' },
]);

// Format success responses (typed with generics)
interface User { id: number; name: string }
const response = api.ok<User>({ id: 1, name: 'John' }, 'User retrieved');
// { success: true, status_code: 200, data: User, message: '...' }

// Format error responses
const errorResponse = api.error(HttpError.notFound('User not found'));
// { success: false, status_code: 404, error: { type: 'not_found', message: '...', ... } }
```

## Security model (important)

`HttpError` carries an `expose` flag: `true` for 4xx, **`false` for 5xx by default**.
When an error is not exposable, serialization replaces the message with the generic
status description and omits `metadata` — so internal details (DB errors, connection
strings, stack info) never reach clients. The original message stays on the instance
for logging.

```typescript
const err = HttpError.fromError(new Error('ECONNREFUSED db:5432'));
err.message;                     // 'ECONNREFUSED db:5432'  → for your logs
api.error(err).error.message;    // 'An unexpected error occurred on the server.'

// Explicit opt-in when a 5xx message IS meant for clients:
throw new HttpError(503, { message: 'Maintenance until 17:00 UTC', expose: true });
```

Stack traces and cause chains are only serialized in development mode.

## RFC 9457 Problem Details

Emit standards-compliant `application/problem+json` bodies:

```typescript
import { PROBLEM_CONTENT_TYPE } from 'http-response-kit';

const problem = api.problem(HttpError.notFound('User not found'), {
  typeBase: 'https://errors.example.com',
  instance: '/users/42',
  requestId: 'req-123',
});
// {
//   type: 'https://errors.example.com/not_found',
//   title: 'Not Found',
//   status: 404,
//   detail: 'User not found',
//   instance: '/users/42',
//   request_id: 'req-123'
// }

res.status(problem.status).set('Content-Type', PROBLEM_CONTENT_TYPE).json(problem);
```

Or switch the whole output to Problem Details (adapters honor it automatically):

```typescript
const api = createResponseKit({ format: 'problem', problemTypeBase: 'https://errors.example.com' });
```

## Socket & system errors

`HttpError.fromError()` (and therefore every adapter) recognizes Node.js
system errors — including the undici codes thrown by Node 18+ `fetch`, even
when buried in the `cause` chain — and maps them to the semantically correct
status instead of a generic 500:

| Cause | Status |
|-------|--------|
| `ECONNREFUSED`, `ECONNRESET`, `EPIPE`, `ENOTFOUND`, `EHOSTUNREACH`, TLS failures | 502 Bad Gateway |
| `ETIMEDOUT`, `UND_ERR_CONNECT_TIMEOUT`, `UND_ERR_HEADERS_TIMEOUT` | 504 Gateway Timeout |
| `EAI_AGAIN`, `EMFILE`, `ENOBUFS` | 503 Service Unavailable |

```typescript
try {
  await fetch('http://upstream.internal/api');
} catch (err) {
  throw HttpError.fromError(err);
  // -> 502, error.code: 'ECONNREFUSED', client sees only the generic message,
  //    full "connect ECONNREFUSED 10.0.0.5:80" stays on the instance for logs
}
```

The mapping (`SystemErrorStatusMap`) and the standalone `mapSystemError()` are
exported if you need custom logic.

## Framework adapters

Zero-dependency adapters via subpath exports:

```typescript
// Express
import { errorHandler, notFoundHandler } from 'http-response-kit/express';
app.use(notFoundHandler());
app.use(errorHandler({ onError: (err, requestId) => logger.error({ err, requestId }) }));

// Fastify (maps AJV validation errors to structured issues automatically)
import { fastifyErrorHandler, fastifyNotFoundHandler } from 'http-response-kit/fastify';
app.setErrorHandler(fastifyErrorHandler());
app.setNotFoundHandler(fastifyNotFoundHandler());

// Koa (register FIRST)
import { koaErrorHandler } from 'http-response-kit/koa';
app.use(koaErrorHandler());

// Hono
import { honoErrorHandler } from 'http-response-kit/hono';
app.onError(honoErrorHandler());
```

Every adapter: sets error headers (`Retry-After`, ...), extracts `x-request-id`
(configurable) and echoes it as `request_id`, supports an `onError` logging hook,
and emits Problem Details when `format: 'problem'` is configured.

## Configuration

Each kit owns its configuration — two packages or tenants in the same process can
never step on each other:

```typescript
import { createResponseKit } from 'http-response-kit';

const kit = createResponseKit({
  isDevelopment: process.env.NODE_ENV === 'development',
  casing: 'camel',                 // statusCode / retryAfter instead of snake_case
  format: 'problem',
  problemTypeBase: 'https://errors.example.com',
  messageResolver: (err) => i18n.t(`errors.${err.type}`),   // i18n hook
  metadataSanitizer: (m) => omit(m, ['password', 'token']), // PII/secrets filter
});

kit.ok(user);
kit.error(HttpError.notFound(), { requestId: req.id });
```

## Domain error catalog

Stable application-level error codes, independent from HTTP status:

```typescript
import { createErrorCatalog } from 'http-response-kit';

export const Errors = createErrorCatalog({
  USER_NOT_FOUND:     { status: 404, message: 'User does not exist' },
  PLAN_LIMIT_REACHED: { status: 402, message: 'Upgrade your plan' },
  GATEWAY_DOWN:       { status: 502 }, // 5xx → not exposed by default
});

throw Errors.USER_NOT_FOUND();
// response: { error: { type: 'not_found', code: 'USER_NOT_FOUND', ... } }
// problem:  { code: 'USER_NOT_FOUND', ... }
```

## Validation errors

```typescript
throw HttpError.validation([
  { field: 'email', message: 'Invalid email format', code: 'invalid_format' },
  { field: 'age', message: 'Must be >= 18', code: 'too_small' },
]);
// → 422 with error.errors: [{ field, message, code }] (also in Problem Details)
```

## HTTP headers

```typescript
const err = new HttpError(401, {
  headers: { 'WWW-Authenticate': 'Bearer realm="api"' },
});
err.getHeaders(); // { 'WWW-Authenticate': 'Bearer realm="api"' }

HttpError.tooManyRequests('Slow down', 30).getHeaders(); // { 'Retry-After': '30' }
```

Adapters set these headers automatically.

## Pagination

```typescript
// Offset-based
api.paginated(users, { page: 2, limit: 20, total: 105 });
// metadata.pagination: { page, limit, total, total_pages, has_next, has_prev }

// Cursor-based
api.paginatedCursor(users, { nextCursor: 'eyJpZCI6NDJ9', limit: 20 });
// metadata.pagination: { next_cursor, limit, has_next, has_prev }
```

## Request correlation

```typescript
api.success({ data: user, requestId: req.headers['x-request-id'] });
api.error(err, { requestId: req.headers['x-request-id'] });
// → responses include request_id; adapters do this automatically
```

## JSON Schema & OpenAPI

```typescript
import {
  successResponseSchema,
  errorResponseSchema,
  problemDetailsSchema,
  openApiComponents,
} from 'http-response-kit/schemas';

// contract testing, gateway validation, or:
const spec = { openapi: '3.1.0', /* ... */ components: openApiComponents };
```

## Configuration reference

```typescript
createResponseKit({
  isDevelopment: false,                   // stack traces + cause chains in responses
  includeTimestamp: true,                 // ISO timestamp on every response
  format: 'standard',                     // 'standard' | 'problem' (RFC 9457)
  casing: 'snake',                        // 'snake' | 'camel' output keys
  problemTypeBase: undefined,             // base URI for problem `type`
  exposeServerErrors: false,              // never enable in production
  customMessages: { 404: 'Not here' },    // default messages per status code
  messageResolver: (err) => undefined,    // i18n hook
  metadataSanitizer: (m) => m,            // strip PII/secrets
  responseTransformer: (r) => r,          // last-mile shape transformer
});
```

`kit.configure(partial)` merges further settings into that instance only.

## Usage with Express (manual, without adapter)

```typescript
const api = createResponseKit();

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await findUser(req.params.id);
    if (!user) throw HttpError.notFound('User not found');
    res.json(api.ok(user));
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  const error = HttpError.fromError(err);
  res.status(error.code).json(api.error(error));
});
```

## Migrating from 1.x

2.0.0 is a clean break with a definitive API. What changed:

1. **`HttpResponse` and `configure()` are gone.** Create a kit once and use it everywhere: `const api = createResponseKit(config)`. All `HttpResponse.x()` statics exist as `api.x()` with identical signatures; `isSuccess`/`isError` are now the standalone `isSuccessResponse`/`isErrorResponse`.
2. **5xx messages are sanitized by default.** If a server-error message must reach clients, set `expose: true` on that error.
3. **`metadata` is omitted for non-exposable errors.**
4. **`customMessages` moved to the kit** and act as per-status default messages at serialization time.
5. `HttpError.fromStatus()` removed — use `new HttpError(code, options)`.
6. `engines.node` is now `>= 18`; `cause` is the native ES2022 `Error.cause`.

## API Reference

Full status-code tables (1xx–5xx), enums (`HttpErrorCode`, `HttpSuccessCode`, ...),
and definitions are exported and documented via TSDoc — your editor's IntelliSense
shows the complete reference. Key entry points:

| Export | Purpose |
|--------|---------|
| `createResponseKit()` | THE entry point: isolated formatter instances (`ok`, `error`, `problem`, `paginated`, ...) |
| `HttpError` | Error class + 40 factory methods + `validation()`, `fromError()`, `getHeaders()`, `toProblemDetails()` |
| `createErrorCatalog()` | Typed domain error factories with stable codes |
| `isSuccessResponse()` / `isErrorResponse()` | Response type guards |
| `PROBLEM_CONTENT_TYPE`, `toProblem()`, `isProblemDetails()` | RFC 9457 helpers |
| `http-response-kit/{express,fastify,koa,hono}` | Framework adapters |
| `http-response-kit/schemas` | JSON Schema / OpenAPI 3.1 components |

## Using with AI agents

The repo ships an [Agent Skill](skills/http-response-kit/SKILL.md) that teaches
coding agents (Claude Code, Cursor, and any SKILL.md-compatible tool) the
project conventions: kit-only API, `expose` security semantics, error catalogs,
structured validation, RFC 9457 mode and the framework adapters.

Install it in your project:

```bash
npx skills add matteo-teodori/http-response-kit
```

Benchmarked effect: on refactoring/integration tasks, agents *without* the
skill tend to hallucinate the library API (invented error classes, removed
v1 statics, hand-rolled problem+json); with the skill they follow the v2
conventions correctly. In our eval suite the assertion pass rate went from
15% to 100%.

Machine-readable response contracts are also available for validation and
OpenAPI tooling via `http-response-kit/schemas`.

## Contributing & Security

See [CONTRIBUTING.md](CONTRIBUTING