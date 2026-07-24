/**
 * HTTP Response Kit - Fastify adapter
 *
 * Zero-dependency (structural typing, no `fastify` types needed).
 *
 * @example
 * ```ts
 * import Fastify from 'fastify';
 * import { fastifyErrorHandler, fastifyNotFoundHandler } from 'http-response-kit/fastify';
 *
 * const app = Fastify();
 * app.setErrorHandler(fastifyErrorHandler());
 * app.setNotFoundHandler(fastifyNotFoundHandler());
 * ```
 *
 * @module adapters/fastify
 */

import { HttpError } from '../errors/HttpError';
import { buildErrorPayload, extractRequestId, type AdapterOptions } from './shared';

/** Minimal structural view of a Fastify request */
export interface FastifyLikeRequest {
    headers?: Record<string, unknown>;
    method?: string;
    url?: string;
    /** Fastify's own request id */
    id?: string | number;
}

/** Minimal structural view of a Fastify reply */
export interface FastifyLikeReply {
    status(code: number): FastifyLikeReply;
    header(name: string, value: string): FastifyLikeReply;
    send(body: unknown): unknown;
}

/** Shape of Fastify AJV validation errors */
interface FastifyValidationError {
    validation?: Array<{ instancePath?: string; message?: string; keyword?: string }>;
    statusCode?: number;
    message?: string;
}

/**
 * Fastify error handler. Converts every error (including Fastify's AJV
 * validation errors, mapped to structured `error.errors`) into a consistent
 * JSON (or RFC 9457) body.
 */
export function fastifyErrorHandler(options: AdapterOptions = {}) {
    return (error: unknown, request: FastifyLikeRequest, reply: FastifyLikeReply): void => {
        let normalized: unknown = error;

        // Map Fastify/AJV schema validation errors to structured validation issues.
        // Default to 422 (same as HttpError.validation) so schema failures and
        // hand-thrown validation errors never disagree on status; override with
        // `validationStatus: 400` for the traditional Bad Request.
        const maybeValidation = error as FastifyValidationError;
        if (!HttpError.isHttpError(error) && Array.isArray(maybeValidation?.validation)) {
            normalized = HttpError.validation(
                maybeValidation.validation.map((issue) => ({
                    field: (issue.instancePath ?? '').replace(/^\//, '').replaceAll('/', '.') || '(body)',
                    message: issue.message ?? 'Invalid value',
                    code: issue.keyword,
                })),
                maybeValidation.message ?? 'Validation failed',
                options.validationStatus ?? 422
            );
        }

        const requestId =
            extractRequestId(request.headers, options.requestIdHeader) ??
            (request.id !== undefined ? String(request.id) : undefined);

        const payload = buildErrorPayload(normalized, requestId, options);

        reply.status(payload.status);
        reply.header('content-type', payload.contentType);
        for (const [name, value] of Object.entries(payload.headers)) {
            reply.header(name, value);
        }
        reply.send(payload.body);
    };
}

/** Fastify not-found handler producing a consistent 404 body */
export function fastifyNotFoundHandler(options: AdapterOptions = {}) {
    return (request: FastifyLikeRequest, reply: FastifyLikeReply): void => {
        const err = HttpError.notFound(`Route ${request.method ?? ''} ${request.url ?? ''} not found`.trim());
        const requestId = extractRequestId(request.headers, options.requestIdHeader);
        const payload = buildErrorPayload(err, requestId, options);
        reply.status(payload.status);
        reply.header('content-type', payload.contentType);
        reply.send(payload.body);
    };
}
