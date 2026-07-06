---
name: http-response-kit
description: Project conventions for the http-response-kit library (standardized API responses & errors in Node.js). Use this skill whenever you are writing or modifying code in a project that imports 'http-response-kit', or whenever the user asks to add endpoints, error handling, validation errors, domain error codes, RFC 9457 / problem+json output, or to standardize API responses in Express, Fastify, Koa or Hono - even if they don't name the library explicitly but it is present in package.json.
---

# http-response-kit - conventions for agents

This library standardizes every API response and error in the project. When it is
present, response shape is NOT a per-endpoint decision: everything goes through a
`ResponseKit` instance and `HttpError`. Hand-rolled `res.json({ error: ... })`
objects break the project contract.

## The five rules

1. **One kit per app.** Create the kit once in a dedicated module and import it
   everywhere. Never create kits inside request handlers.

   ```typescript
   // src/lib/api.ts (or similar - look for an existing one before creating it!)
   import { createResponseKit } from 'http-response-kit';
   export const api = createResponseKit({
     isDevelopment: process.env.NODE_ENV === 'development',
   });
   ```

2. **Never build response envelopes by hand.** Success = `api.ok(data)`,
   `api.created(data)`, `api.success({...})`, `api.paginated(...)`. Errors =
   `throw HttpError.*` and let the framework adapter (or a single error
   middleware) format the response with `api.error(err)` / `api.fromError(err)`.

3. **Never leak 5xx internals - and don't fight the sanitizer.** 5xx messages are
   hidden from clients by default (`expose: false`); the full message stays on the
   error instance for logging. Do NOT add `expose: true` to a 5xx unless the
   message is genuinely meant for end users (e.g. a maintenance notice). Do NOT
   copy internal error text into `metadata` (metadata is also hidden on 5xx, but
   it signals confusion). System/socket errors (ECONNREFUSED, fetch failures...)
   are mapped to 502/503/504 automatically by `HttpError.fromError` - do not
   write manual `if (err.code === 'ECONNREFUSED')` branches.

4. **Domain errors live in a catalog.** When the project needs stable
   machine-readable codes (USER_NOT_FOUND, PLAN_LIMIT_REACHED...), define them
   once with `createErrorCatalog` and throw the factories. Do not scatter
   `new HttpError(404, { errorCode: '...' })` around the codebase; look for an
   existing catalog module (often `errors.ts` / `catalog.ts`) and extend it.

   ```typescript
   export const Errors = createErrorCatalog({
     ORDER_NOT_FOUND: { status: 404, message: 'Order does not exist' },
     STOCK_INSUFFICIENT: { status: 409, message: 'Not enough stock' },
   });
   // usage: throw Errors.ORDER_NOT_FOUND();  or  Errors.ORDER_NOT_FOUND('Order 42 missing')
   ```

5. **Validation errors are structured.** Use
   `HttpError.validation([{ field, message, code? }])` (422). Never stuff field
   errors into a message string - clients rely on the `error.errors` array.

## Wiring a framework (do this once, at app setup)

Each adapter handles: consistent body, error headers (Retry-After...),
`x-request-id` echo, RFC 9457 mode. Pass the project kit via `{ kit: api }`.

```typescript
// Express - register AFTER all routes
import { errorHandler, notFoundHandler } from 'http-response-kit/express';
app.use(notFoundHandler());
app.use(errorHandler({ kit: api, onError: (err, id) => logger.error({ err, requestId: id }) }));

// Fastify (also auto-maps AJV validation errors)
import { fastifyErrorHandler, fastifyNotFoundHandler } from 'http-response-kit/fastify';
app.setErrorHandler(fastifyErrorHandler({ kit: api }));
app.setNotFoundHandler(fastifyNotFoundHandler({ kit: api }));

// Koa - register FIRST
import { koaErrorHandler } from 'http-response-kit/koa';
app.use(koaErrorHandler({ kit: api }));

// Hono
import { honoErrorHandler } from 'http-response-kit/hono';
app.onError(honoErrorHandler({ kit: api }));
```

Inside handlers, after wiring: just `throw` (or `next(err)` in Express) - never
format error responses inline.

## RFC 9457 (application/problem+json)

If the user wants standards-compliant problem bodies, configure the kit - do not
build problem objects manually:

```typescript
export const api = createResponseKit({
  format: 'problem',
  problemTypeBase: 'https://errors.<company-domain>',
});
```

Adapters then emit `application/problem+json` automatically. For one-off problem
bodies use `api.problem(err, { instance, requestId })` and set the content type
to `PROBLEM_CONTENT_TYPE`.

## Response shape (for reading/parsing code)

Success: `{ success: true, status_code, timestamp?, request_id?, data?, message?, metadata? }`
Error:   `{ success: false, status_code, error: { type, title, message, code?, details?, errors? }, retry_after?, ... }`
Keys are snake_case by default; a kit configured with `casing: 'camel'` emits
camelCase. Check the kit config before asserting key names in tests.
JSON Schemas / OpenAPI 3.1 components: `import { openApiComponents } from 'http-response-kit/schemas'`.

## Anti-patterns to fix on sight

| Found in code | Replace with |
|---|---|
| `res.status(500).json({ error: err.message })` | `throw`/`next(err)` + adapter, or `api.fromError(err)` |
| `res.json({ success: true, data })` built by hand | `res.json(api.ok(data))` |
| `expose: true` on a 5xx without a clear user-facing reason | remove it; log the error instead |
| `catch (e) { throw HttpError.internalServerError(e.message) }` | `throw HttpError.fromError(e)` |
| Field errors concatenated into a message string | `HttpError.validation([...])` |
| `if (err.code === 'ECONNREFUSED') return 502...` | delete - `fromError` already maps system errors |
| `createResponseKit()` inside a handler | import the shared kit module |

## Going deeper

For the full API surface (all kit methods, HttpError options and factories,
KitConfig fields, pagination shapes), read `references/api.md` in this skill.
