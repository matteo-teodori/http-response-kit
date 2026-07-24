/**
 * Request-context integration (D2): a correlation id set once in an
 * AsyncLocalStorage store must flow into BOTH success and error responses via
 * `requestIdProvider`, without being passed explicitly to each call.
 */
import { describe, it, expect } from 'vitest';
import { createRequestContext } from '../src/context';
import { createResponseKit } from '../src/kit';
import { HttpError } from '../src/errors/HttpError';

describe('createRequestContext', () => {
    it('propagates requestId into success and error responses automatically', () => {
        const ctx = createRequestContext();
        const kit = createResponseKit({ includeTimestamp: false, requestIdProvider: () => ctx.getRequestId() });

        ctx.run({ requestId: 'req-42' }, () => {
            expect(kit.ok({ id: 1 }).request_id).toBe('req-42');
            expect(kit.error(HttpError.notFound()).request_id).toBe('req-42');
        });
    });

    it('an explicit requestId still wins over the provider', () => {
        const ctx = createRequestContext();
        const kit = createResponseKit({ includeTimestamp: false, requestIdProvider: () => ctx.getRequestId() });
        ctx.run({ requestId: 'from-context' }, () => {
            expect(kit.success({ requestId: 'explicit' }).request_id).toBe('explicit');
        });
    });

    it('returns undefined outside any run() scope', () => {
        const ctx = createRequestContext();
        expect(ctx.get()).toBeUndefined();
        expect(ctx.getRequestId()).toBeUndefined();
    });

    it('stores are isolated from each other', () => {
        const a = createRequestContext();
        const b = createRequestContext();
        a.run({ requestId: 'a' }, () => {
            expect(a.getRequestId()).toBe('a');
            expect(b.getRequestId()).toBeUndefined();
        });
    });
});
