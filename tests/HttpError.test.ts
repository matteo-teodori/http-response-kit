import { describe, it, expect } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { HttpClientErrorCode, HttpServerErrorCode } from '../src/constants/status-codes';
import { HttpErrorDefinitions } from '../src/constants/error-definitions';
import { HttpSuccessDefinitions, HttpRedirectDefinitions, HttpInfoDefinitions } from '../src/constants/success-definitions';

describe('HttpError', () => {
    describe('constructor & basic behavior', () => {
        it('should correctly instantiate an error with known status code', () => {
            const error = new HttpError(404);
            expect(error.code).toBe(404);
            expect(error.type).toBe('not_found');
            expect(error.title).toBe('Not Found');
            expect(error.message).toBe('The requested resource could not be found.');
            expect(error.name).toBe('HttpError');
        });

        it('should accept custom messages', () => {
            const error = new HttpError(401, { message: 'Custom unauthorized message' });
            expect(error.code).toBe(401);
            expect(error.message).toBe('Custom unauthorized message');
        });

        it('should merge metadata correctly', () => {
            const error = new HttpError(400, { metadata: { field: 'email' } });
            expect(error.metadata).toEqual({ field: 'email' });
        });

        it('should preserve unknown status codes instead of coercing to 500', () => {
            const errorClient = new HttpError(499);
            expect(errorClient.code).toBe(499);
            expect(errorClient.type).toBe('unknown_client_error');
            expect(errorClient.title).toBe('Unknown Client Error');

            const errorServer = new HttpError(599);
            expect(errorServer.code).toBe(599);
            expect(errorServer.type).toBe('unknown_server_error');
            expect(errorServer.title).toBe('Unknown Server Error');
        });

        it('should throw RangeError for codes outside 400-599', () => {
            expect(() => new HttpError(200)).toThrow(RangeError);
            expect(() => new HttpError(0)).toThrow(RangeError);
            expect(() => new HttpError(-1)).toThrow(RangeError);
            expect(() => new HttpError(300)).toThrow(RangeError);
            expect(() => new HttpError(600)).toThrow(RangeError);
        });

        it('should expose details from error definition', () => {
            const error = new HttpError(404);
            expect(error.details).toBe('The requested resource could not be found.');

            const customMsgError = new HttpError(404, { message: 'Custom' });
            expect(customMsgError.message).toBe('Custom');
            expect(customMsgError.details).toBe('The requested resource could not be found.');
        });
    });

    describe('factory methods', () => {
        it('should create correct 400 error', () => {
            const error = HttpError.badRequest('Invalid params');
            expect(error.code).toBe(HttpClientErrorCode.BAD_REQUEST);
            expect(error.message).toBe('Invalid params');
        });

        it('should create correct 500 error', () => {
            const error = HttpError.internalServerError('Something failed');
            expect(error.code).toBe(HttpServerErrorCode.INTERNAL_SERVER_ERROR);
            expect(error.message).toBe('Something failed');
        });

        it('should use default retryAfter from definition for 503', () => {
            const error = HttpError.serviceUnavailable();
            expect(error.retryAfter).toBe(60);
        });

        it('should allow overriding retryAfter for 503', () => {
            const error = HttpError.serviceUnavailable('Down', 120);
            expect(error.retryAfter).toBe(120);
        });
    });

    describe('utility methods', () => {
        it('should properly classify client and server errors', () => {
            const clientErr = HttpError.notFound();
            expect(clientErr.isClientError()).toBe(true);
            expect(clientErr.isServerError()).toBe(false);

            const serverErr = HttpError.badGateway();
            expect(serverErr.isClientError()).toBe(false);
            expect(serverErr.isServerError()).toBe(true);
        });

        it('should correctly convert unknown errors using fromError', () => {
            const standardError = new Error('Standard failure');
            const httpErr = HttpError.fromError(standardError);

            expect(httpErr.code).toBe(500);
            expect(httpErr.message).toBe('Standard failure');
            expect(httpErr.cause).toBe(standardError);
        });

        it('should use custom fallback via fromError when provided', () => {
            const standardError = new Error('Standard failure');
            const httpErr = HttpError.fromError(standardError, 400);

            expect(httpErr.code).toBe(400);
            expect(httpErr.message).toBe('Standard failure');
        });

        it('should identify HttpError instances correctly', () => {
            const err1 = new Error();
            const err2 = new HttpError(404);

            expect(HttpError.isHttpError(err1)).toBe(false);
            expect(HttpError.isHttpError(err2)).toBe(true);
        });

        it('should serialize correctly via toJSON', () => {
            const error = new HttpError(429, { retryAfter: 120, metadata: { limit: 100 } });
            const json = error.toJSON();

            expect(json.code).toBe(429);
            expect(json.retryAfter).toBe(120);
            expect(json.details).toBe('The user has sent too many requests in a given amount of time.');
            expect(json.metadata).toEqual({ limit: 100 });
            expect(json.name).toBe('HttpError');
        });

        it('should throw RangeError for invalid fallbackCode in fromError', () => {
            expect(() => HttpError.fromError(new Error('test'), 200)).toThrow(RangeError);
            expect(() => HttpError.fromError(new Error('test'), 99)).toThrow(RangeError);
        });

        it('should handle non-Error objects via fromError', () => {
            const httpErr = HttpError.fromError(42);
            expect(httpErr.message).toBe('42');
            expect(httpErr.code).toBe(500);
        });

        it('should create error from status code via fromStatus alias', () => {
            const err = HttpError.fromStatus(404);
            expect(err.code).toBe(404);
            expect(err.type).toBe('not_found');

            const errWithMsg = HttpError.fromStatus(500, { message: 'Custom' });
            expect(errWithMsg.message).toBe('Custom');
        });
    });

    describe('definition consistency (#5)', () => {
        it('should have matching code between key and value in HttpErrorDefinitions', () => {
            for (const [key, info] of Object.entries(HttpErrorDefinitions)) {
                expect(info.code).toBe(Number(key));
            }
        });

        it('should have matching code between key and value in HttpSuccessDefinitions', () => {
            for (const [key, info] of Object.entries(HttpSuccessDefinitions)) {
                expect(info.code).toBe(Number(key));
            }
        });

        it('should have matching code between key and value in HttpRedirectDefinitions', () => {
            for (const [key, info] of Object.entries(HttpRedirectDefinitions)) {
                expect(info.code).toBe(Number(key));
            }
        });

        it('should have matching code between key and value in HttpInfoDefinitions', () => {
            for (const [key, info] of Object.entries(HttpInfoDefinitions)) {
                expect(info.code).toBe(Number(key));
            }
        });
    });
});

