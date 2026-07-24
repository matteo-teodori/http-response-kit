# http-response-kit - API quick reference

## createResponseKit(config) / KitConfig

| Option | Default | Purpose |
|---|---|---|
| `isDevelopment` | `NODE_ENV === 'development'` | stack traces + cause chains in error bodies |
| `includeTimestamp` | `true` | ISO timestamp on every response |
| `format` | `'standard'` | `'problem'` = RFC 9457 bodies from adapters/`error()` |
| `casing` | `'snake'` | `'camel'` converts output keys (statusCode, retryAfter...) |
| `problemTypeBase` | - | base URI for problem `type` (`<base>/<error.type>`) |
| `exposeServerErrors` | `false` | expose 5xx messages (avoid in production) |
| `customMessages` | `{}` | per-status default messages, applied at serialization |
| `messageResolver` | - | `(err) => string \| undefined` - i18n/override hook |
| `metadataSanitizer` | - | strip PII/secrets from metadata before output |
| `responseTransformer` | - | last-mile shape transformer |
| `requestIdProvider` | - | `() => string \| undefined` fallback request id (e.g. AsyncLocalStorage) |
| `onHookError` | - | `(hook, err) => void` notified when a user hook throws (kit falls back safely) |

`kit.configure(partial)` merges into the instance. `kit.getConfig()` returns a snapshot.
User hooks are resilient: if one throws, the kit falls back to defaults (never a 500) and calls `onHookError`.
`kit.error()` always returns the standard envelope; `kit.problem()` always returns RFC 9457. `format: 'problem'` only selects which one the adapters emit (it does not change `error()`'s shape).

## createApi(config)

`createApi(config)` returns `{ kit, express, fastify, koa, hono }` with every adapter
pre-bound to `kit` (impossible to misconfigure casing/format). Prefer it over importing
adapters separately. `BoundApi`/`BoundAdapterOptions` are exported types.

## Kit methods

- `success<T>({ data?, message?, statusCode?, metadata?, requestId? })`
- `ok / created / accepted / partialContent (data?, message?)`, `noContent()`, `notModified()`
- `error(httpError, { includeStack?, additionalFields?, requestId?, expose? })`
- `fromError(unknown, { fallbackCode?, ...same as error })` - wraps anything
- `problem(unknown, { typeBase?, instance?, requestId?, extensions?, expose? })` -> RFC 9457 object
- `paginated(data[], { page, limit, total, totalPages? }, message?)`
- `paginatedCursor(data[], { nextCursor?, prevCursor?, limit?, total? }, message?)`
- Type guards (standalone exports): `isSuccessResponse(r)`, `isErrorResponse(r)`

## HttpError

Constructor: `new HttpError(status, options)` with options:
`message, metadata, cause, retryAfter, expose, errorCode, validationErrors, headers, instance`.

- Factories for every 4xx/5xx: `HttpError.badRequest/unauthorized/forbidden/notFound/conflict/unprocessableEntity/tooManyRequests(msg, retryAfter?)/internalServerError/badGateway/serviceUnavailable(msg, retryAfter?)/gatewayTimeout/...`
- `HttpError.validation(issues[], message?, status = 422)` - issues: `{ field, message, code? }`
- `HttpError.fromError(unknown, fallbackCode = 500)` - passthrough for HttpError; maps
  system/socket errors (see below); otherwise wraps with `expose: fallback < 500`
- `HttpError.isHttpError(x)`, `err.isClientError()`, `err.isServerError()`
- `err.expose` (4xx true / 5xx false by default), `err.safeMessage`
- `err.getHeaders()` -> `{ 'Retry-After': ... , ...custom headers }`
- `err.toProblemDetails({ typeBase?, instance?, requestId?, extensions?, expose? })`
- `err.getCauseChain()` -> `string[]` for logging
- `err.toJSON()` - full detail, for LOGGING ONLY (contains unsanitized message)

## createErrorCatalog

```typescript
const Errors = createErrorCatalog({
  KEY: { status: number, message?: string, expose?: boolean, metadata?: {...} },
});
Errors.KEY()                    // default message
Errors.KEY('override message')  // custom message
Errors.KEY(undefined, { metadata: {...}, retryAfter: 30 })
```
Key becomes `errorCode` -> serialized as `error.code` / problem `code`.

## System error mapping (automatic in fromError)

`SystemErrorStatusMap` (exported, frozen): ECONNREFUSED/ECONNRESET/EPIPE/ENOTFOUND/
EHOSTUNREACH/EPROTO -> 502; ETIMEDOUT/ESOCKETTIMEDOUT/UND_ERR_*_TIMEOUT -> 504;
EAI_AGAIN/EMFILE/ENOBUFS -> 503. Codes are found through the `cause` chain
(handles Node 18+ `fetch failed`). `mapSystemError(err)` is exported standalone.

## Adapters (subpath exports, zero deps)

Common options: `{ kit?, requestIdHeader? ('x-request-id'), onError?(err, requestId), includeStack?, problem?, validationStatus? }`
(`validationStatus`: `400 | 422`, default `422`, for framework schema-validation errors.)

- `http-response-kit/express`: `errorHandler(opts)` (register last), `notFoundHandler(message?)`, `asyncHandler(fn)` (Express 4 async safety)
- `http-response-kit/fastify`: `fastifyErrorHandler(opts)` (maps AJV `error.validation` to issues, default 422), `fastifyNotFoundHandler(opts)`
- `http-response-kit/koa`: `koaErrorHandler(opts)` (register first)
- `http-response-kit/hono`: `honoErrorHandler(opts)` (for `app.onError`)

## Schemas

`http-response-kit/schemas`: `successResponseSchema`, `errorResponseSchema`,
`problemDetailsSchema` (JSON Schema 2020-12, snake_case), `openApiComponents` (OpenAPI 3.1
`components` fragment). `schemas({ casing })` generates the set matching a kit's casing
(use `{ casing: 'camel' }` when the kit is camelCase, else the snake output violates the schema).

## Context

`http-response-kit/context`: `createRequestContext()` → `{ run(ctx, fn), get(), getRequestId() }`
(AsyncLocalStorage). Wire `getRequestId` into a kit's `requestIdProvider` for automatic
`request_id` on every success/error response.
