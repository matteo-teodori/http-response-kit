/**
 * HTTP Response Kit - Koa adapter
 *
 * Zero-dependency (structural typing, no `koa` types needed).
 *
 * @example
 * ```ts
 * import Koa from 'koa';
 * import { koaErrorHandler } from 'http-response-kit/koa';
 *
 * const app = new Koa();
 * app.use(koaErrorHandler()); // register FIRST
 * // ...other middleware...
 * ```
 *
 * @module adapters/koa
 */

import { buildErrorPayload, extractRequestId, type AdapterOptions } from './shared';

/** Minimal structural view of a Koa context */
export interface KoaLikeContext {
    status?: number;
    body?: unknown;
    headers?: Record<string, unknown>;
    request?: { headers?: Record<string, unknown> };
    set(name: string, value: string): void;
}

/**
 * Koa error-handling middleware. Register it as the FIRST middleware so it
 * wraps everything downstream.
 */
export function koaErrorHandler(options: AdapterOptions = {}) {
    return async (ctx: KoaLikeContext, next: () => Promise<unknown>): Promise<void> => {
        try {
            await next();
        } catch (err) {
            const requestId = extractRequestId(ctx.request?.headers ?? ctx.headers, options.requestIdHeader);
            const payload = buildErrorPayload(err, requestId, options);

            ctx.status = payload.status;
            ctx.set('Content-Type', payload.contentType);
            for (const [name, value] of Object.entries(payload.headers)) {
                ctx.set(name, value);
            }
            ctx.body = payload.body;
        }
    };
}
