/**
 * HTTP Response Kit - JSON Schemas
 *
 * Machine-readable JSON Schema (draft 2020-12) definitions of the response
 * shapes, usable for contract testing, gateway validation, and OpenAPI specs.
 *
 * The shapes depend on the kit's `casing`: a kit configured with
 * `casing: 'camel'` emits `statusCode`/`requestId`/`retryAfter` instead of the
 * snake_case defaults. Generate the matching schema with {@link schemas}:
 *
 * ```ts
 * import { schemas } from 'http-response-kit/schemas';
 * const { errorResponseSchema } = schemas({ casing: 'camel' });
 * ```
 *
 * The top-level named exports (`successResponseSchema`, ...) are the snake_case
 * variant, kept for backward compatibility.
 *
 * @module schemas
 */

/** Output key casing a schema set describes. */
export type SchemaCasing = 'snake' | 'camel';

const validationIssueSchema = {
    type: 'object',
    required: ['field', 'message'],
    properties: {
        field: { type: 'string', description: 'Field/path that failed validation' },
        message: { type: 'string', description: 'Human-readable description' },
        code: { type: 'string', description: 'Stable machine-readable code' },
    },
    additionalProperties: false,
} as const;

/** Envelope keys that change with casing (inner `error.*` members never do). */
const CASED = {
    status_code: { snake: 'status_code', camel: 'statusCode' },
    request_id: { snake: 'request_id', camel: 'requestId' },
    retry_after: { snake: 'retry_after', camel: 'retryAfter' },
} as const;

const key = (casing: SchemaCasing, k: keyof typeof CASED): string => CASED[k][casing];
const suffix = (casing: SchemaCasing): string => (casing === 'camel' ? '.camel' : '');

/** A single JSON Schema object (draft 2020-12). */
export type JsonSchema = Record<string, unknown>;

/** The complete set of response schemas for one casing. */
export interface SchemaSet {
    successResponseSchema: JsonSchema;
    errorResponseSchema: JsonSchema;
    problemDetailsSchema: JsonSchema;
    openApiComponents: JsonSchema;
}

function buildSuccessSchema(casing: SchemaCasing): JsonSchema {
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: `https://github.com/matteo-teodori/http-response-kit/schemas/success-response${suffix(casing)}.json`,
        title: 'SuccessResponse',
        type: 'object',
        required: ['success', key(casing, 'status_code')],
        properties: {
            success: { const: true },
            [key(casing, 'status_code')]: { type: 'integer', minimum: 100, maximum: 399 },
            timestamp: { type: 'string', format: 'date-time' },
            [key(casing, 'request_id')]: { type: 'string' },
            data: {},
            message: { type: 'string' },
            metadata: { type: 'object' },
        },
    };
}

function buildErrorSchema(casing: SchemaCasing): JsonSchema {
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: `https://github.com/matteo-teodori/http-response-kit/schemas/error-response${suffix(casing)}.json`,
        title: 'ErrorResponse',
        type: 'object',
        required: ['success', key(casing, 'status_code'), 'error'],
        properties: {
            success: { const: false },
            [key(casing, 'status_code')]: { type: 'integer', minimum: 400, maximum: 599 },
            timestamp: { type: 'string', format: 'date-time' },
            [key(casing, 'request_id')]: { type: 'string' },
            [key(casing, 'retry_after')]: { type: 'number' },
            error: {
                type: 'object',
                required: ['type', 'title', 'message'],
                properties: {
                    type: { type: 'string' },
                    title: { type: 'string' },
                    message: { type: 'string' },
                    code: { type: 'string' },
                    details: { type: 'string' },
                    errors: { type: 'array', items: validationIssueSchema },
                    stack: { type: 'string' },
                    causes: { type: 'array', items: { type: 'string' } },
                },
            },
            metadata: { type: 'object' },
        },
    };
}

/**
 * RFC 9457 Problem Details schema. This shape is casing-independent: Problem
 * Details always use the RFC member names (`type`/`title`/`status`/`detail`/
 * `instance`) and the kit never applies casing to problem output.
 */
function buildProblemSchema(): JsonSchema {
    return {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        $id: 'https://github.com/matteo-teodori/http-response-kit/schemas/problem-details.json',
        title: 'ProblemDetails',
        description: 'RFC 9457 Problem Details for HTTP APIs',
        type: 'object',
        required: ['type', 'title', 'status'],
        properties: {
            type: { type: 'string', format: 'uri-reference', default: 'about:blank' },
            title: { type: 'string' },
            status: { type: 'integer', minimum: 100, maximum: 599 },
            detail: { type: 'string' },
            instance: { type: 'string', format: 'uri-reference' },
            code: { type: 'string' },
            errors: { type: 'array', items: validationIssueSchema },
            request_id: { type: 'string' },
        },
    };
}

function buildOpenApiComponents(set: Omit<SchemaSet, 'openApiComponents'>): JsonSchema {
    return {
        schemas: {
            SuccessResponse: set.successResponseSchema,
            ErrorResponse: set.errorResponseSchema,
            ProblemDetails: set.problemDetailsSchema,
        },
        responses: {
            BadRequest: {
                description: 'Bad Request',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            Unauthorized: {
                description: 'Unauthorized',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            Forbidden: {
                description: 'Forbidden',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            NotFound: {
                description: 'Not Found',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            UnprocessableEntity: {
                description: 'Validation failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            TooManyRequests: {
                description: 'Too Many Requests',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            InternalServerError: {
                description: 'Internal Server Error',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
            },
            Problem: {
                description: 'RFC 9457 Problem Details',
                content: { 'application/problem+json': { schema: { $ref: '#/components/schemas/ProblemDetails' } } },
            },
        },
    };
}

/**
 * Build the JSON Schema set matching a kit configuration.
 *
 * @example
 * ```ts
 * import { schemas } from 'http-response-kit/schemas';
 * const { successResponseSchema, errorResponseSchema } = schemas({ casing: 'camel' });
 * ```
 */
export function schemas(options: { casing?: SchemaCasing } = {}): SchemaSet {
    const casing = options.casing ?? 'snake';
    const successResponseSchema = buildSuccessSchema(casing);
    const errorResponseSchema = buildErrorSchema(casing);
    const problemDetailsSchema = buildProblemSchema();
    const openApiComponents = buildOpenApiComponents({
        successResponseSchema,
        errorResponseSchema,
        problemDetailsSchema,
    });
    return { successResponseSchema, errorResponseSchema, problemDetailsSchema, openApiComponents };
}

// ---------------------------------------------------------------------------
// Backward-compatible snake_case exports (the default profile).
// ---------------------------------------------------------------------------

const snake = schemas({ casing: 'snake' });

/** JSON Schema for the standard success envelope (snake_case). */
export const successResponseSchema = snake.successResponseSchema;
/** JSON Schema for the standard error envelope (snake_case). */
export const errorResponseSchema = snake.errorResponseSchema;
/** JSON Schema for RFC 9457 Problem Details (with common extensions). */
export const problemDetailsSchema = snake.problemDetailsSchema;
/** Ready-to-merge OpenAPI 3.1 `components` fragment (snake_case envelopes). */
export const openApiComponents = snake.openApiComponents;
