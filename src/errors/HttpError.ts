/**
 * HTTP Response Kit - HttpError Class
 * @module errors/HttpError
 */

import type { HttpErrorOptions } from '../types';
import { getErrorDefinition } from '../constants/error-definitions';
import { getCustomMessage } from '../config';

/**
 * Custom HTTP Error class that extends the native Error class.
 * Provides structured error information for HTTP responses.
 * 
 * @example
 * ```ts
 * // Basic usage with status code
 * throw new HttpError(404);
 * throw new HttpError(HttpErrorCode.NOT_FOUND);
 * 
 * // With custom message
 * throw new HttpError(404, { message: 'User not found' });
 * 
 * // With metadata
 * throw new HttpError(400, { 
 *   message: 'Validation failed',
 *   metadata: { fields: ['email', 'password'] }
 * });
 * 
 * // Using factory methods
 * throw HttpError.notFound('Resource not found');
 * throw HttpError.badRequest('Invalid input');
 * ```
 */
export class HttpError extends Error {
    /** HTTP status code */
    readonly code: number;

    /** Lowercase error type identifier */
    readonly type: string;

    /** Human-readable error title */
    readonly title: string;

    /** Additional error metadata */
    readonly metadata?: Record<string, unknown>;

    /** Original error cause */
    readonly cause?: Error;

    /** Retry-after time in seconds (if applicable) */
    readonly retryAfter?: number;

    /**
     * Creates a new HttpError instance
     * 
     * @param code - HTTP status code (e.g., 404, 500)
     * @param options - Optional configuration
     */
    constructor(code: number, options: HttpErrorOptions = {}) {
        const errorInfo = getErrorDefinition(code);
        const customMessage = getCustomMessage(code);
        const finalMessage = options.message ?? customMessage ?? errorInfo.details;

        super(finalMessage);

        this.name = 'HttpError';
        this.code = errorInfo.code;
        this.type = errorInfo.type;
        this.title = errorInfo.title;
        this.metadata = options.metadata;
        this.cause = options.cause;
        this.retryAfter = options.retryAfter ?? errorInfo.retryAfter;

        // Maintains proper stack trace for where error was thrown
        if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, HttpError);
        }
    }

    /**
     * Convert error to plain object for JSON serialization
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            type: this.type,
            title: this.title,
            message: this.message,
            metadata: this.metadata,
            retryAfter: this.retryAfter,
        };
    }

    // ========================================================================
    // Factory Methods - 4xx Client Errors
    // ========================================================================

    /** 400 Bad Request */
    static badRequest(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(400, { message, metadata });
    }

    /** 401 Unauthorized */
    static unauthorized(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(401, { message, metadata });
    }

    /** 402 Payment Required */
    static paymentRequired(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(402, { message, metadata });
    }

    /** 403 Forbidden */
    static forbidden(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(403, { message, metadata });
    }

    /** 404 Not Found */
    static notFound(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(404, { message, metadata });
    }

    /** 405 Method Not Allowed */
    static methodNotAllowed(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(405, { message, metadata });
    }

    /** 406 Not Acceptable */
    static notAcceptable(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(406, { message, metadata });
    }

    /** 407 Proxy Authentication Required */
    static proxyAuthenticationRequired(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(407, { message, metadata });
    }

    /** 408 Request Timeout */
    static requestTimeout(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(408, { message, metadata });
    }

    /** 409 Conflict */
    static conflict(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(409, { message, metadata });
    }

    /** 410 Gone */
    static gone(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(410, { message, metadata });
    }

    /** 411 Length Required */
    static lengthRequired(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(411, { message, metadata });
    }

    /** 412 Precondition Failed */
    static preconditionFailed(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(412, { message, metadata });
    }

    /** 413 Payload Too Large */
    static payloadTooLarge(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(413, { message, metadata });
    }

    /** 414 URI Too Long */
    static uriTooLong(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(414, { message, metadata });
    }

    /** 415 Unsupported Media Type */
    static unsupportedMediaType(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(415, { message, metadata });
    }

    /** 416 Range Not Satisfiable */
    static rangeNotSatisfiable(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(416, { message, metadata });
    }

    /** 417 Expectation Failed */
    static expectationFailed(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(417, { message, metadata });
    }

    /** 418 I'm a Teapot */
    static imATeapot(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(418, { message, metadata });
    }

    /** 421 Misdirected Request */
    static misdirectedRequest(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(421, { message, metadata });
    }

    /** 422 Unprocessable Entity */
    static unprocessableEntity(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(422, { message, metadata });
    }

    /** 423 Locked */
    static locked(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(423, { message, metadata });
    }

    /** 424 Failed Dependency */
    static failedDependency(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(424, { message, metadata });
    }

    /** 425 Too Early */
    static tooEarly(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(425, { message, metadata });
    }

    /** 426 Upgrade Required */
    static upgradeRequired(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(426, { message, metadata });
    }

    /** 428 Precondition Required */
    static preconditionRequired(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(428, { message, metadata });
    }

    /** 429 Too Many Requests */
    static tooManyRequests(message?: string, retryAfter?: number, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(429, { message, metadata, retryAfter });
    }

    /** 431 Request Header Fields Too Large */
    static requestHeaderFieldsTooLarge(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(431, { message, metadata });
    }

    /** 451 Unavailable For Legal Reasons */
    static unavailableForLegalReasons(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(451, { message, metadata });
    }

    // ========================================================================
    // Factory Methods - 5xx Server Errors
    // ========================================================================

    /** 500 Internal Server Error */
    static internalServerError(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(500, { message, metadata });
    }

    /** 501 Not Implemented */
    static notImplemented(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(501, { message, metadata });
    }

    /** 502 Bad Gateway */
    static badGateway(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(502, { message, metadata });
    }

    /** 503 Service Unavailable */
    static serviceUnavailable(message?: string, retryAfter?: number, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(503, { message, metadata, retryAfter });
    }

    /** 504 Gateway Timeout */
    static gatewayTimeout(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(504, { message, metadata });
    }

    /** 505 HTTP Version Not Supported */
    static httpVersionNotSupported(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(505, { message, metadata });
    }

    /** 506 Variant Also Negotiates */
    static variantAlsoNegotiates(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(506, { message, metadata });
    }

    /** 507 Insufficient Storage */
    static insufficientStorage(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(507, { message, metadata });
    }

    /** 508 Loop Detected */
    static loopDetected(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(508, { message, metadata });
    }

    /** 509 Bandwidth Limit Exceeded */
    static bandwidthLimitExceeded(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(509, { message, metadata });
    }

    /** 510 Not Extended */
    static notExtended(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(510, { message, metadata });
    }

    /** 511 Network Authentication Required */
    static networkAuthenticationRequired(message?: string, metadata?: Record<string, unknown>): HttpError {
        return new HttpError(511, { message, metadata });
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Create an HttpError from an unknown error
     */
    static fromError(error: unknown, fallbackCode = 500): HttpError {
        if (error instanceof HttpError) {
            return error;
        }

        if (error instanceof Error) {
            return new HttpError(fallbackCode, {
                message: error.message,
                cause: error
            });
        }

        return new HttpError(fallbackCode, {
            message: String(error)
        });
    }

    /**
     * Check if an error is an HttpError
     */
    static isHttpError(error: unknown): error is HttpError {
        return error instanceof HttpError;
    }

    /**
     * Check if error is a client error (4xx)
     */
    isClientError(): boolean {
        return this.code >= 400 && this.code < 500;
    }

    /**
     * Check if error is a server error (5xx)
     */
    isServerError(): boolean {
        return this.code >= 500 && this.code < 600;
    }
}
