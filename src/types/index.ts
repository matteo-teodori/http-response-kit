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
 * Configuration options for HttpError
 */
export interface HttpErrorOptions {
    /** Custom error message */
    message?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
    /** Original error cause */
    cause?: Error;
    /** Retry-after time in seconds */
    retryAfter?: number;
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
}

/**
 * Configuration for error responses
 */
export interface ErrorResponseConfig {
    /** Include stack trace in response */
    includeStack?: boolean;
    /** Additional fields to include */
    additionalFields?: Record<string, unknown>;
    /** Fallback status code for unknown errors */
    fallbackCode?: number;
}

// ============================================================================
// Library Configuration
// ============================================================================

/**
 * Global library configuration
 */
export interface LibraryConfig {
    /** Enable development mode (includes stack traces) */
    isDevelopment?: boolean;
    /** Include timestamp in responses */
    includeTimestamp?: boolean;
    /** Custom default messages per error code */
    customMessages?: Partial<Record<number, string>>;
    /** Custom response transformer */
    responseTransformer?: (response: Record<string, unknown>) => Record<string, unknown>;
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
    retry_after?: number;
    error: {
        type: string;
        title: string;
        message: string;
        details?: string;
        stack?: string;
    };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

// ============================================================================
// Pagination Types
// ============================================================================

/**
 * Input parameters for paginated responses
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
