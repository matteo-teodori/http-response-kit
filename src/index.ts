/**
 * HTTP Response Kit
 * Framework-agnostic HTTP error & response standardization for Node.js.
 *
 * Entry point: `createResponseKit()` - every kit is an isolated formatter
 * with its own configuration (no global state).
 *
 * Framework adapters are available as subpath exports:
 * - `http-response-kit/express`
 * - `http-response-kit/fastify`
 * - `http-response-kit/koa`
 * - `http-response-kit/hono`
 * - `http-response-kit/schemas` (JSON Schema / OpenAPI components)
 *
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export type {
    HttpErrorInfo,
    HttpErrorOptions,
    HttpErrorLike,
    HttpSuccessInfo,
    SuccessResponseConfig,
    ErrorResponseConfig,
    KitConfig,
    ResponseCasing,
    ResponseFormat,
    SuccessResponse,
    ErrorResponse,
    ProblemDetails,
    ProblemOptions,
    ValidationIssue,
    PaginationInput,
    PaginationMeta,
    CursorPaginationInput,
    CatalogEntry,
} from './types';

// ============================================================================
// Status Codes
// ============================================================================

export {
    HttpClientErrorCode,
    HttpServerErrorCode,
    HttpErrorCode,
    HttpSuccessCode,
    HttpRedirectCode,
    HttpInfoCode,
} from './constants/status-codes';

// ============================================================================
// Definitions
// ============================================================================

export {
    HttpErrorDefinitions,
    getErrorDefinition,
} from './constants/error-definitions';

export {
    HttpSuccessDefinitions,
    HttpRedirectDefinitions,
    HttpInfoDefinitions,
    getSuccessDefinition,
} from './constants/success-definitions';

// ============================================================================
// Errors
// ============================================================================

export { HttpError } from './errors/HttpError';
export { createErrorCatalog, type CatalogFactory } from './errors/catalog';
export { mapSystemError, SystemErrorStatusMap } from './errors/system-errors';

// ============================================================================
// Response formatting (the kit)
// ============================================================================

export { ResponseKit, createResponseKit, isSuccessResponse, isErrorResponse } from './kit';

// ============================================================================
// Bound API (kit + adapters, impossible to misconfigure)
// ============================================================================

export { createApi } from './api';
export type { BoundApi, BoundAdapterOptions } from './api';

// ============================================================================
// RFC 9457 Problem Details
// ============================================================================

export { PROBLEM_CONTENT_TYPE, toProblem, isProblemDetails } from './responses/problem';
