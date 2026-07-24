/**
 * HTTP Response Kit - ResponseKit
 *
 * The single, definitive way to format responses: create an isolated kit
 * with `createResponseKit()`. Every kit owns its configuration - there is
 * no global mutable state anywhere in this library.
 *
 * @module kit
 */

import type {
    SuccessResponseConfig,
    ErrorResponseConfig,
    SuccessResponse,
    ErrorResponse,
    PaginationInput,
    CursorPaginationInput,
    KitConfig,
    ProblemDetails,
    ProblemOptions,
} from './types';
import { HttpError } from './errors/HttpError';
import { getSuccessDefinition } from './constants/success-definitions';
import { HttpSuccessCode, HttpRedirectCode } from './constants/status-codes';

/** Convert a snake_case key to camelCase */
function snakeToCamel(key: string): string {
    return key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** Floor to an integer and clamp to a minimum; non-finite inputs fall back to `min`. */
function clampInt(value: number, min: number): number {
    return Number.isFinite(value) ? Math.max(min, Math.floor(value)) : min;
}

/** Deep-clone plain objects/arrays; pass non-plain values (functions, class
 * instances, Dates...) through by reference. Never throws. */
function deepClonePlain<T>(value: T): T {
    if (Array.isArray(value)) {
        return value.map((v) => deepClonePlain(v)) as unknown as T;
    }
    if (value !== null && typeof value === 'object') {
        const proto = Object.getPrototypeOf(value);
        if (proto === Object.prototype || proto === null) {
            const out: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                out[k] = deepClonePlain(v);
            }
            return out as T;
        }
    }
    return value;
}

/**
 * Deep-clone a response before handing it to a user `responseTransformer`, so a
 * transformer that mutates in place and then throws cannot corrupt or leak the
 * fallback — including the nested `error` object (whose sanitized 5xx message
 * must never be overwritten) and `data`/`metadata`.
 *
 * `structuredClone` handles Dates/Maps/Sets but throws on non-cloneable payloads
 * (functions, class instances, ORM documents — a common `data` shape), so the
 * fallback is a real DEEP clone of the plain envelope structure, not a shallow
 * copy that would leave nested objects shared by reference.
 */
function cloneForTransform<R extends Record<string, unknown>>(response: R): R {
    try {
        return structuredClone(response);
    } catch {
        return deepClonePlain(response);
    }
}

/** Shallow-convert response keys to camelCase (plus pagination metadata) */
function camelizeResponse<R extends Record<string, unknown>>(response: R): R {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(response)) {
        out[snakeToCamel(key)] = value;
    }
    const metadata = out.metadata as Record<string, unknown> | undefined;
    if (metadata && typeof metadata === 'object' && metadata.pagination && typeof metadata.pagination === 'object') {
        const pagination: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(metadata.pagination as Record<string, unknown>)) {
            pagination[snakeToCamel(key)] = value;
        }
        out.metadata = { ...metadata, pagination };
    }
    return out as R;
}

/** Type guard: is this a success response? */
export function isSuccessResponse(response: SuccessResponse | ErrorResponse): response is SuccessResponse {
    return response.success === true;
}

/** Type guard: is this an error response? */
export function isErrorResponse(response: SuccessResponse | ErrorResponse): response is ErrorResponse {
    return response.success === false;
}

/**
 * An isolated response formatter with its own configuration.
 * Create one with {@link createResponseKit}.
 */
export class ResponseKit {
    private readonly config: KitConfig;

    constructor(config: KitConfig = {}) {
        this.config = {
            includeTimestamp: true,
            format: 'standard',
            casing: 'snake',
            exposeServerErrors: false,
            ...config,
            customMessages: { ...config.customMessages },
        };
    }

    /** Merge partial configuration into this instance */
    configure(config: Partial<KitConfig>): void {
        Object.assign(this.config, {
            ...config,
            customMessages: { ...this.config.customMessages, ...config.customMessages },
        });
    }

    /** Snapshot of the current configuration */
    getConfig(): Readonly<KitConfig> {
        return { ...this.config };
    }

    /** Whether dev mode is active (stack traces, cause chains) */
    isDevelopment(): boolean {
        return this.config.isDevelopment ?? process.env.NODE_ENV === 'development';
    }

    private finalize<R extends Record<string, unknown>>(response: R): R {
        let out: R = this.config.casing === 'camel' ? camelizeResponse(response) : response;
        const transformer = this.config.responseTransformer;
        if (transformer) {
            // A throwing user transformer must never corrupt the response shape.
            // Hand it a DEEP clone so an in-place mutation followed by a throw
            // cannot delete core fields or leak partial data (e.g. overwrite a
            // sanitized 5xx message, or mutate nested `error`/`data`) into the
            // fallback: on throw, `out` is still the pristine pre-transform response.
            try {
                out = transformer(cloneForTransform(out)) as R;
            } catch (err) {
                this.reportHookError('responseTransformer', err);
            }
        }
        return out;
    }

    /** Report a user-hook failure without ever propagating it. */
    private reportHookError(hook: string, err: unknown): void {
        try {
            this.config.onHookError?.(hook, err);
        } catch {
            /* a throwing error reporter is swallowed on purpose */
        }
    }

    /** The correlation id to use: explicit value first, then the configured provider. */
    private resolveRequestId(explicit: string | undefined): string | undefined {
        if (explicit !== undefined) return explicit;
        try {
            return this.config.requestIdProvider?.();
        } catch (err) {
            this.reportHookError('requestIdProvider', err);
            return undefined;
        }
    }

    /**
     * Resolve the outgoing client-facing message for an error.
     *
     * Priority: messageResolver > explicit message (if exposed)
     * > customMessages[code] > generic status description.
     */
    private resolveMessage(error: HttpError, exposed: boolean): string {
        let resolved: string | undefined;
        try {
            resolved = this.config.messageResolver?.(error);
        } catch (err) {
            // A throwing i18n/resolver hook must not turn a 404 into a 500:
            // fall through to the default message resolution.
            this.reportHookError('messageResolver', err);
        }
        if (resolved !== undefined) return resolved;

        const customDefault = this.config.customMessages?.[error.code];
        const hasExplicitMessage = error.message !== error.details;

        if (exposed && hasExplicitMessage) return error.message;
        return customDefault ?? error.details;
    }

    // ========================================================================
    // Success
    // ========================================================================

    /** Format a success response */
    success<T = unknown>(config: SuccessResponseConfig<T> = {}): SuccessResponse<T> {
        const { data, message, statusCode = HttpSuccessCode.OK, metadata = {}, requestId } = config;

        const successInfo = getSuccessDefinition(statusCode);

        const response: SuccessResponse<T> = {
            success: true,
            status_code: successInfo.code,
        };

        if (this.config.includeTimestamp ?? true) {
            response.timestamp = new Date().toISOString();
        }

        const resolvedRequestId = this.resolveRequestId(requestId);
        if (resolvedRequestId) {
            response.request_id = resolvedRequestId;
        }

        // Don't include data for 204 No Content, 205 Reset Content, and 304 Not Modified
        if (
            statusCode !== HttpSuccessCode.NO_CONTENT &&
            statusCode !== HttpSuccessCode.RESET_CONTENT &&
            statusCode !== HttpRedirectCode.NOT_MODIFIED
        ) {
            if (data !== null && data !== undefined) {
                response.data = data;
            }
        }

        if (message) {
            response.message = message;
        }

        if (Object.keys(metadata).length > 0) {
            response.metadata = metadata;
        }

        return this.finalize(response);
    }

    // ========================================================================
    // Error
    // ========================================================================

    /**
     * Format an error response as the standard envelope.
     *
     * `error()` always produces the proprietary envelope (typed `ErrorResponse`);
     * `problem()` always produces RFC 9457 Problem Details. The kit's `format`
     * option selects which one the framework adapters emit — it deliberately does
     * NOT change `error()`'s shape, so the return type is stable and sound (a
     * runtime-computed format cannot silently make `.error` undefined). For RFC
     * 9457 output call `problem()`, or let an adapter honor `format: 'problem'`.
     *
     * Security: when the error is not exposable (5xx by default), the outgoing
     * message falls back to the generic status description (or the configured
     * custom message for that code) and `metadata` is omitted. The original
     * message stays available on the error instance for logging.
     */
    error(error: HttpError, config: ErrorResponseConfig = {}): ErrorResponse {
        const { includeStack, additionalFields, requestId } = config;
        const cfg = this.config;
        const resolvedRequestId = this.resolveRequestId(requestId);

        const exposed =
            config.expose ??
            (error.expose || (error.isServerError() && cfg.exposeServerErrors === true));

        const response: ErrorResponse = {
            success: false,
            status_code: error.code,
            error: {
                type: error.type,
                title: error.title,
                message: this.resolveMessage(error, exposed),
            },
        };

        if (cfg.includeTimestamp ?? true) {
            response.timestamp = new Date().toISOString();
        }

        if (resolvedRequestId) {
            response.request_id = resolvedRequestId;
        }

        // Stable application-level error code
        if (error.errorCode) {
            response.error.code = error.errorCode;
        }

        // Include generic error details (always safe: comes from definitions)
        if (error.details) {
            response.error.details = error.details;
        }

        // Structured validation issues
        if (error.validationErrors?.length) {
            response.error.errors = error.validationErrors;
        }

        // Stack trace + cause chain in development mode only (separate fields)
        if (includeStack ?? this.isDevelopment()) {
            response.error.stack = error.stack;
            const causes = error.getCauseChain();
            if (causes.length > 0) {
                response.error.causes = causes;
            }
        }

        // Include retry-after (seconds) in the body. A `Date` retryAfter is
        // carried by the `Retry-After` header only (see HttpError.getHeaders).
        if (typeof error.retryAfter === 'number') {
            response.retry_after = error.retryAfter;
        }

        // Include metadata only when the error is exposable (may contain internals)
        if (error.metadata && exposed) {
            let sanitized: Record<string, unknown> | undefined = error.metadata;
            if (cfg.metadataSanitizer) {
                try {
                    sanitized = cfg.metadataSanitizer(error.metadata);
                } catch (err) {
                    // A throwing sanitizer must fail closed: omit metadata rather
                    // than risk leaking un-sanitized internals.
                    this.reportHookError('metadataSanitizer', err);
                    sanitized = undefined;
                }
            }
            if (sanitized && Object.keys(sanitized).length > 0) {
                response.metadata = sanitized;
            }
        }

        // Add any additional fields (protecting core structure)
        if (additionalFields) {
            const { success, status_code, error: _error, timestamp, metadata, retry_after, request_id, ...safeFields } = additionalFields;
            Object.assign(response, safeFields);
        }

        return this.finalize(response);
    }

    /** Format a response from any error (converts to HttpError first) */
    fromError(error: unknown, config: ErrorResponseConfig = {}): ErrorResponse {
        const httpError = HttpError.fromError(error, config.fallbackCode);
        return this.error(httpError, config);
    }

    /**
     * Build an RFC 9457 Problem Details body from any error.
     * Serve it with `Content-Type: application/problem+json`
     * (see `PROBLEM_CONTENT_TYPE`).
     */
    problem(error: unknown, options: ProblemOptions = {}): ProblemDetails {
        const httpError = HttpError.fromError(error);
        const exposed = options.expose ?? httpError.expose;

        const problemOptions: ProblemOptions = { ...options };
        const typeBase = options.typeBase ?? this.config.problemTypeBase;
        if (typeBase !== undefined) {
            problemOptions.typeBase = typeBase;
        }
        const requestId = this.resolveRequestId(options.requestId);
        if (requestId !== undefined) {
            problemOptions.requestId = requestId;
        }

        const problem = httpError.toProblemDetails(problemOptions);
        problem.detail = this.resolveMessage(httpError, exposed);
        return problem;
    }

    // ========================================================================
    // Convenience Methods
    // ========================================================================

    /** 200 OK */
    ok<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return this.success<T>({ data, message, statusCode: HttpSuccessCode.OK });
    }

    /** 201 Created */
    created<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return this.success<T>({ data, message, statusCode: HttpSuccessCode.CREATED });
    }

    /** 202 Accepted */
    accepted<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return this.success<T>({ data, message, statusCode: HttpSuccessCode.ACCEPTED });
    }

    /** 204 No Content */
    noContent(): SuccessResponse<never> {
        return this.success<never>({ statusCode: HttpSuccessCode.NO_CONTENT });
    }

    /** 206 Partial Content */
    partialContent<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return this.success<T>({ data, message, statusCode: HttpSuccessCode.PARTIAL_CONTENT });
    }

    /** 304 Not Modified */
    notModified(): SuccessResponse<never> {
        return this.success<never>({ statusCode: HttpRedirectCode.NOT_MODIFIED });
    }

    // ========================================================================
    // Pagination
    // ========================================================================

    /**
     * Create an offset-based paginated success response.
     *
     * Inputs are normalized uniformly so a hostile or malformed value can never
     * reach the client contract: `page` clamps to a positive integer (≥ 1),
     * `limit` to ≥ 1 (avoids division by zero), `total` to a non-negative
     * integer. Non-integers are floored. This mirrors the spec's clamping policy.
     */
    paginated<T = unknown>(data: T[], pagination: PaginationInput, message?: string): SuccessResponse<T[]> {
        const effectiveLimit = clampInt(pagination.limit, 1);
        const effectivePage = clampInt(pagination.page, 1);
        const effectiveTotal = clampInt(pagination.total, 0);
        const totalPages =
            pagination.totalPages !== undefined
                ? clampInt(pagination.totalPages, 0)
                : Math.ceil(effectiveTotal / effectiveLimit);
        return this.success<T[]>({
            data,
            message,
            metadata: {
                pagination: {
                    page: effectivePage,
                    limit: effectiveLimit,
                    total: effectiveTotal,
                    total_pages: totalPages,
                    has_next: effectivePage < totalPages,
                    has_prev: effectivePage > 1,
                },
            },
        });
    }

    /**
     * Create a cursor-based paginated success response.
     *
     * @example
     * ```ts
     * kit.paginatedCursor(items, { nextCursor: 'eyJpZCI6NDJ9', limit: 20 });
     * // metadata.pagination: { next_cursor, limit, has_next: true, has_prev: false }
     * ```
     */
    paginatedCursor<T = unknown>(data: T[], cursor: CursorPaginationInput, message?: string): SuccessResponse<T[]> {
        const pagination: Record<string, unknown> = {
            has_next: cursor.nextCursor !== undefined && cursor.nextCursor !== null,
            has_prev: cursor.prevCursor !== undefined && cursor.prevCursor !== null,
        };
        if (cursor.nextCursor !== undefined) pagination.next_cursor = cursor.nextCursor;
        if (cursor.prevCursor !== undefined) pagination.prev_cursor = cursor.prevCursor;
        if (cursor.limit !== undefined) pagination.limit = cursor.limit;
        if (cursor.total !== undefined) pagination.total = cursor.total;

        return this.success<T[]>({ data, message, metadata: { pagination } });
    }
}

/**
 * Create an isolated ResponseKit instance with its own configuration.
 * This is the entry point of the library.
 *
 * @example
 * ```ts
 * const api = createResponseKit({
 *   isDevelopment: process.env.NODE_ENV === 'development',
 *   format: 'problem',
 *   problemTypeBase: 'https://errors.example.com',
 * });
 *
 * api.ok(user);
 * api.error(HttpError.notFound('No such user'), { requestId: req.id });
 * ```
 */
export function createResponseKit(config: KitConfig = {}): ResponseKit {
    return new ResponseKit(config);
}
