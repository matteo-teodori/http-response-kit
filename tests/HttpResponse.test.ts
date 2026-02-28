import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpResponse } from '../src/responses/HttpResponse';
import { HttpError } from '../src/errors/HttpError';
import { configure, resetConfig } from '../src/config';

describe('HttpResponse', () => {
    beforeEach(() => {
        // Reset configuration and fix timestamp for deterministic testing
        resetConfig();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-28T12:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('success()', () => {
        it('should format a generic success response correctly', () => {
            const response = HttpResponse.success({ data: { id: 1 }, message: 'Test success' });
            expect(response.success).toBe(true);
            expect(response.status_code).toBe(200);
            expect(response.data).toEqual({ id: 1 });
            expect(response.message).toBe('Test success');
            expect(response.timestamp).toBe('2026-02-28T12:00:00.000Z');
        });

        it('should handle unmapped success status codes correctly', () => {
            const response = HttpResponse.success({ statusCode: 299 });
            expect(response.status_code).toBe(299);
            expect(response.success).toBe(true);
        });

        it('should omit data for 204 No Content', () => {
            const response = HttpResponse.noContent();
            expect(response.status_code).toBe(204);
            expect(response.data).toBeUndefined();
        });

        it('should properly configure timestamps via config', () => {
            configure({ includeTimestamp: false });
            const response = HttpResponse.success();
            expect(response.timestamp).toBeUndefined();
        });
    });

    describe('convenience methods', () => {
        it('should format notModified with status 304', () => {
            const response = HttpResponse.notModified();
            expect(response.status_code).toBe(304);
            expect(response.success).toBe(true);
            expect(response.data).toBeUndefined();
        });

        it('should format partialContent with status 206', () => {
            const response = HttpResponse.partialContent([1, 2, 3], 'Partial');
            expect(response.status_code).toBe(206);
            expect(response.data).toEqual([1, 2, 3]);
            expect(response.message).toBe('Partial');
        });
    });

    describe('error()', () => {
        it('should format a generic error response correctly', () => {
            const error = new HttpError(404, { message: 'Not found test' });
            const response = HttpResponse.error(error);

            expect(response.success).toBe(false);
            expect(response.status_code).toBe(404);
            expect(response.error.message).toBe('Not found test');
            expect(response.error.type).toBe('not_found');
            expect(response.timestamp).toBe('2026-02-28T12:00:00.000Z');
        });

        it('should include retry_after if available on the error', () => {
            const error = HttpError.tooManyRequests('Wait', 60);
            const response = HttpResponse.error(error);
            expect(response.retry_after).toBe(60);
        });

        it('should safely merge additionalFields while protecting core keys', () => {
            const error = new HttpError(400);
            const response = HttpResponse.error(error, {
                additionalFields: {
                    success: true, // Malicious override
                    status_code: 200, // Malicious override
                    custom_field: 'safe'
                }
            });

            expect(response.success).toBe(false); // Protected
            expect(response.status_code).toBe(400); // Protected
            expect(response.custom_field).toBe('safe'); // Allowed
        });

        it('should protect retry_after from additionalFields override', () => {
            const error = HttpError.tooManyRequests('Wait', 60);
            const response = HttpResponse.error(error, {
                additionalFields: { retry_after: 999 }
            });
            expect(response.retry_after).toBe(60); // Protected, not overridden
        });

        it('should use separate stack field instead of overwriting details', () => {
            const error = new HttpError(500);
            const response = HttpResponse.error(error, { includeStack: true });

            expect(response.error.stack).toBeDefined();
            expect(response.error.details).toBe('An unexpected error occurred on the server.');
        });

        it('should not include stack when explicitly disabled', () => {
            const error = new HttpError(500);
            const response = HttpResponse.error(error, { includeStack: false });
            expect(response.error.stack).toBeUndefined();
        });

        it('should always include details from error definition', () => {
            const error = new HttpError(404, { message: 'Custom message' });
            const response = HttpResponse.error(error);
            expect(response.error.message).toBe('Custom message');
            expect(response.error.details).toBe('The requested resource could not be found.');
        });
    });

    describe('fromError()', () => {
        it('should format standard errors', () => {
            const response = HttpResponse.fromError(new Error('Crash'));
            expect(response.status_code).toBe(500);
            expect(response.error.message).toBe('Crash');
        });

        it('should use fallbackCode via ErrorResponseConfig', () => {
            const response = HttpResponse.fromError(new Error('Crash'), { fallbackCode: 503 });
            expect(response.status_code).toBe(503);
            expect(response.error.message).toBe('Crash');
        });
    });

    describe('paginated()', () => {
        it('should correctly format a paginated response', () => {
            const data = [1, 2, 3];
            const response = HttpResponse.paginated(data, {
                page: 2,
                limit: 3,
                total: 10
            });

            expect(response.data).toEqual(data);
            expect(response.metadata?.pagination).toEqual({
                page: 2,
                limit: 3,
                total: 10,
                total_pages: 4,
                has_next: true,
                has_prev: true
            });
        });

        it('should guard against division by zero when limit is 0', () => {
            const response = HttpResponse.paginated([1], { page: 1, limit: 0, total: 10 });
            const pagination = response.metadata?.pagination as Record<string, unknown>;
            expect(pagination.limit).toBe(1); // Clamped from 0 to 1
            expect(pagination.total_pages).toBe(10); // Math.ceil(10 / 1)
            expect(pagination.total_pages).not.toBe(Infinity);
        });
    });

    describe('body exclusion for no-body status codes', () => {
        it('should not include data for 304 Not Modified even if provided', () => {
            const response = HttpResponse.success({ data: 'should be excluded', statusCode: 304 });
            expect(response.status_code).toBe(304);
            expect(response.data).toBeUndefined();
        });
    });

    describe('type guards', () => {
        it('should correctly identify success and error responses', () => {
            const success = HttpResponse.ok();
            const error = HttpResponse.fromError(new Error());

            expect(HttpResponse.isSuccess(success)).toBe(true);
            expect(HttpResponse.isError(success)).toBe(false);

            expect(HttpResponse.isSuccess(error)).toBe(false);
            expect(HttpResponse.isError(error)).toBe(true);
        });
    });

    describe('configuration integration', () => {
        it('should apply responseTransformer when configured', () => {
            configure({
                responseTransformer: (response) => ({
                    ...response,
                    custom_header: 'transformed'
                })
            });
            const response = HttpResponse.success({ data: 'test' });
            expect(response.custom_header).toBe('transformed');
        });

        it('should use customMessages in HttpError when configured', () => {
            configure({ customMessages: { 404: 'Custom not found message' } });
            const error = new HttpError(404);
            expect(error.message).toBe('Custom not found message');
        });

        it('should deep merge customMessages across multiple configure calls', () => {
            configure({ customMessages: { 404: 'Not found custom' } });
            configure({ customMessages: { 500: 'Server error custom' } });

            const err404 = new HttpError(404);
            const err500 = new HttpError(500);
            expect(err404.message).toBe('Not found custom');
            expect(err500.message).toBe('Server error custom');
        });
    });
});

