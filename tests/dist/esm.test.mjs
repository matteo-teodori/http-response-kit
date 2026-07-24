/**
 * ESM smoke test against the compiled artifact: core + an adapter loaded as
 * real ES modules, error detection working end to end.
 */
import test from 'node:test';
import assert from 'node:assert';
import { HttpError, createResponseKit } from '../../dist/index.mjs';
import { errorHandler } from '../../dist/express.mjs';

test('ESM: errorHandler recognizes a core HttpError -> 404', () => {
    const kit = createResponseKit({ includeTimestamp: false });
    let status = 0;
    let body;
    const res = {
        headersSent: false,
        setHeader() {},
        status(code) { status = code; return this; },
        json(payload) { body = payload; return this; },
    };
    errorHandler({ kit })(HttpError.notFound('nope'), { headers: {} }, res, () => {});
    assert.strictEqual(status, 404);
    assert.strictEqual(body.error.type, 'not_found');
});

test('ESM: isHttpError brand works', () => {
    assert.strictEqual(HttpError.isHttpError(HttpError.forbidden('x')), true);
});
