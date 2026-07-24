/**
 * HTTP Response Kit - Type Definitions
 * @module types
 */

// ============================================================================
// Error Types
// ============================================================================

/**
 * Information structure for HTTP errors
 */
export interface HttpErrorInfo {
    /** Lowercase identifier for the error type */
    type: string;
    /** Human-readable title */
    title: string;
    /** HTTP status code */
    code: number;
    /** Default error description */
    details: string;
    /** Optional retry-after time in seconds */
    retryAfter?: number;
    /** Optional resolution suggestion */
    resolution?: string;
}

/**
 * A single validation issue, used for structured 422/400 responses.
 * Mirrors the common `errors[]` extension of RFC 9457.
 */
export interface ValidationIssue {
    /** The field/path that failed validation (e.g. "email", "items[0].qty") */
    field: string;
    /** Human-readable description of the issue */
    message: string;
    /** Optional stable machine-readable code (e.g. "too_short") */
    code?: string;
}

/**
 * Configuration options for HttpError
 */
export interface HttpErrorOptions {
    /** Custom error message */
    message?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Original error cause (also set as the native ES2022 `Error.cause`) */
    cause?: Error;
    /**
     * Retry-after hint: a non-negative integer number of seconds, or an absolute
     * `Date` (serialized as an HTTP-date in the `Retry-After` header). Validated
     * at construction — RFC 9110 §10.2.3.
     */
    retryAfter?: number | Date;
    /**
     * Whether the error message is safe to expose to clients.
     * Defaults to `true` for 4xx and `false` for 5xx (security best practice:
     * internal server error messages are never leaked unless explicitly allowed).
     */
    expose?: boolean;
    /**
     * Stable application-level error code, independent from the HTTP status
     * (e.g. "USER_NOT_FOUND", "ERR-1042"). Serialized as `error.code`.
     */
    errorCode?: string;
    /** Structured validation issues (serialized as `error.errors`) */
    validationErrors?: ValidationIssue[];
    /** Extra HTTP headers to send with the error (merged into `getHeaders()`) */
    headers?: Record<string, string>;
    /** RFC 9457 `instance`: URI identifying this specific occurrence */
    instance?: string;
}

// ============================================================================
// Success Types
// ============================================================================

/**
 * Information structure for HTTP success responses
 */
export interface HttpSuccessInfo {
    /** HTTP status code */
    code: number;
    /** Description of the status */
    description: string;
}

/**
 * Configuration for success responses
 */
export interface SuccessResponseConfig<T = unknown> {
    /** Response data payload */
    data?: T;
    /** Custom success message */
    message?: string;
    /** HTTP status code (default: 200) */
    statusCode?: number;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Correlation/request id echoed as `request_id` */
    requestId?: string;
}

/**
 * Configuration for error responses
 */
export interface ErrorResponseConfig {
    /** Include stack trace in response (overrides dev-mode default) */
    includeStack?: boolean;
    /** Additional fields to include */
    additionalFields?: Record<string, unknown>;
    /** Fallback status code for unknown errors */
    fallbackCode?: number;
    /** Correlation/request id echoed as `request_id` */
    requestId?: string;
    /** RFC 9457 `instance` override for this response */
    instance?: string;
    /** Force-expose (or hide) the error message regardless of `error.expose` */
    expose?: boolean;
}

// ============================================================================
// Library Configuration
// ============================================================================

/** Output key casing for generated responses */
export type ResponseCasing = 'snake' | 'camel';

/** Output format: proprietary envelope or RFC 9457 Problem Details */
export type ResponseFormat = 'standard' | 'problem';

/**
 * Per-instance kit configuration (there is no global configuration:
 * every `createResponseKit()` call owns an isolated copy of this).
 */
export interface KitConfig {
    /** Enable development mode (includes stack traces) */
    isDevelopment?: boolean;
    /** Include timestamp in responses (default: true) */
    includeTimestamp?: boolean;
    /** Custom default messages per error code */
    customMessages?: Partial<Record<number, string>>;
    /**
     * Custom response transformer (applied last). Prefer returning a new object
     * over mutating the argument in place: it is given a clone, so if it throws
     * the kit safely falls back to the un-transformed response.
     */
    responseTransformer?: (response: Record<string, unknown>) => Record<string, unknown>;
    /**
     * Error output format for the framework adapters (default: 'standard').
     * 'problem' makes the adapters emit RFC 9457 `application/problem+json`.
     * It does not change `kit.error()` (always the envelope); use `kit.problem()`
     * for a Problem Details body directly.
     */
    format?: ResponseFormat;
    /** Key casing of generated responses (default: 'snake') */
    casing?: ResponseCasing;
    /**
     * Base URI used to build RFC 9457 `type` URIs
     * (e.g. "https://errors.example.com" -> "https://errors.example.com/not_found").
     * Defaults to "about:blank" semantics when unset.
     */
    problemTypeBase?: string;
    /**
     * Message resolver hook (i18n / localization).
     * Return a string to override the outgoing message, or undefined to keep it.
     */
    messageResolver?: (error: HttpErrorLike) => string | undefined;
    /**
     * Sanitizer applied to metadata before serialization
     * (strip PII, secrets, internal fields...).
     */
    metadataSanitizer?: (metadata: Record<string, unknown>) => Record<string, unknown>;
    /**
     * Expose 5xx error messages to clients by default (default: false).
     * Strongly discouraged in production.
     */
    exposeServerErrors?: boolean;
    /**
     * Fallback source for the correlation id when a `requestId` is not passed
     * explicitly to `success()` / `error()` / `problem()`. Wire it to an
     * `AsyncLocalStorage` store (see `http-response-kit/context`) to propagate
     * the id automatically across every response — success and error alike.
     */
    requestIdProvider?: () => string | undefined;
    /**
     * Notified when a user hook (`messageResolver`, `metadataSanitizer`,
     * `responseTransformer`, `requestIdProvider`) throws. The kit always falls
     * back to safe default behavior; this hook only surfaces the failure for
     * logging. It must not throw (a throwing reporter is swallowed).
     */
    onHookError?: (hook: string, error: unknown) => void;
}

/**
 * Minimal structural view of HttpError used in config hooks
 * (avoids circular type imports).
 */
export interface HttpErrorLike {
    code: number;
    type: string;
    title: string;
    message: string;
    errorCode?: string;
    metadata?: Record<string, unknown>;
}

// ============================================================================
// Response Types
// ============================================================================

/**
 * Standard success response structure.
 * The index signature `[key: string]: unknown` allows additional fields via
 * `additionalFields`, but extra properties will be typed as `unknown` at compile time.
 */
export interface SuccessResponse<T = unknown> {
    success: true;
    status_code: number;
    timestamp?: string;
    request_id?: string;
    data?: T;
    message?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Standard error response structure.
 * The index signature `[key: string]: unknown` allows additional fields via
 * `additionalFields`, but extra properties will be typed as `unknown` at compile time.
 */
export interface ErrorResponse {
    success: false;
    status_code: number;
    timestamp?: string;
    request_id?: string;
    retry_after?: number;
    error: {
        type: string;
        title: string;
        message: string;
        code?: string;
        details?: string;
        errors?: ValidationIssue[];
        stack?: string;
        causes?: string[];
    };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

// ============================================================================
// RFC 9457 Problem Details
// ============================================================================

/**
 * RFC 9457 (obsoletes RFC 7807) Problem Details object.
 * Serve with `Content-Type: application/problem+json`.
 */
export interface ProblemDetails {
    /** URI reference identifying the problem type (default "about:blank") */
    type: string;
    /** Short human-readable summary of the problem type */
    title: string;
    /** HTTP status code */
    status: number;
    /** Human-readable explanation specific to this occurrence */
    detail?: string;
    /** URI reference identifying this specific occurrence */
    instance?: string;
    /** Extension: stable application error code */
    code?: string;
    /** Extension: validation issues */
    errors?: ValidationIssue[];
    /** Extension: correlation/request id */
    request_id?: string;
    /** Extension members */
    [key: string]: unknown;
}

/** Options for building a Problem Details object */
export interface ProblemOptions {
    /** Base URI for the `type` member (overrides config) */
    typeBase?: string;
    /** `instance` member */
    instance?: string;
    /** Correlation/request id */
    requestId?: string;
    /** Extra extension members */
    extensions?: Record<string, unknown>;
    /** Force-expose (or hide) the error message */
    expose?: boolean;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Input parameters for offset-based paginated responses
 */
export interface PaginationInput {
    /** Current page number */
    page: number;
    /** Items per page */
    limit: number;
    /** Total number of items */
    total: number;
    /** Optional pre-computed total pages (overrides auto-calculation) */
    totalPages?: number;
}

/**
 * Pagination metadata included in paginated responses
 */
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

/**
 * Input parameters for cursor-based paginated responses
 */
export interface CursorPaginationInput {
    /** Cursor pointing to the next page (absent/undefined = no next page) */
    nextCursor?: string;
    /** Cursor pointing to the previous page */
    prevCursor?: string;
    /** Items per page */
    limit?: number;
    /** Optional total count, when known */
    total?: number;
}

// ============================================================================
// Error Catalog Types
// ============================================================================

/** Definition of a single domain error in a catalog */
export interface CatalogEntry {
    /** HTTP status code (e.g. 404) */
    status: number;
    /** Default client-facing message */
    message?: string;
    /** Optional title override */
    title?: string;
    /** Whether the message is exposable (defaults to status < 500) */
    expose?: boolean;
    /** Default metadata */
    metadata?: Record<string, unknown>;
}
