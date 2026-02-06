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
export interface SuccessResponseConfig {
    /** Response data payload */
    data?: unknown;
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
 * Standard success response structure
 */
export interface SuccessResponse {
    success: true;
    status_code: number;
    timestamp?: string;
    data?: unknown;
    message?: string;
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
    success: false;
    status_code: number;
    timestamp?: string;
    error: {
        type: string;
        title: string;
        message: string;
        details?: string;
    };
    metadata?: Record<string, unknown>;
    [key: string]: unknown;
}
