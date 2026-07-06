/**
 * HTTP Response Kit - Hono adapter
 *
 * Zero-dependency (structural typing, no `hono` types needed).
 *
 * @example
 * ```ts
 * import { Hono } from 'hono';
 * import { honoErrorHandler } from 'http-response-kit/hono';
 *
 * const app = new Hono();
 * app.onError(honoErrorHandler());
 * ```
 *
 * @module adapters/hono
 */

import { buildErrorPayload, type AdapterOptions } from './shared';

/** Minimal structural view of a Hono context */
export interface HonoLikeContext {
    req: { header(name: string): string | undefined };
    json(body: unknown, status?: number, headers?: Record<string, string>): unknown;
}

/**
 * Hono `onError` handler producing consistent JSON (or RFC 9457) bodies.
 */
export function honoErrorHandler(options: AdapterOptions = {}) {
    return (err: unknown, c: HonoLikeContext): unknown => {
        const requestId = c.req.header(options.requestIdHeader ?? 'x-request-id');
        const payload = buildErrorPayload(err, requestId, options);

        return c.json(payload.body, payload.status, {
            'Content-Type': payload.contentType,
            ...payload.headers,
        });
    };
}
