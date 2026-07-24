# http-response-kit Specification

**Spec version: 1.1** (independent from any implementation's package version)

This document defines the language-agnostic contract implemented by
http-response-kit. Any implementation, in any language, that produces the
outputs defined here and passes the [conformance vectors](vectors/vectors.json)
may claim conformance with "http-response-kit spec v1".

The key words MUST, MUST NOT, SHOULD and MAY are to be interpreted as
described in RFC 2119.

## 1. Scope

The spec covers the wire format of API responses (success and error), the
security semantics of error exposure, stable error codes, structured
validation errors, RFC 9457 output, system/socket error mapping, pagination
metadata, and key casing. It does not prescribe language API shape
(classes vs functions), logging, or framework integration.

## 2. Success envelope

```json
{
  "success": true,
  "status_code": 200,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "request_id": "req-1",
  "data": {},
  "message": "optional",
  "metadata": {}
}
```

- `success` MUST be the boolean `true`; `status_code` MUST be the integer HTTP status.
- `timestamp` (ISO 8601 UTC) MUST be included by default and MUST be omittable via configuration.
- `data`, `message`, `metadata`, `request_id` MUST be omitted when absent (never `null`).
- For statuses 204, 205 and 304 the `data` member MUST be omitted even if provided.
  These statuses carry no HTTP message body: the transport layer MUST send them
  without a body (e.g. `res.status(204).end()`), regardless of what the formatter
  returns. The formatter is body-shape only; whether a body is transmitted is the
  caller's/adapter's responsibility.

## 3. Error envelope

```json
{
  "success": false,
  "status_code": 404,
  "error": {
    "type": "not_found",
    "title": "Not Found",
    "message": "client-safe message",
    "code": "USER_NOT_FOUND",
    "details": "generic status description",
    "errors": [{ "field": "email", "message": "...", "code": "..." }]
  },
  "retry_after": 30,
  "metadata": {},
  "request_id": "req-1"
}
```

- `error.type` MUST be the lowercase snake_case identifier of the HTTP status
  (e.g. `not_found`, `internal_server_error`); `error.title` the canonical
  reason phrase. The full registry of `type`/`title`/`details` per status is
  normative and defined by the reference definitions tables.
- `error.code` (optional) is a stable, application-defined machine-readable
  code. Implementations MUST NOT place it anywhere else (e.g. metadata).
- `retry_after` (seconds) MUST be present when the error carries retry
  semantics, and implementations SHOULD also emit the `Retry-After` HTTP header.
- Core members (`success`, `status_code`, `error`, `timestamp`, `metadata`,
  `retry_after`, `request_id`) MUST be protected from override by
  user-supplied additional fields.

## 4. Exposure and sanitization (security)

Every error has an `expose` property: default `true` for 4xx, `false` for 5xx.

- When `expose` is false, the outgoing `error.message` MUST be replaced by the
  generic status description (or a configured per-status custom message) and
  `metadata` MUST be omitted. The original message MUST remain available to
  the server for logging.
- Stack traces and cause chains MUST only be serialized in development mode,
  in dedicated members (`error.stack`, `error.causes`).
- Wrapping an unknown error into a 5xx MUST default to `expose: false`.
- `expose: true` on a 5xx MUST be an explicit opt-in.

## 5. Custom default messages

A configuration MAY define per-status default messages. They apply at
serialization time: they replace the message when the error carries the
default description, and replace the generic text for sanitized 5xx. An
explicit message on an exposable error always wins. A message-resolver hook
(i18n), when configured, has the highest priority.

## 6. Validation errors

Structured validation issues use the shape
`{ "field": string, "message": string, "code"?: string }` serialized as
`error.errors` (and top-level `errors` in RFC 9457 output). Default status 422.
Implementations MUST NOT concatenate field errors into a message string.

## 7. RFC 9457 Problem Details output

Implementations MUST be able to emit RFC 9457 bodies with
`Content-Type: application/problem+json`:

- `type`: `about:blank`, or `<configured base URI>/<error.type>`;
- `title`, `status`: as in section 3; `detail`: the exposure-checked message;
- extensions: `code`, `errors`, `request_id`, plus arbitrary members that
  MUST NOT override reserved ones.

## 8. System / socket error mapping

Recognized platform error codes MUST map to gateway-semantics statuses, with
the code preserved as `error.code` and exposure forced to false:

| Codes | Status |
|---|---|
| ECONNREFUSED, ECONNRESET, ECONNABORTED, EPIPE, EHOSTUNREACH, ENETUNREACH, ENETDOWN, ENOTFOUND, EPROTO, TLS cert errors, UND_ERR_SOCKET/DESTROYED/CLOSED | 502 |
| ETIMEDOUT, ESOCKETTIMEDOUT, UND_ERR_CONNECT/HEADERS/BODY_TIMEOUT | 504 |
| EAI_AGAIN, EMFILE, ENFILE, ENOBUFS | 503 |

The lookup MUST traverse nested error causes (bounded depth) so wrapped
failures (e.g. `fetch failed`) are recognized.

## 9. Pagination

Offset: `metadata.pagination = { page, limit, total, total_pages, has_next, has_prev }`.
Inputs MUST be normalized uniformly before serialization so a hostile or
malformed value can never reach the client contract: `page` clamped to an
integer ≥ 1, `limit` to an integer ≥ 1 (avoids division by zero), `total` to an
integer ≥ 0; non-integer values are floored. *(Since spec v1.1; v1.0 mandated
clamping only for `limit`.)*
Cursor: `metadata.pagination = { next_cursor?, prev_cursor?, limit?, total?, has_next, has_prev }`
where `has_next`/`has_prev` reflect cursor presence.

## 10. Key casing

Default output casing is snake_case. Implementations MAY offer camelCase
output; when enabled it MUST apply to top-level members and pagination keys
consistently.

## 11. Conformance

An implementation conforms to spec v1 if, for every case in
[`vectors/vectors.json`](vectors/vectors.json), given the case `config` and
`input` it produces exactly the `expected` object (deep equality; member
order irrelevant). Vectors disable timestamps for determinism; timestamp
behavior is covered by section 2 prose. The reference implementation
(TypeScript) replays these vectors in its own test suite.

## 12. Versioning

The spec follows its own semantic versioning. Additive, backward-compatible
clarifications bump the minor; any change to required output is a new major.
