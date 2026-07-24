/**
 * Regression test for C1: in CommonJS the class is inlined into every entry
 * point, so `instanceof` across entries fails. Exercising the COMPILED artifact
 * (not src) is the only way to catch it. This is the exact repro from the audit.
 */
const test = require('node:test');
const assert = require('node:assert');
const core = require('../../dist/index.js');
const express = require('../../dist/express.js');

test('CJS: errorHandler recognizes a core HttpError -> 404, not 500 (C1)', () => {
    const err = core.HttpError.notFound('nope');
    let status = 0;
    let body;
    const res = {
        headersSent: false,
        setHeader() {},
        status(code) { status = code; return this; },
        json(payload) { body = payload; return this; },
    };
    express.errorHandler()(err, { headers: {} }, res, () => {});
    assert.strictEqual(status, 404, 'expected 404 (got 500 => C1 regressed)');
    assert.strictEqual(body.error.type, 'not_found');
});

test('CJS: isHttpError is true for instances from a different entry point', () => {
    assert.strictEqual(core.HttpError.isHttpError(core.HttpError.badRequest('x')), true);
    assert.strictEqual(core.HttpError.isHttpError(new Error('x')), false);
});

test('CJS: createApi wires the adapter to the kit (problem format)', () => {
    const { express: ex } = core.createApi({ includeTimestamp: false, format: 'problem' });
    let status = 0;
    let body;
    let contentType;
    const res = {
        headersSent: false,
        setHeader(name, value) { if (name === 'Content-Type') contentType = value; },
        status(code) { status = code; return this; },
        json(payload) { body = payload; return this; },
    };
    ex.errorHandler()(core.HttpError.notFound('nope'), { headers: {} }, res, () => {});
    assert.strictEqual(status, 404);
    assert.strictEqual(contentType, 'application/problem+json');
    assert.strictEqual(body.status, 404);
    assert.strictEqual(body.title, 'Not Found');
});
