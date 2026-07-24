/**
 * createApi(): the kit and every framework adapter are bound together, so a
 * configured format/casing can never diverge between success and error output.
 */
import { describe, it, expect, vi } from 'vitest';
import { createApi } from '../src/api';
import { HttpError } from '../src/errors/HttpError';

describe('createApi bound adapters', () => {
    it('exposes the kit and all four framework namespaces', () => {
        const api = createApi({ includeTimestamp: false });
        expect(api.kit.ok({ id: 1 }).status_code).toBe(200);
        expect(typeof api.express.errorHandler).toBe('function');
        expect(typeof api.fastify.errorHandler).toBe('function');
        expect(typeof api.koa.errorHandler).toBe('function');
        expect(typeof api.hono.errorHandler).toBe('function');
    });

    it('binds the Express handlers to the kit', () => {
        const api = createApi({ includeTimestamp: false, casing: 'camel' });
        const res: Record<string, unknown> & { statusCode?: number; body?: unknown } = {
            headersSent: false,
            setHeader() {},
            status(code: number) { res.statusCode = code; return res; },
            json(body: unknown) { res.body = body; return res; },
        };
        api.express.errorHandler()(HttpError.notFound('x'), { headers: {} }, res as never, vi.fn());
        expect(res.statusCode).toBe(404);
        expect((res.body as Record<string, unknown>).statusCode).toBe(404); // camel, from the bound kit
    });

    it('express.notFoundHandler and asyncHandler are bound and functional', async () => {
        const api = createApi({ includeTimestamp: false });
        const next = vi.fn();
        api.express.notFoundHandler('nope')({ method: 'GET', url: '/x' }, {} as never, next);
        expect(HttpError.isHttpError(next.mock.calls[0]![0])).toBe(true);

        const asyncNext = vi.fn();
        api.express.asyncHandler(async () => { throw HttpError.badRequest('boom'); })(
            { headers: {} }, {} as never, asyncNext,
        );
        await new Promise((r) => setImmediate(r));
        expect(asyncNext).toHaveBeenCalledOnce();
    });

    it('binds the Fastify handlers to the kit', () => {
        const api = createApi({ includeTimestamp: false });
        const reply: Record<string, unknown> & { statusCode?: number; body?: unknown } = {
            status(code: number) { reply.statusCode = code; return reply; },
            header() { return reply; },
            send(body: unknown) { reply.body = body; return reply; },
        };
        api.fastify.errorHandler()(HttpError.conflict('dup'), { headers: {} }, reply as never);
        expect(reply.statusCode).toBe(409);

        api.fastify.notFoundHandler()({ method: 'GET', url: '/x', headers: {} }, reply as never);
        expect(reply.statusCode).toBe(404);
    });

    it('binds the Koa handler to the kit', async () => {
        const api = createApi({ includeTimestamp: false });
        const ctx: Record<string, unknown> & { status?: number; body?: unknown } = {
            request: { headers: {} },
            set() {},
        };
        await api.koa.errorHandler()(ctx as never, async () => { throw HttpError.forbidden('no'); });
        expect(ctx.status).toBe(403);
    });

    it('binds the Hono handler to the kit', () => {
        const api = createApi({ includeTimestamp: false });
        let captured: { status?: number } = {};
        const c = {
            req: { header: () => undefined },
            json(body: unknown, status?: number) { captured = { status }; return { body }; },
        };
        api.hono.errorHandler()(HttpError.badRequest('bad'), c as never);
        expect(captured.status).toBe(400);
    });
});
