import { describe, it, expect, expectTypeOf } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { createResponseKit } from '../src/kit';
import type { ErrorResponse, SuccessResponse, ProblemDetails } from '../src/types';

const kit = createResponseKit({ includeTimestamp: false });

describe('Security: expose semantics', () => {
    it('4xx errors are exposable by default, 5xx are not', () => {
        expect(HttpError.badRequest('x').expose).toBe(true);
        expect(HttpError.internalServerError('x').expose).toBe(false);
        expect(HttpError.badGateway('x').expose).toBe(false);
    });

    it('expose can be forced per error', () => {
        const err = new HttpError(500, { message: 'Maintenance until 5pm', expose: true });
        expect(kit.error(err).error.message).toBe('Maintenance until 5pm');
    });

    it('safeMessage reflects expose', () => {
        const err = HttpError.internalServerError('internal detail');
        expect(err.safeMessage).toBe('An unexpected error occurred on the server.');
        expect(err.message).toBe('internal detail'); // full message for logging
    });

    it('getHeaders returns Retry-After and custom headers', () => {
        const err = new HttpError(401, { headers: { 'WWW-Authenticate': 'Bearer realm="api"' } });
        expect(err.getHeaders()['WWW-Authenticate']).toBe('Bearer realm="api"');

        const rate = HttpError.tooManyRequests('slow', 42);
        expect(rate.getHeaders()['Retry-After']).toBe('42');
    });

    it('cause chain is tracked but not leaked', () => {
        const root = new Error('root');
        const wrapped = HttpError.fromError(new Error('mid', { cause: root }));
        expect(wrapped.getCauseChain()).toEqual(['Error: mid', 'Error: root']);
        const res = kit.error(wrapped, { includeStack: false });
        expect(JSON.stringify(res)).not.toContain('root');
    });
});

describe('Type-level contracts', () => {
    it('response types are discriminated by success', () => {
        expectTypeOf<SuccessResponse['success']>().toEqualTypeOf<true>();
        expectTypeOf<ErrorResponse['success']>().toEqualTypeOf<false>();
        expectTypeOf<ProblemDetails['status']>().toEqualTypeOf<number>();
    });

    it('generic data typing flows through', () => {
        interface User { id: number }
        const res = kit.ok<User>({ id: 1 });
        expectTypeOf(res.data).toEqualTypeOf<User | undefined>();
    });
});
