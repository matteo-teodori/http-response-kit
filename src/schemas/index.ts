/**
 * HTTP Response Kit - JSON Schemas
 *
 * Machine-readable JSON Schema (draft 2020-12) definitions of the response
 * shapes, usable for contract testing, gateway validation, and OpenAPI specs.
 *
 * Import from the dedicated subpath to keep your main bundle lean:
 * `import { errorResponseSchema } from 'http-response-kit/schemas'`
 *
 * @module schemas
 */

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

/** JSON Schema for the standard success envelope */
export const successResponseSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/matteo-teodori/http-response-kit/schemas/success-response.json',
    title: 'SuccessResponse',
    type: 'object',
    required: ['success', 'status_code'],
    properties: {
        success: { const: true },
        status_code: { type: 'integer', minimum: 100, maximum: 399 },
        timestamp: { type: 'string', format: 'date-time' },
        request_id: { type: 'string' },
        data: {},
        message: { type: 'string' },
        metadata: { type: 'object' },
    },
} as const;

/** JSON Schema for the standard error envelope */
export const errorResponseSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/matteo-teodori/http-response-kit/schemas/error-response.json',
    title: 'ErrorResponse',
    type: 'object',
    required: ['success', 'status_code', 'error'],
    properties: {
        success: { const: false },
        status_code: { type: 'integer', minimum: 400, maximum: 599 },
        timestamp: { type: 'string', format: 'date-time' },
        request_id: { type: 'string' },
        retry_after: { type: 'number' },
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
} as const;

/** JSON Schema for RFC 9457 Problem Details (with common extensions) */
export const problemDetailsSchema = {
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
} as const;

/**
 * Ready-to-merge OpenAPI 3.1 `components` fragment.
 *
 * @example
 * ```ts
 * const spec = { openapi: '3.1.0', ...yourSpec, components: { schemas: { ...openApiComponents.schemas } } };
 * ```
 */
export const openApiComponents = {
    schemas: {
        SuccessResponse: successResponseSchema,
        ErrorResponse: errorResponseSchema,
        ProblemDetails: problemDetailsSchema,
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
} as const;
