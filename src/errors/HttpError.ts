/**
 * HTTP Response Kit - HttpError Class
 * @module errors/HttpError
 */

import type { HttpErrorOptions, ProblemDetails, ProblemOptions, ValidationIssue } from '../types';
import { type HttpClientErrorCode, type HttpServerErrorCode } from '../constants/status-codes';
import { getErrorDefinition } from '../constants/error-definitions';
import { mapSystemError } from './system-errors';

/**
 * Cross-realm brand used to recognize `HttpError` instances WITHOUT `instanceof`.
 *
 * `instanceof` compares class identity, which breaks whenever two copies of this
 * class coexist — e.g. the CommonJS build inlines the class into every entry
 * point (tsup cannot code-split CJS), or an ESM app dynamically `require()`s the
 * CJS build, or two versions of the package end up in the dependency tree.
 * `Symbol.for()` returns the same symbol across every copy and realm, so a plain
 * property check works everywhere. See `isHttpError`.
 */
const HTTP_ERROR_BRAND: unique symbol = Symbol.for('http-response-kit.HttpError');

/** RFC 9110 forbids CR/LF (and NUL) in header field names and values. */
function assertSafeHeaders(headers: Record<string, string>): void {
    for (const [name, value] of Object.entries(headers)) {
        if (/[\r\n\0]/.test(name) || /[\r\n\0]/.test(String(value))) {
            throw new TypeError(
                `Invalid HTTP header ${JSON.stringify(name)}: names and values must not contain CR, LF or NUL characters.`
            );
        }
    }
}

/**
 * Take a frozen, validated copy of caller-supplied headers.
 *
 * Each value is coerced to a primitive string EXACTLY ONCE while building the
 * copy, then validated, then frozen. Coercing to a primitive is what makes the
 * validated value identical to the stored value: it closes time-of-check /
 * time-of-use gaps where a property getter — or a value object with a mutating
 * `toString()` — could return `"safe"` during validation and a CRLF payload on
 * a later read. The frozen container also blocks post-construction mutation.
 */
function sanitizeHeaders(headers: Record<string, string> | undefined): Record<string, string> | undefined {
    if (headers === undefined) {
        return undefined;
    }
    const copy: Record<string, string> = {};
    for (const [name, value] of Object.entries(headers)) {
        // String(value) invokes any getter/toString once and stores the result
        // as an immutable primitive — no reference to a mutable object survives.
        copy[name] = String(value);
    }
    assertSafeHeaders(copy);
    Object.freeze(copy);
    return copy;
}

/** RFC 9110 §10.2.3: Retry-After is a non-negative integer of seconds or an HTTP-date. */
function assertValidRetryAfter(retryAfter: number | Date): void {
    if (retryAfter instanceof Date) {
        if (Number.isNaN(retryAfter.getTime())) {
            throw new RangeError('Invalid retryAfter: Date is not a valid time.');
        }
        return;
    }
    if (!Number.isInteger(retryAfter) || retryAfter < 0 || retryAfter > Number.MAX_SAFE_INTEGER) {
        throw new RangeError(
            `Invalid retryAfter: ${String(retryAfter)}. Must be a non-negative integer of seconds or a Date.`
        );
    }
}

/**
 * Custom HTTP Error class that extends the native Error class.
 * Provides structured error information for HTTP responses.
 *
 * Security model: `expose` controls whether `message` may be sent to clients.
 * It defaults to `true` for 4xx and `false` for 5xx, so internal server error
 * messages are never leaked unless explicitly allowed. The full message is
 * always available on the instance for logging.
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
 * // With metadata + stable application code
 * throw new HttpError(400, {
 *   message: 'Validation failed',
 *   errorCode: 'VALIDATION_FAILED',
 *   metadata: { fields: ['email', 'password'] }
 * });
 *
 * // Using factory methods
 * throw HttpError.notFound('Resource not found');
 * throw HttpError.validation([{ field: 'email', message: 'Invalid email' }]);
 * ```
 */
export class HttpError extends Error {
    /**
     * Brand marking this object as an `HttpError` across realms and duplicate
     * copies of the class. Prefer {@link HttpError.isHttpError} over `instanceof`.
     */
    readonly [HTTP_ERROR_BRAND] = true as const;

    /** HTTP status code */
    readonly code: number;

    /** Lowercase error type identifier */
    readonly type: string;

    /** Human-readable error title */
    readonly title: string;

    /** Default error description from definition */
    readonly details: string;

    /** Additional error metadata */
    readonly metadata: Record<string, unknown> | undefined;

    /** Original error cause (also available as native `Error.cause`) */
    readonly cause: Error | undefined;

    /** Retry-after time: non-negative integer of seconds, or an HTTP-date (if applicable) */
    readonly retryAfter: number | Date | undefined;

    /** Whether `message` is safe to send to clients (4xx: true, 5xx: false by default) */
    readonly expose: boolean;

    /** Stable application-level error code (e.g. "USER_NOT_FOUND") */
    readonly errorCode: string | undefined;

    /** Structured validation issues */
    readonly validationErrors: ValidationIssue[] | undefined;

    /** Extra HTTP headers associated with this error */
    readonly headers: Record<string, string> | undefined;

    /** RFC 9457 `instance` URI for this specific occurrence */
    readonly instance: string | undefined;

    /**
     * Creates a new HttpError instance
     *
     * @param code - HTTP status code (e.g., 404, 500)
     * @param options - Optional configuration
     */
    constructor(code: HttpClientErrorCode | HttpServerErrorCode | number, options: HttpErrorOptions = {}) {
        const errorInfo = getErrorDefinition(code);
        const finalMessage = options.message ?? errorInfo.details;

        super(finalMessage);

        const retryAfter = options.retryAfter ?? errorInfo.retryAfter;
        if (retryAfter !== undefined) {
            assertValidRetryAfter(retryAfter);
        }

        this.name = 'HttpError';
        this.code = errorInfo.code;
        this.type = errorInfo.type;
        this.title = errorInfo.title;
        this.details = errorInfo.details;
        this.metadata = options.metadata;
        this.retryAfter = retryAfter;
        this.expose = options.expose ?? errorInfo.code < 500;
        this.errorCode = options.errorCode;
        this.validationErrors = options.validationErrors;
        // Frozen, validated copy (see sanitizeHeaders): closes CRLF injection via
        // post-construction mutation and via time-of-check/time-of-use getters.
        this.headers = sanitizeHeaders(options.headers);
        this.instance = options.instance;

        // Native ES2022 error cause + typed accessor
        if (options.cause !== undefined) {
            this.cause = options.cause;
        }

        // Maintains proper stack trace for where error was thrown
        if (typeof (Error as any).captureStackTrace === 'function') {
            (Error as any).captureStackTrace(this, HttpError);
        }
    }

    /**
     * The message that is safe to send to clients.
     * Falls back to the generic definition message when `expose` is false.
     */
    get safeMessage(): string {
        return this.expose ? this.message : this.details;
    }

    /**
     * HTTP headers that should accompany this error response
     * (e.g. `Retry-After` for 429/503, plus any custom headers).
     */
    getHeaders(): Record<string, string> {
        const headers: Record<string, string> = { ...this.headers };
        if (this.retryAfter !== undefined) {
            headers['Retry-After'] =
                this.retryAfter instanceof Date ? this.retryAfter.toUTCString() : String(this.retryAfter);
        }
        return headers;
    }

    /**
     * Convert error to plain object for JSON serialization.
     * Note: contains the full (non-sanitized) message - intended for logging.
     * Use `kit.error()` / `toProblemDetails()` for client output.
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            type: this.type,
            title: this.title,
            message: this.message,
            details: this.details,
            errorCode: this.errorCode,
            metadata: this.metadata,
            retryAfter: this.retryAfter,
            expose: this.expose,
            validationErrors: this.validationErrors,
        };
    }

    /**
     * Build an RFC 9457 Problem Details object for this error.
     * Serve it with `Content-Type: application/problem+json`.
     *
     * @example
     * ```ts
     * const problem = HttpError.notFound('User not found').toProblemDetails({
     *   typeBase: 'https://errors.example.com',
     *   instance: '/users/42',
     * });
     * // { type: 'https://errors.example.com/not_found', title: 'Not Found',
     * //   status: 404, detail: 'User not found', instance: '/users/42' }
     * ```
     */
    toProblemDetails(options: ProblemOptions = {}): ProblemDetails {
        const exposed = options.expose ?? this.expose;
        const problem: ProblemDetails = {
            type: options.typeBase
                ? `${options.typeBase.replace(/\/$/, '')}/${this.type}`
                : 'about:blank',
            title: this.title,
            status: this.code,
            detail: exposed ? this.message : this.details,
        };

        if (options.instance ?? this.instance) {
            problem.instance = options.instance ?? this.instance;
        }
        if (this.errorCode) {
            problem.code = this.errorCode;
        }
        if (this.validationErrors?.length) {
            problem.errors = this.validationErrors;
        }
        if (options.requestId) {
            problem.request_id = options.requestId;
        }
        if (options.extensions) {
            for (const [key, value] of Object.entries(options.extensions)) {
                if (!(key in problem)) {
                    problem[key] = value;
                }
            }
        }

        return problem;
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

    /**
     * 422 Unprocessable Entity with structured validation issues.
     *
     * @example
     * ```ts
     * throw HttpError.validation([
     *   { field: 'email', message: 'Invalid email format', code: 'invalid_format' },
     *   { field: 'age', message: 'Must be >= 18', code: 'too_small' },
     * ]);
     * ```
     */
    static validation(
        errors: ValidationIssue[],
        message = 'Validation failed',
        code: number = 422
    ): HttpError {
        return new HttpError(code, { message, validationErrors: errors, errorCode: 'VALIDATION_FAILED' });
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
    static tooManyRequests(message?: string, retryAfter?: number | Date, metadata?: Record<string, unknown>): HttpError {
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
    static serviceUnavailable(message?: string, retryAfter?: number | Date, metadata?: Record<string, unknown>): HttpError {
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
     * Create an HttpError from an unknown error.
     *
     * Security: wrapped errors are marked `expose: false` when the resulting
     * status is 5xx, so unexpected internal messages (DB errors, stack info,
     * connection strings...) are never sent to clients. The original message
     * and cause are preserved on the instance for logging.
     *
     * System/socket errors (ECONNREFUSED, ETIMEDOUT, undici fetch codes...)
     * are automatically mapped to the semantically correct 502/503/504 -
     * including codes buried in the `cause` chain (e.g. Node's
     * `fetch failed` TypeError) - with the syscall code as `errorCode`.
     */
    static fromError(error: unknown, fallbackCode = 500): HttpError {
        if (HttpError.isHttpError(error)) {
            return error;
        }

        if (fallbackCode < 400 || fallbackCode > 599) {
            throw new RangeError(
                `fallbackCode must be between 400 and 599, got ${fallbackCode}`
            );
        }

        // Recognized system/socket errors win over the generic fallback:
        // they carry more precise gateway semantics (502/503/504).
        const systemError = mapSystemError(error);
        if (systemError !== undefined) {
            return systemError;
        }

        if (error instanceof Error) {
            return new HttpError(fallbackCode, {
                message: error.message,
                cause: error,
                expose: fallbackCode < 500,
            });
        }

        return new HttpError(fallbackCode, {
            message: String(error),
            expose: fallbackCode < 500,
        });
    }

    /**
     * Check if a value is an `HttpError`.
     *
     * Uses a `Symbol.for()` brand instead of `instanceof`, so it stays correct
     * across module realms and duplicate copies of the class: CommonJS builds
     * (where the class is inlined into every entry point), ESM↔CJS interop, and
     * multiple package versions in the dependency tree all resolve correctly.
     */
    static isHttpError(error: unknown): error is HttpError {
        return (
            typeof error === 'object' &&
            error !== null &&
            (error as Record<PropertyKey, unknown>)[HTTP_ERROR_BRAND] === true
        );
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

    /**
     * Flattened chain of cause messages (most recent first).
     * Useful for structured logging; never serialized to clients in production.
     */
    getCauseChain(): string[] {
        const chain: string[] = [];
        let current: unknown = this.cause;
        let depth = 0;
        while (current instanceof Error && depth < 10) {
            chain.push(`${current.name}: ${current.message}`);
            current = (current as { cause?: unknown }).cause;
            depth++;
        }
        return chain;
    }
}
