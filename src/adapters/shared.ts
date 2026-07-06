/**
 * HTTP Response Kit - Shared adapter internals
 * @module adapters/shared
 */

import type { ErrorResponse, ProblemDetails } from '../types';
import { HttpError } from '../errors/HttpError';
import { ResponseKit } from '../kit';
import { PROBLEM_CONTENT_TYPE } from '../responses/problem';

/** Stateless fallback kit used when no kit is passed to an adapter */
const fallbackKit = new ResponseKit();

/** Options shared by all framework adapters */
export interface AdapterOptions {
    /** Kit instance to use (default: an internal kit with default config) */
    kit?: ResponseKit;
    /** Request header carrying the correlation id (default: "x-request-id") */
    requestIdHeader?: string;
    /** Called with every handled error — hook your logger here */
    onError?: (error: HttpError, requestId?: string) => void;
    /** Override stack inclusion (default: kit dev mode) */
    includeStack?: boolean;
    /** Force RFC 9457 output regardless of kit `format` config */
    problem?: boolean;
}

/** Normalized payload ready to be sent by any framework */
export interface ErrorPayload {
    status: number;
    headers: Record<string, string>;
    contentType: string;
    body: ErrorResponse | ProblemDetails;
    error: HttpError;
}

/**
 * Convert any thrown value into a normalized, ready-to-send error payload.
 * @internal
 */
export function buildErrorPayload(
    err: unknown,
    requestId: string | undefined,
    options: AdapterOptions = {}
): ErrorPayload {
    const kit = options.kit ?? fallbackKit;
    const error = HttpError.fromError(err);
    const useProblem = options.problem ?? kit.getConfig().format === 'problem';

    options.onError?.(error, requestId);

    const headers = error.getHeaders();

    if (useProblem) {
        return {
            status: error.code,
            headers,
            contentType: PROBLEM_CONTENT_TYPE,
            body: kit.problem(error, { requestId }),
            error,
        };
    }

    return {
        status: error.code,
        headers,
        contentType: 'application/json; charset=utf-8',
        body: kit.error(error, { requestId, includeStack: options.includeStack }),
        error,
    };
}

/** Extract a request id from a headers bag (string | string[] tolerant) */
export function extractRequestId(
    headers: Record<string, unknown> | undefined,
    headerName = 'x-request-id'
): string | undefined {
    const value = headers?.[headerName] ?? headers?.[headerName.toLowerCase()];
    if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
    return typeof value === 'string' ? value : undefined;
}
