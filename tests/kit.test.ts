import { describe, it, expect } from 'vitest';
import { createResponseKit } from '../src/kit';
import { HttpError } from '../src/errors/HttpError';

describe('createResponseKit (isolated instances)', () => {
    it('should apply customMessages as default messages at serialization', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            customMessages: { 404: 'Nothing to see here.', 500: 'Generic server error' },
        });
        // default message -> custom default applies
        expect(kit.error(HttpError.notFound()).error.message).toBe('Nothing to see here.');
        // explicit message wins (exposable 4xx)
        expect(kit.error(HttpError.notFound('User 42 missing')).error.message).toBe('User 42 missing');
        // 5xx sanitized -> custom default replaces the generic description
        expect(kit.error(HttpError.internalServerError('secret')).error.message).toBe('Generic server error');
    });

    it('should isolate two kits from each other', () => {
        const kitA = createResponseKit({ casing: 'camel', includeTimestamp: false });
        const kitB = createResponseKit({ casing: 'snake', includeTimestamp: false });

        expect(kitA.ok({ x: 1 }).statusCode).toBe(200);
        expect(kitA.ok({ x: 1 }).status_code).toBeUndefined();
        expect(kitB.ok({ x: 1 }).status_code).toBe(200);
    });

    it('should support configure() per instance', () => {
        const kit = createResponseKit({ includeTimestamp: false });
        kit.configure({ casing: 'camel' });
        expect(kit.getConfig().casing).toBe('camel');
        expect(kit.getConfig().includeTimestamp).toBe(false);
    });

    it('should apply camel casing to pagination metadata', () => {
        const kit = createResponseKit({ casing: 'camel', includeTimestamp: false });
        const res = kit.paginated([1, 2], { page: 1, limit: 2, total: 4 });
        const pagination = (res.metadata as any).pagination;
        expect(pagination.totalPages).toBe(2);
        expect(pagination.hasNext).toBe(true);
        expect(pagination.hasPrev).toBe(false);
    });

    it('should support cursor pagination', () => {
        const kit = createResponseKit({ includeTimestamp: false });
        const res = kit.paginatedCursor([1, 2], { nextCursor: 'abc', limit: 2 });
        const pagination = (res.metadata as any).pagination;
        expect(pagination.next_cursor).toBe('abc');
        expect(pagination.has_next).toBe(true);
        expect(pagination.has_prev).toBe(false);
    });

    it('should echo requestId as request_id', () => {
        const kit = createResponseKit({ includeTimestamp: false });
        expect(kit.success({ requestId: 'req-1' }).request_id).toBe('req-1');
        expect(kit.error(HttpError.notFound(), { requestId: 'req-2' }).request_id).toBe('req-2');
    });

    it('should apply messageResolver (i18n hook)', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            messageResolver: (e) => (e.code === 404 ? 'Not found' : undefined),
        });
        expect(kit.error(HttpError.notFound()).error.message).toBe('Not found');
        expect(kit.error(HttpError.badRequest('Bad')).error.message).toBe('Bad');
    });

    it('should apply metadataSanitizer', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            metadataSanitizer: (m) => {
                const { password, ...rest } = m;
                return rest;
            },
        });
        const res = kit.error(HttpError.badRequest('x', { password: 'secret', safe: 1 }));
        expect(res.metadata).toEqual({ safe: 1 });
    });

    it('should hide metadata for non-exposed (5xx) errors', () => {
        const kit = createResponseKit({ includeTimestamp: false });
        const res = kit.error(HttpError.internalServerError('boom', { internal: 'stuff' }));
        expect(res.metadata).toBeUndefined();
        expect(res.error.message).toBe('An unexpected error occurred on the server.');
    });

    it('should expose 5xx messages when exposeServerErrors is true', () => {
        const kit = createResponseKit({ includeTimestamp: false, exposeServerErrors: true });
        const res = kit.error(HttpError.internalServerError('visible detail'));
        expect(res.error.message).toBe('visible detail');
    });

    it('should build problem details with configured typeBase', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            problemTypeBase: 'https://errors.example.com',
        });
        const problem = kit.problem(HttpError.notFound('User missing'), { instance: '/users/1' });
        expect(problem.type).toBe('https://errors.example.com/not_found');
        expect(problem.status).toBe(404);
        expect(problem.detail).toBe('User missing');
        expect(problem.instance).toBe('/users/1');
    });

    it('should include validation errors and errorCode in error responses', () => {
        const kit = createResponseKit({ includeTimestamp: false });
        const err = HttpError.validation([{ field: 'email', message: 'Invalid', code: 'invalid' }]);
        const res = kit.error(err);
        expect(res.status_code).toBe(422);
        expect(res.error.code).toBe('VALIDATION_FAILED');
        expect(res.error.errors).toEqual([{ field: 'email', message: 'Invalid', code: 'invalid' }]);
    });

    it('should include cause chain only in dev mode', () => {
        const kitProd = createResponseKit({ includeTimestamp: false, isDevelopment: false });
        const kitDev = createResponseKit({ includeTimestamp: false, isDevelopment: true });
        const err = HttpError.fromError(new Error('root cause'));

        expect(kitProd.error(err).error.causes).toBeUndefined();
        expect(kitProd.error(err).error.stack).toBeUndefined();
        expect(kitDev.error(err).error.causes).toEqual(['Error: root cause']);
        expect(kitDev.error(err).error.stack).toBeDefined();
    });
});
