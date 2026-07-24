/**
 * Input robustness: a table of hostile values for every public parameter.
 * Covers C2 (NaN status code), M1 (retryAfter), M2 (pagination), M4 (CRLF
 * headers) and M7 (throwing user hooks). None of these may crash the process
 * or emit a malformed contract.
 */
import { describe, it, expect, vi } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { createResponseKit } from '../src/kit';

describe('Status code validation (C2)', () => {
    const bad = [NaN, Infinity, -Infinity, null, undefined, '404', 404.5, 0, 99, 999, -1, 200];
    for (const code of bad) {
        it(`rejects ${String(code)} with a RangeError (never code: null/NaN)`, () => {
            expect(() => new HttpError(code as unknown as number)).toThrow(RangeError);
        });
    }

    it('accepts unmapped but in-range integer codes', () => {
        expect(new HttpError(499).code).toBe(499);
        expect(new HttpError(599).code).toBe(599);
    });
});

describe('retryAfter validation (M1)', () => {
    for (const bad of [-5, NaN, Infinity, -Infinity, 1e21, 3.5]) {
        it(`rejects retryAfter=${String(bad)}`, () => {
            expect(() => new HttpError(429, { retryAfter: bad })).toThrow(RangeError);
        });
    }

    it('accepts a non-negative integer of seconds', () => {
        expect(new HttpError(429, { retryAfter: 0 }).getHeaders()['Retry-After']).toBe('0');
        expect(new HttpError(429, { retryAfter: 30 }).getHeaders()['Retry-After']).toBe('30');
    });

    it('accepts a Date and serializes it as an HTTP-date in the header only', () => {
        const when = new Date('2026-01-01T00:00:00.000Z');
        const err = new HttpError(503, { retryAfter: when });
        expect(err.getHeaders()['Retry-After']).toBe(when.toUTCString());
        const kit = createResponseKit({ includeTimestamp: false });
        // A Date retryAfter is not a valid body value: it must not appear as retry_after.
        expect((kit.error(err) as { retry_after?: unknown }).retry_after).toBeUndefined();
    });

    it('rejects an invalid Date', () => {
        expect(() => new HttpError(503, { retryAfter: new Date('nope') })).toThrow(RangeError);
    });
});

describe('CRLF header injection (M4)', () => {
    it('rejects CR/LF/NUL in header values at construction', () => {
        expect(() => new HttpError(401, { headers: { 'X-A': 'a\r\nX-Injected: 1' } })).toThrow(TypeError);
        expect(() => new HttpError(401, { headers: { 'X-A': 'a\nb' } })).toThrow(TypeError);
        expect(() => new HttpError(401, { headers: { 'X-A': 'a\0b' } })).toThrow(TypeError);
    });

    it('rejects CR/LF in header names', () => {
        expect(() => new HttpError(401, { headers: { 'X-A\r\nEvil': 'v' } })).toThrow(TypeError);
    });

    it('accepts normal headers', () => {
        expect(new HttpError(401, { headers: { 'WWW-Authenticate': 'Bearer realm="api"' } }).getHeaders()['WWW-Authenticate'])
            .toBe('Bearer realm="api"');
    });

    it('a defensive copy blocks CRLF injection via post-construction mutation', () => {
        const headers = { 'X-A': 'safe' };
        const err = new HttpError(401, { headers });
        headers['X-A'] = 'evil\r\nX-Injected: 1'; // mutate the caller's object afterwards
        expect(err.getHeaders()['X-A']).toBe('safe');
    });

    it('coerces header values to immutable strings (closes value-toString TOCTOU)', () => {
        let reads = 0;
        const evil = { toString() { reads++; return reads <= 1 ? 'safe' : 'evil\r\nX-Injected: 1'; } };
        const err = new HttpError(401, { headers: { 'X-A': evil as unknown as string } });
        expect(err.getHeaders()['X-A']).toBe('safe'); // stored primitive, not the mutating object
        expect(typeof err.headers!['X-A']).toBe('string');
    });

    it('rejects a header value whose coercion contains CRLF', () => {
        const evil = { toString() { return 'evil\r\nX-Injected: 1'; } };
        expect(() => new HttpError(401, { headers: { 'X-A': evil as unknown as string } })).toThrow(TypeError);
    });
});

describe('Pagination normalization (M2)', () => {
    const kit = createResponseKit({ includeTimestamp: false });

    it('clamps negative/zero/non-integer page, limit and total uniformly', () => {
        const res = kit.paginated([], { page: -5, limit: 0, total: -10 });
        const p = (res.metadata as { pagination: Record<string, number> }).pagination;
        expect(p.page).toBe(1);
        expect(p.limit).toBe(1);
        expect(p.total).toBe(0);
        expect(p.total_pages).toBe(0);
        expect(p.has_prev).toBe(false);
        expect(p.has_next).toBe(false);
    });

    it('never emits a negative page with has_prev false (the audit case)', () => {
        const res = kit.paginated([], { page: -5, limit: 20, total: 100 });
        const p = (res.metadata as { pagination: Record<string, number | boolean> }).pagination;
        expect(p.page).toBe(1);
        expect(p.has_prev).toBe(false);
    });

    it('floors non-integer inputs', () => {
        const res = kit.paginated([], { page: 2.9, limit: 3.9, total: 10.9 });
        const p = (res.metadata as { pagination: Record<string, number> }).pagination;
        expect(p.page).toBe(2);
        expect(p.limit).toBe(3);
        expect(p.total).toBe(10);
    });

    it('handles values beyond MAX_SAFE_INTEGER without producing NaN', () => {
        const res = kit.paginated([], { page: 1, limit: Number.MAX_SAFE_INTEGER, total: Number.MAX_SAFE_INTEGER });
        const p = (res.metadata as { pagination: Record<string, number> }).pagination;
        expect(Number.isFinite(p.total_pages)).toBe(true);
    });
});

describe('Throwing user hooks are contained (M7)', () => {
    it('a throwing messageResolver falls back and preserves the status', () => {
        const onHookError = vi.fn();
        const kit = createResponseKit({
            includeTimestamp: false,
            messageResolver: () => { throw new Error('resolver boom'); },
            onHookError,
        });
        const res = kit.error(HttpError.notFound('User missing'));
        expect(res.status_code).toBe(404);
        expect(res.error.message).toBe('User missing');
        expect(onHookError).toHaveBeenCalledWith('messageResolver', expect.any(Error));
    });

    it('a throwing metadataSanitizer fails closed (metadata omitted)', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            metadataSanitizer: () => { throw new Error('sanitizer boom'); },
        });
        const res = kit.error(HttpError.badRequest('bad', { secret: 'x' }));
        expect(res.status_code).toBe(400);
        expect(res.metadata).toBeUndefined();
    });

    it('a throwing responseTransformer falls back to the untransformed response', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            responseTransformer: () => { throw new Error('transformer boom'); },
        });
        const res = kit.ok({ id: 1 });
        expect(res.success).toBe(true);
        expect(res.data).toEqual({ id: 1 });
    });

    it('a transformer that mutates in place then throws does not corrupt the fallback (incl. nested)', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            responseTransformer: (r) => {
                r.injected = 'LEAK';
                delete r.status_code;
                // nested mutation of the sanitized error object (the dangerous case)
                (r.error as Record<string, unknown>).message = 'INTERNAL SECRET leaked';
                throw new Error('transformer boom');
            },
        });
        const res = kit.error(HttpError.internalServerError('db password'));
        expect(res.status_code).toBe(500); // top-level core field preserved
        expect(res.injected).toBeUndefined(); // no leaked field
        // nested error.message must remain the sanitized fallback, not the leaked value
        expect(res.error.message).toBe('An unexpected error occurred on the server.');
    });

    it('protects nested error/data even when the payload is non-cloneable (structuredClone fallback)', () => {
        // A function in the response makes structuredClone throw, forcing the deep-clone
        // fallback — which must still isolate nested mutations (not a shallow copy).
        const kit = createResponseKit({
            includeTimestamp: false,
            responseTransformer: (r) => {
                (r.error as Record<string, unknown>).message = 'LEAKED SECRET';
                throw new Error('transformer boom');
            },
        });
        const res = kit.error(HttpError.internalServerError('db pw'), {
            additionalFields: { debugFn: (() => 42) as unknown as string },
        });
        expect(res.status_code).toBe(500);
        expect(res.error.message).toBe('An unexpected error occurred on the server.');
    });

    it('protects nested success data in the non-cloneable fallback path', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            responseTransformer: (r) => {
                const data = r.data as Record<string, unknown>;
                data.keep = 'CORRUPTED';
                data.secret = 'LEAK';
                throw new Error('transformer boom');
            },
        });
        const res = kit.success({ data: { keep: 'ORIGINAL', fn: () => 42 } });
        const data = res.data as Record<string, unknown>;
        expect(data.keep).toBe('ORIGINAL');
        expect(data.secret).toBeUndefined();
    });

    it('a throwing requestIdProvider is swallowed', () => {
        const kit = createResponseKit({
            includeTimestamp: false,
            requestIdProvider: () => { throw new Error('provider boom'); },
        });
        expect(kit.ok({ id: 1 }).request_id).toBeUndefined();
    });
});
