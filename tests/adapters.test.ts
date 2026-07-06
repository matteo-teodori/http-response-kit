import { describe, it, expect, vi } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { createResponseKit } from '../src/kit';
import { errorHandler, notFoundHandler } from '../src/adapters/express';
import { fastifyErrorHandler, fastifyNotFoundHandler } from '../src/adapters/fastify';
import { koaErrorHandler } from '../src/adapters/koa';
import { honoErrorHandler } from '../src/adapters/hono';
import { PROBLEM_CONTENT_TYPE } from '../src/responses/problem';

const kit = createResponseKit({ includeTimestamp: false });

function mockExpressRes() {
    const res: any = {
        headersSent: false,
        headers: {} as Record<string, string>,
        statusCode: 0,
        body: undefined,
        setHeader(name: string, value: string) { this.headers[name] = value; return this; },
        status(code: number) { this.statusCode = code; return this; },
        json(body: unknown) { this.body = body; return this; },
    };
    return res;
}

describe('Express adapter', () => {
    it('should send a formatted error with headers and request id', () => {
        const handler = errorHandler({ kit });
        const res = mockExpressRes();
        const err = HttpError.tooManyRequests('Slow down', 30);

        handler(err, { headers: { 'x-request-id': 'req-7' } }, res, vi.fn());

        expect(res.statusCode).toBe(429);
        expect(res.headers['Retry-After']).toBe('30');
        expect(res.body.error.type).toBe('too_many_requests');
        expect(res.body.request_id).toBe('req-7');
    });

    it('should sanitize unknown errors (500)', () => {
        const handler = errorHandler({ kit });
        const res = mockExpressRes();
        handler(new Error('secret'), { headers: {} }, res, vi.fn());
        expect(res.statusCode).toBe(500);
        expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    it('should delegate when headers already sent', () => {
        const handler = errorHandler({ kit });
        const next = vi.fn();
        const res = mockExpressRes();
        res.headersSent = true;
        const err = new Error('x');
        handler(err, { headers: {} }, res, next);
        expect(next).toHaveBeenCalledWith(err);
    });

    it('should emit RFC 9457 bodies when problem mode is on', () => {
        const problemKit = createResponseKit({ includeTimestamp: false, format: 'problem' });
        const handler = errorHandler({ kit: problemKit });
        const res = mockExpressRes();
        handler(HttpError.notFound('Nope'), { headers: {} }, res, vi.fn());
        expect(res.headers['Content-Type']).toBe(PROBLEM_CONTENT_TYPE);
        expect(res.body.title).toBe('Not Found');
        expect(res.body.status).toBe(404);
    });

    it('should call onError hook for logging', () => {
        const onError = vi.fn();
        const handler = errorHandler({ kit, onError });
        handler(new Error('log me'), { headers: { 'x-request-id': 'abc' } }, mockExpressRes(), vi.fn());
        expect(onError).toHaveBeenCalledOnce();
        expect(onError.mock.calls[0][0].message).toBe('log me');
        expect(onError.mock.calls[0][1]).toBe('abc');
    });

    it('notFoundHandler should forward a 404 HttpError', () => {
        const next = vi.fn();
        notFoundHandler()({ method: 'GET', originalUrl: '/missing' }, mockExpressRes(), next);
        const forwarded = next.mock.calls[0][0];
        expect(HttpError.isHttpError(forwarded)).toBe(true);
        expect(forwarded.code).toBe(404);
        expect(forwarded.message).toContain('/missing');
    });
});

function mockReply() {
    const reply: any = {
        statusCode: 0,
        headers: {} as Record<string, string>,
        body: undefined,
        status(code: number) { this.statusCode = code; return this; },
        header(name: string, value: string) { this.headers[name] = value; return this; },
        send(body: unknown) { this.body = body; return this; },
    };
    return reply;
}

describe('Fastify adapter', () => {
    it('should format generic errors', () => {
        const reply = mockReply();
        fastifyErrorHandler({ kit })(HttpError.forbidden('No way'), { headers: {}, id: 'f-1' }, reply);
        expect(reply.statusCode).toBe(403);
        expect(reply.body.error.message).toBe('No way');
        expect(reply.body.request_id).toBe('f-1');
    });

    it('should map Fastify AJV validation errors to structured issues', () => {
        const ajvError = {
            statusCode: 400,
            message: "body/email must match format \"email\"",
            validation: [{ instancePath: '/email', message: 'must match format "email"', keyword: 'format' }],
        };
        const reply = mockReply();
        fastifyErrorHandler({ kit })(ajvError, { headers: {} }, reply);
        expect(reply.statusCode).toBe(400);
        expect(reply.body.error.errors).toEqual([
            { field: 'email', message: 'must match format "email"', code: 'format' },
        ]);
    });

    it('notFound handler should produce a consistent 404', () => {
        const reply = mockReply();
        fastifyNotFoundHandler({ kit })({ method: 'GET', url: '/nope', headers: {} }, reply);
        expect(reply.statusCode).toBe(404);
        expect(reply.body.error.type).toBe('not_found');
    });
});

describe('Koa adapter', () => {
    it('should catch downstream errors and set ctx fields', async () => {
        const ctx: any = {
            status: 0,
            body: undefined,
            request: { headers: { 'x-request-id': 'k-1' } },
            headersMap: {} as Record<string, string>,
            set(name: string, value: string) { this.headersMap[name] = value; },
        };
        await koaErrorHandler({ kit })(ctx, async () => {
            throw HttpError.conflict('Duplicate');
        });
        expect(ctx.status).toBe(409);
        expect(ctx.body.error.message).toBe('Duplicate');
        expect(ctx.body.request_id).toBe('k-1');
    });

    it('should pass through when no error occurs', async () => {
        const ctx: any = { set: vi.fn() };
        const next = vi.fn(async () => undefined);
        await koaErrorHandler({ kit })(ctx, next);
        expect(next).toHaveBeenCalledOnce();
    });
});

describe('Hono adapter', () => {
    it('should return c.json with status and headers', () => {
        const captured: any = {};
        const c = {
            req: { header: (n: string) => (n === 'x-request-id' ? 'h-1' : undefined) },
            json(body: unknown, status?: number, headers?: Record<string, string>) {
                captured.body = body; captured.status = status; captured.headers = headers;
                return 'response';
            },
        };
        const result = honoErrorHandler({ kit })(HttpError.serviceUnavailable('Down', 15), c);
        expect(result).toBe('response');
        expect(captured.status).toBe(503);
        expect(captured.headers['Retry-After']).toBe('15');
        expect(captured.body.request_id).toBe('h-1');
        // 503 message is not exposable by default
        expect(captured.body.error.message).not.toBe('Down');
    });
});
