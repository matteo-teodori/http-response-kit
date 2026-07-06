import { describe, it, expect } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { mapSystemError, SystemErrorStatusMap } from '../src/errors/system-errors';
import { createResponseKit } from '../src/kit';

function sysError(code: string, message = `syscall failed: ${code}`): Error {
    const err = new Error(message) as Error & { code: string };
    err.code = code;
    return err;
}

describe('System/socket error mapping', () => {
    const kit = createResponseKit({ includeTimestamp: false });

    it('maps connection failures to 502', () => {
        for (const code of ['ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ENOTFOUND', 'EHOSTUNREACH']) {
            const mapped = mapSystemError(sysError(code));
            expect(mapped?.code, code).toBe(502);
            expect(mapped?.errorCode).toBe(code);
            expect(mapped?.expose).toBe(false);
        }
    });

    it('maps timeouts to 504', () => {
        for (const code of ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT']) {
            expect(mapSystemError(sysError(code))?.code, code).toBe(504);
        }
    });

    it('maps temporary conditions to 503', () => {
        for (const code of ['EAI_AGAIN', 'EMFILE', 'ENOBUFS']) {
            expect(mapSystemError(sysError(code))?.code, code).toBe(503);
        }
    });

    it('finds codes buried in the cause chain (Node fetch failed)', () => {
        // Node 18+ fetch: TypeError('fetch failed', { cause: <undici error with code> })
        const fetchFailed = new TypeError('fetch failed');
        (fetchFailed as any).cause = sysError('ECONNREFUSED', 'connect ECONNREFUSED 10.0.0.5:5432');
        const mapped = mapSystemError(fetchFailed);
        expect(mapped?.code).toBe(502);
        expect(mapped?.errorCode).toBe('ECONNREFUSED');
    });

    it('returns undefined for non-system errors', () => {
        expect(mapSystemError(new Error('plain'))).toBeUndefined();
        expect(mapSystemError('string')).toBeUndefined();
        expect(mapSystemError(null)).toBeUndefined();
        expect(mapSystemError(sysError('SOMETHING_ELSE'))).toBeUndefined();
    });

    it('fromError applies the mapping automatically', () => {
        const err = HttpError.fromError(sysError('ETIMEDOUT', 'connect ETIMEDOUT 10.0.0.9:443'));
        expect(err.code).toBe(504);
        expect(err.errorCode).toBe('ETIMEDOUT');
        expect(err.message).toBe('connect ETIMEDOUT 10.0.0.9:443'); // kept for logs
    });

    it('never leaks socket details to clients', () => {
        const response = kit.fromError(sysError('ECONNREFUSED', 'connect ECONNREFUSED db.internal:5432'));
        expect(response.status_code).toBe(502);
        expect(response.error.code).toBe('ECONNREFUSED');
        expect(JSON.stringify(response)).not.toContain('db.internal');
    });

    it('HttpError instances pass through untouched even with a code property', () => {
        const original = HttpError.badRequest('nope');
        expect(HttpError.fromError(original)).toBe(original);
    });

    it('map is frozen and only contains 5xx statuses', () => {
        expect(Object.isFrozen(SystemErrorStatusMap)).toBe(true);
        for (const status of Object.values(SystemErrorStatusMap)) {
            expect(status).toBeGreaterThanOrEqual(502);
            expect(status).toBeLessThanOrEqual(504);
        }
    });
});
