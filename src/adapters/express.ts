/**
 * HTTP Response Kit - Express adapter
 *
 * Zero-dependency (structural typing, no `@types/express` needed).
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { errorHandler, notFoundHandler } from 'http-response-kit/express';
 *
 * const app = express();
 * // ...routes...
 * app.use(notFoundHandler());
 * app.use(errorHandler({ onError: (e, id) => logger.error({ err: e, requestId: id }) }));
 * ```
 *
 * @module adapters/express
 */

import { HttpError } from '../errors/HttpError';
import { buildErrorPayload, extractRequestId, type AdapterOptions } from './shared';

/** Minimal structural view of an Express request */
export interface ExpressLikeRequest {
    headers?: Record<string, unknown>;
    method?: string;
    originalUrl?: string;
    url?: string;
}

/** Minimal structural view of an Express response */
export interface ExpressLikeResponse {
    headersSent?: boolean;
    status(code: number): ExpressLikeResponse;
    setHeader(name: string, value: string): unknown;
    json(body: unknown): unknown;
}

export type ExpressErrorHandler = (
    err: unknown,
    req: ExpressLikeRequest,
    res: ExpressLikeResponse,
    next: (err?: unknown) => void
) => void;

/**
 * Express error-handling middleware. Register it LAST (after all routes).
 * Converts any thrown/forwarded error into a consistent JSON (or RFC 9457) body,
 * sets error headers (Retry-After, ...), and echoes the request id.
 */
export function errorHandler(options: AdapterOptions = {}): ExpressErrorHandler {
    return (err, req, res, next) => {
        if (res.headersSent) {
            next(err);
            return;
        }

        const requestId = extractRequestId(req.headers, options.requestIdHeader);
        const payload = buildErrorPayload(err, requestId, options);

        res.setHeader('Content-Type', payload.contentType);
        for (const [name, value] of Object.entries(payload.headers)) {
            res.setHeader(name, value);
        }

        res.status(payload.status).json(payload.body);
    };
}

/** An async-capable Express route handler. */
export type ExpressAsyncHandler = (
    req: ExpressLikeRequest,
    res: ExpressLikeResponse,
    next: (err?: unknown) => void
) => void | Promise<unknown>;

/**
 * Wrap an async Express route handler so a rejected promise is forwarded to
 * `next()` (and therefore to `errorHandler()`), instead of becoming an
 * unhandled rejection that crashes the process.
 *
 * Express 4 does NOT await handlers, so `async (req, res) => { throw ... }`
 * escapes the error pipeline entirely — this is the framework's most common
 * footgun. Express 5 handles rejected promises natively and does not need this;
 * `express-async-errors` is an alternative global shim.
 *
 * @example
 * ```ts
 * import { asyncHandler } from 'http-response-kit/express';
 * app.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await findUser(req.params.id);
 *   if (!user) throw HttpError.notFound('User not found');
 *   res.json(api.ok(user));
 * }));
 * ```
 */
export function asyncHandler(handler: ExpressAsyncHandler): ExpressAsyncHandler {
    return (req, res, next) => {
        Promise.resolve()
            .then(() => handler(req, res, next))
            .catch(next);
    };
}

/**
 * Express catch-all 404 middleware. Register it after all routes,
 * before `errorHandler()`.
 */
export function notFoundHandler(message?: string) {
    return (req: ExpressLikeRequest, _res: ExpressLikeResponse, next: (err?: unknown) => void): void => {
        next(HttpError.notFound(message ?? `Route ${req.method ?? ''} ${req.originalUrl ?? req.url ?? ''} not found`.trim()));
    };
}
