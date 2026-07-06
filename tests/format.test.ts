import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createResponseKit, isSuccessResponse, isErrorResponse } from '../src/kit';
import { HttpError } from '../src/errors/HttpError';

describe('ResponseKit formatting (core behavior)', () => {
    const kit = createResponseKit();

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-07-06T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('success()', () => {
        it('should format a generic success response correctly', () => {
            const response = kit.success({ data: { id: 1 }, message: 'Test success' });
            expect(response.success).toBe(true);
            expect(response.status_code).toBe(200);
            expect(response.data).toEqual({ id: 1 });
            expect(response.message).toBe('Test success');
            expect(response.timestamp).toBe('2026-07-06T12:00:00.000Z');
        });

        it('should handle unmapped success status codes correctly', () => {
            const response = kit.success({ statusCode: 299 });
            expect(response.status_code).toBe(299);
        });

        it('should omit data for 204 No Content', () => {
            const response = kit.noContent();
            expect(response.status_code).toBe(204);
            expect(response.data).toBeUndefined();
        });

        it('should not include data for 304 Not Modified even if provided', () => {
            const response = kit.success({ data: 'excluded', statusCode: 304 });
            expect(response.status_code).toBe(304);
            expect(response.data).toBeUndefined();
        });

        it('should omit timestamps when disabled', () => {
            const noTs = createResponseKit({ includeTimestamp: false });
            expect(noTs.success().timestamp).toBeUndefined();
        });

        it('should format partialContent with status 206', () => {
            const response = kit.partialContent([1, 2, 3], 'Partial');
            expect(response.status_code).toBe(206);
            expect(response.data).toEqual([1, 2, 3]);
        });
    });

    describe('error()', () => {
        it('should format a generic error response correctly', () => {
            const response = kit.error(new HttpError(404, { message: 'Not found test' }));
            expect(response.success).toBe(false);
            expect(response.status_code).toBe(404);
            expect(response.error.message).toBe('Not found test');
            expect(response.error.type).toBe('not_found');
            expect(response.timestamp).toBe('2026-07-06T12:00:00.000Z');
        });

        it('should include retry_after if available on the error', () => {
            const response = kit.error(HttpError.tooManyRequests('Wait', 60));
            expect(response.retry_after).toBe(60);
        });

        it('should safely merge additionalFields while protecting core keys', () => {
            const response = kit.error(new HttpError(400), {
                additionalFields: { success: true, status_code: 200, custom_field: 'safe' },
            });
            expect(response.success).toBe(false);
            expect(response.status_code).toBe(400);
            expect(response.custom_field).toBe('safe');
        });

        it('should protect retry_after from additionalFields override', () => {
            const response = kit.error(HttpError.tooManyRequests('Wait', 60), {
                additionalFields: { retry_after: 999 },
            });
            expect(response.retry_after).toBe(60);
        });

        it('should use separate stack field and keep details', () => {
            const response = kit.error(new HttpError(500), { includeStack: true });
            expect(response.error.stack).toBeDefined();
            expect(response.error.details).toBe('An unexpected error occurred on the server.');
        });

        it('should not include stack when explicitly disabled', () => {
            const response = kit.error(new HttpError(500), { includeStack: false });
            expect(response.error.stack).toBeUndefined();
        });
    });

    describe('fromError()', () => {
        it('should sanitize unknown 5xx errors', () => {
            const response = kit.fromError(new Error('DB password invalid'));
            expect(response.status_code).toBe(500);
            expect(JSON.stringify(response)).not.toContain('DB password invalid');
        });

        it('should keep messages for 4xx fallback codes', () => {
            const response = kit.fromError(new Error('Bad input'), { fallbackCode: 400 });
            expect(response.error.message).toBe('Bad input');
        });

        it('should allow forcing exposure per-response', () => {
            const response = kit.fromError(new Error('Internal detail'), { expose: true });
            expect(response.error.message).toBe('Internal detail');
        });
    });

    describe('pagination', () => {
        it('should correctly format an offset-paginated response', () => {
            const response = kit.paginated([1, 2, 3], { page: 2, limit: 3, total: 10 });
            expect(response.metadata?.pagination).toEqual({
                page: 2, limit: 3, total: 10, total_pages: 4, has_next: true, has_prev: true,
            });
        });

        it('should guard against division by zero when limit is 0', () => {
            const response = kit.paginated([1], { page: 1, limit: 0, total: 10 });
            const pagination = response.metadata?.pagination as Record<string, unknown>;
            expect(pagination.limit).toBe(1);
            expect(pagination.total_pages).toBe(10);
        });
    });

    describe('type guards', () => {
        it('should correctly identify success and error responses', () => {
            const success = kit.ok();
            const error = kit.fromError(new Error());
            expect(isSuccessResponse(success)).toBe(true);
            expect(isErrorResponse(success)).toBe(false);
            expect(isSuccessResponse(error)).toBe(false);
            expect(isErrorResponse(error)).toBe(true);
        });
    });

    describe('transformer', () => {
        it('should apply responseTransformer last', () => {
            const t = createResponseKit({
                includeTimestamp: false,
                responseTransformer: (r) => ({ ...r, custom_header: 'transformed' }),
            });
            expect(t.success({ data: 'test' }).custom_header).toBe('transformed');
        });
    });
});
