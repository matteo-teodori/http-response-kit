/**
 * Regression test for H5 (dual package hazard): an ESM-created HttpError and a
 * CJS-required HttpError are different class identities, so `instanceof` fails
 * across the boundary. The `Symbol.for` brand must make them recognize each
 * other regardless of realm.
 */
import test from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { HttpError as EsmHttpError } from '../../dist/index.mjs';

const require = createRequire(import.meta.url);
const cjs = require('../../dist/index.js');

test('ESM error is recognized by the CJS copy of the class (H5)', () => {
    const esmErr = EsmHttpError.notFound('x');
    assert.strictEqual(cjs.HttpError.isHttpError(esmErr), true);
});

test('CJS error is recognized by the ESM copy of the class (H5)', () => {
    const cjsErr = cjs.HttpError.notFound('y');
    assert.strictEqual(EsmHttpError.isHttpError(cjsErr), true);
});

test('fromError passes a foreign-realm HttpError through unchanged', () => {
    const esmErr = EsmHttpError.notFound('z');
    assert.strictEqual(cjs.HttpError.fromError(esmErr), esmErr);
});
