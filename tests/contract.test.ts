/**
 * Contract conformance: validate the kit's *actual* output against its *own*
 * published JSON Schemas, for every combination of `casing` and `format`.
 *
 * This is the test class that was missing and would have caught H4 (schemas
 * only described snake_case) and H1 (adapter output diverging from the kit):
 * a camelCase kit was producing responses that violated the shipped schemas.
 */
import { describe, it, expect, vi } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import type { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { createResponseKit } from '../src/kit';
import { createApi } from '../src/api';
import { HttpError } from '../src/errors/HttpError';
import { schemas, type SchemaCasing } from '../src/schemas';
import type { ResponseCasing, ResponseFormat } from '../src/types';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

// Compile every schema variant once.
const compiled: Record<string, ValidateFunction> = {};
for (const casing of ['snake', 'camel'] as SchemaCasing[]) {
    const set = schemas({ casing });
    compiled[`success:${casing}`] = ajv.compile(set.successResponseSchema);
    compiled[`error:${casing}`] = ajv.compile(set.errorResponseSchema);
}
const problemValidate = ajv.compile(schemas().problemDetailsSchema);

function assertValid(validate: ValidateFunction, value: unknown, label: string): void {
    const ok = validate(value);
    if (!ok) {
        throw new Error(`${label} failed schema:\n${ajv.errorsText(validate.errors, { separator: '\n' })}\n${JSON.stringify(value, null, 2)}`);
    }
    expect(ok).toBe(true);
}

const CASINGS: ResponseCasing[] = ['snake', 'camel'];
const FORMATS: ResponseFormat[] = ['standard', 'problem'];

describe('Schema shape', () => {
    it('snake variant requires status_code; camel variant requires statusCode', () => {
        expect(schemas({ casing: 'snake' }).successResponseSchema.required).toContain('status_code');
        expect(schemas({ casing: 'camel' }).successResponseSchema.required).toContain('statusCode');
        expect(schemas({ casing: 'camel' }).errorResponseSchema.required).toContain('statusCode');
    });

    it('the default named exports are the snake variant', () => {
        expect(schemas().successResponseSchema.required).toContain('status_code');
    });

    it('problem schema is casing-independent (RFC member names)', () => {
        expect(schemas({ casing: 'camel' }).problemDetailsSchema.required).toEqual(['type', 'title', 'status']);
    });

    it('openApiComponents exposes the three schemas + a Problem response', () => {
        const c = schemas().openApiComponents as {
            schemas: Record<string, unknown>;
            responses: { Problem: { content: Record<string, unknown> } };
        };
        expect(Object.keys(c.schemas)).toEqual(['SuccessResponse', 'ErrorResponse', 'ProblemDetails']);
        expect(c.responses.Problem.content['application/problem+json']).toBeDefined();
    });
});

describe('Output conforms to the matching schema for every casing x format', () => {
    for (const casing of CASINGS) {
        for (const format of FORMATS) {
            const label = `${casing}/${format}`;
            const kit = createResponseKit({ includeTimestamp: false, casing, format });
            const successValidate = compiled[`success:${casing}`]!;
            const errorValidate = compiled[`error:${casing}`]!;

            it(`ok() [${label}]`, () => {
                assertValid(successValidate, kit.ok({ id: 1 }), `ok ${label}`);
            });
            it(`paginated() [${label}]`, () => {
                assertValid(successValidate, kit.paginated([1, 2], { page: 1, limit: 2, total: 4 }), `paginated ${label}`);
            });
            // kit.error() is always the standard envelope, regardless of format.
            it(`error() [${label}]`, () => {
                assertValid(errorValidate, kit.error(HttpError.notFound('nope')), `error ${label}`);
            });
            it(`validation error [${label}]`, () => {
                const err = HttpError.validation([{ field: 'email', message: 'bad', code: 'invalid' }]);
                assertValid(errorValidate, kit.error(err), `validation ${label}`);
            });
            // kit.problem() is always RFC 9457 Problem Details (casing-independent).
            it(`problem() [${label}]`, () => {
                assertValid(problemValidate, kit.problem(HttpError.notFound('nope')), `problem ${label}`);
            });
            it(`problem validation [${label}]`, () => {
                const err = HttpError.validation([{ field: 'email', message: 'bad', code: 'invalid' }]);
                assertValid(problemValidate, kit.problem(err), `problem validation ${label}`);
            });
        }
    }
});

function mockExpressRes() {
    const res: {
        headers: Record<string, string>;
        statusCode: number;
        body: unknown;
        headersSent: boolean;
        setHeader: (n: string, v: string) => void;
        status: (c: number) => typeof res;
        json: (b: unknown) => typeof res;
    } = {
        headers: {},
        statusCode: 0,
        body: undefined,
        headersSent: false,
        setHeader(n, v) { this.headers[n] = v; },
        status(c) { this.statusCode = c; return this; },
        json(b) { this.body = b; return this; },
    };
    return res;
}

describe('createApi: adapter output never diverges from the kit (H1)', () => {
    for (const casing of CASINGS) {
        for (const format of FORMATS) {
            const label = `${casing}/${format}`;
            it(`success and error share casing+format [${label}]`, () => {
                const api = createApi({ includeTimestamp: false, casing, format });
                const res = mockExpressRes();
                api.express.errorHandler()(HttpError.notFound('nope'), { headers: {} }, res, vi.fn());

                // The adapter's error body must be exactly what the kit itself
                // produces: kit.problem() under problem format, kit.error() otherwise.
                const direct = format === 'problem'
                    ? api.kit.problem(HttpError.notFound('nope'))
                    : api.kit.error(HttpError.notFound('nope'));
                expect(res.body).toEqual(direct);

                // And the success envelope uses the same casing.
                const ok = api.kit.ok({ id: 1 });
                if (casing === 'camel') {
                    expect(ok).toHaveProperty('statusCode', 200);
                    expect(ok).not.toHaveProperty('status_code');
                } else {
                    expect(ok).toHaveProperty('status_code', 200);
                }

                // Problem format => problem+json content type & body.
                if (format === 'problem') {
                    expect(res.headers['Content-Type']).toBe('application/problem+json');
                    assertValid(problemValidate, res.body, `adapter problem ${label}`);
                } else {
                    assertValid(compiled[`error:${casing}`]!, res.body, `adapter error ${label}`);
                }
            });
        }
    }
});
