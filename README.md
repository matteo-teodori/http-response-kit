<p align="center">
  <img src="https://raw.githubusercontent.com/matteo-teodori/http-response-kit/main/logo.png" alt="http-response-kit logo" width="300" />
</p>

> 🚀 A professional HTTP error and response formatting library for Node.js

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Complete HTTP Status Codes** - All 4xx and 5xx error codes + 1xx, 2xx, 3xx
- ✅ **TypeScript First** - Full type safety and IntelliSense support
- ✅ **Factory Methods** - Convenient `HttpError.notFound()`, `HttpError.badRequest()`, etc.
- ✅ **Customizable** - Override default messages, add metadata, configure globally
- ✅ **Zero Dependencies** - Lightweight and fast
- ✅ **ESM & CommonJS** - Works everywhere

## Installation

```bash
npm install http-response-kit
```

## Quick Start

```typescript
import { HttpError, HttpResponse, configure } from 'http-response-kit';

// Throw HTTP errors
throw HttpError.notFound('User not found');
throw HttpError.badRequest('Invalid email format');
throw HttpError.unauthorized('Token expired');

// Or use status codes directly
throw new HttpError(404, { message: 'User not found' });
throw new HttpError(429, { message: 'Slow down!', retryAfter: 60 });

// Format success responses using Generics for typesafety
interface User {
  id: number;
  name: string;
}

const response = HttpResponse.success<User>({
  data: { id: 1, name: 'John' },
  message: 'User retrieved successfully'
});
// { success: true, status_code: 200, data: User, message: '...' }

// Format error responses
const error = HttpError.notFound('User not found');
const errorResponse = HttpResponse.error(error);
// { success: false, status_code: 404, error: { type: 'not_found', message: '...', details: '...', ... } }
```

## Usage with Express

```typescript
import express from 'express';
import { HttpError, HttpResponse, configure } from 'http-response-kit';

const app = express();

// Configure library
configure({
  isDevelopment: process.env.NODE_ENV === 'development',
  includeTimestamp: true,
});

// Your routes
app.get('/users/:id', async (req, res) => {
  try {
    const user = await findUser(req.params.id);
    if (!user) {
      throw HttpError.notFound('User not found');
    }
    res.json(HttpResponse.ok(user));
  } catch (err) {
    const error = HttpError.fromError(err);
    res.status(error.code).json(HttpResponse.error(error));
  }
});

// Global error handler
app.use((err, req, res, next) => {
  const error = HttpError.fromError(err);
  res.status(error.code).json(HttpResponse.error(error));
});
```

## API Reference

### HttpInfoCode (1xx Informational)

| Enum | Code | Description |
|------|------|-------------|
| `CONTINUE` | 100 | Continue with request |
| `SWITCHING_PROTOCOLS` | 101 | Switching protocols |
| `PROCESSING` | 102 | Processing request |
| `EARLY_HINTS` | 103 | Early hints |

### HttpSuccessCode (2xx Success)

| Enum | Code | Description |
|------|------|-------------|
| `OK` | 200 | Request succeeded |
| `CREATED` | 201 | Resource created |
| `ACCEPTED` | 202 | Request accepted for processing |
| `NON_AUTHORITATIVE_INFORMATION` | 203 | Non-authoritative information |
| `NO_CONTENT` | 204 | No content to return |
| `RESET_CONTENT` | 205 | Reset content |
| `PARTIAL_CONTENT` | 206 | Partial content |
| `MULTI_STATUS` | 207 | Multi-status response |
| `ALREADY_REPORTED` | 208 | Already reported |
| `IM_USED` | 226 | IM used |

### HttpRedirectCode (3xx Redirect)

| Enum | Code | Description |
|------|------|-------------|
| `MULTIPLE_CHOICES` | 300 | Multiple choices available |
| `MOVED_PERMANENTLY` | 301 | Resource moved permanently |
| `FOUND` | 302 | Resource found at different URI |
| `SEE_OTHER` | 303 | See other resource |
| `NOT_MODIFIED` | 304 | Resource not modified |
| `USE_PROXY` | 305 | Use proxy |
| `TEMPORARY_REDIRECT` | 307 | Temporary redirect |
| `PERMANENT_REDIRECT` | 308 | Permanent redirect |

### HttpError

#### Factory Methods (4xx Client Errors)

| Method | Code | Description |
|--------|------|-------------|
| `HttpError.badRequest()` | 400 | Bad Request |
| `HttpError.unauthorized()` | 401 | Unauthorized |
| `HttpError.paymentRequired()` | 402 | Payment Required |
| `HttpError.forbidden()` | 403 | Forbidden |
| `HttpError.notFound()` | 404 | Not Found |
| `HttpError.methodNotAllowed()` | 405 | Method Not Allowed |
| `HttpError.notAcceptable()` | 406 | Not Acceptable |
| `HttpError.proxyAuthenticationRequired()` | 407 | Proxy Auth Required |
| `HttpError.requestTimeout()` | 408 | Request Timeout |
| `HttpError.conflict()` | 409 | Conflict |
| `HttpError.gone()` | 410 | Gone |
| `HttpError.lengthRequired()` | 411 | Length Required |
| `HttpError.preconditionFailed()` | 412 | Precondition Failed |
| `HttpError.payloadTooLarge()` | 413 | Payload Too Large |
| `HttpError.uriTooLong()` | 414 | URI Too Long |
| `HttpError.unsupportedMediaType()` | 415 | Unsupported Media Type |
| `HttpError.rangeNotSatisfiable()` | 416 | Range Not Satisfiable |
| `HttpError.expectationFailed()` | 417 | Expectation Failed |
| `HttpError.imATeapot()` | 418 | I'm a Teapot |
| `HttpError.misdirectedRequest()` | 421 | Misdirected Request |
| `HttpError.unprocessableEntity()` | 422 | Unprocessable Entity |
| `HttpError.locked()` | 423 | Locked |
| `HttpError.failedDependency()` | 424 | Failed Dependency |
| `HttpError.tooEarly()` | 425 | Too Early |
| `HttpError.upgradeRequired()` | 426 | Upgrade Required |
| `HttpError.preconditionRequired()` | 428 | Precondition Required |
| `HttpError.tooManyRequests()` | 429 | Too Many Requests |
| `HttpError.requestHeaderFieldsTooLarge()` | 431 | Header Fields Too Large |
| `HttpError.unavailableForLegalReasons()` | 451 | Unavailable For Legal Reasons |

#### Factory Methods (5xx Server Errors)

| Method | Code | Description |
|--------|------|-------------|
| `HttpError.internalServerError()` | 500 | Internal Server Error |
| `HttpError.notImplemented()` | 501 | Not Implemented |
| `HttpError.badGateway()` | 502 | Bad Gateway |
| `HttpError.serviceUnavailable()` | 503 | Service Unavailable |
| `HttpError.gatewayTimeout()` | 504 | Gateway Timeout |
| `HttpError.httpVersionNotSupported()` | 505 | HTTP Version Not Supported |
| `HttpError.variantAlsoNegotiates()` | 506 | Variant Also Negotiates |
| `HttpError.insufficientStorage()` | 507 | Insufficient Storage |
| `HttpError.loopDetected()` | 508 | Loop Detected |
| `HttpError.bandwidthLimitExceeded()` | 509 | Bandwidth Limit Exceeded |
| `HttpError.notExtended()` | 510 | Not Extended |
| `HttpError.networkAuthenticationRequired()` | 511 | Network Auth Required |

#### Utility Methods

```typescript
// Create error from status code (semantic alias for new HttpError(code))
const error = HttpError.fromStatus(503);
const errorWithMsg = HttpError.fromStatus(404, { message: 'Not here' });

// Convert any error to HttpError
const httpError = HttpError.fromError(unknownError);

// Check if error is HttpError
if (HttpError.isHttpError(error)) { ... }

// Check error category
error.isClientError();  // 4xx
error.isServerError();  // 5xx

// Add metadata
throw HttpError.badRequest('Validation failed', {
  fields: ['email', 'password']
});
```

### HttpResponse

```typescript
// Success responses using Generics for Type Safety
HttpResponse.success<User>({ data, message, statusCode, metadata });
HttpResponse.ok<User>(data, message);
HttpResponse.created<User>(data, message);
HttpResponse.accepted<User>(data, message);
HttpResponse.noContent();

// Error responses
HttpResponse.error(httpError, { includeStack: true });
HttpResponse.fromError(anyError, { fallbackCode: 503 });

// Paginated responses
HttpResponse.paginated(items, {
  page: 1,
  limit: 10,
  total: 100
});
```

### Configuration

```typescript
import { configure } from 'http-response-kit';

configure({
  // Enable stack traces in error responses (auto-detects from NODE_ENV if omitted)
  isDevelopment: true,
  
  // Include timestamps in all responses
  includeTimestamp: true,
  
  // Custom default messages per status code
  customMessages: {
    404: 'Oops! This page went on vacation 🏝️',
    500: 'Well, this is embarrassing... 🤖'
  },  // Note: multiple configure() calls are incrementally merged
  
  // Custom response transformer
  responseTransformer: (response) => ({
    ...response,
    api_version: 'v1'
  })
});
```

## Status Code Enums

```typescript
import { 
  HttpSuccessCode,
  HttpClientErrorCode,
  HttpServerErrorCode,
  HttpRedirectCode,
  HttpInfoCode 
} from 'http-response-kit';

// Use enums for type safety
HttpSuccessCode.OK                          // 200
HttpSuccessCode.CREATED                     // 201
HttpSuccessCode.NO_CONTENT                  // 204
HttpClientErrorCode.NOT_FOUND               // 404
HttpServerErrorCode.INTERNAL_SERVER_ERROR   // 500
```

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## License

MIT © [Matteo Teodori](https://github.com/matteo-teodori)
