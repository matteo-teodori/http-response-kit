/**
 * HTTP Response Kit - Example Usage (v2, kit-only API)
 * Run with: npx tsx examples/basic-usage.ts
 */

import {
    createResponseKit,
    createErrorCatalog,
    HttpError,
    PROBLEM_CONTENT_TYPE,
    isErrorResponse,
} from '../src';

// ============================================================================
// 1. Create your kit (the single entry point - no global state)
// ============================================================================

const api = createResponseKit({
    isDevelopment: process.env.NODE_ENV === 'development',
    customMessages: { 404: 'Nothing to see here.' },
});

// ============================================================================
// 2. Success responses
// ============================================================================

interface User { id: number; name: string }

console.log(api.ok<User>({ id: 1, name: 'John' }, 'User retrieved'));
console.log(api.created({ id: 2 }));
console.log(api.paginated([1, 2, 3], { page: 1, limit: 3, total: 9 }));
console.log(api.paginatedCursor([1, 2, 3], { nextCursor: 'abc', limit: 3 }));

// ============================================================================
// 3. Errors - secure by default
// ============================================================================

// 4xx: message reaches the client
console.log(api.error(HttpError.notFound('User with ID 999 not found')));

// 5xx: internal message NEVER reaches the client (stays on the instance for logs)
const internal = HttpError.fromError(new Error('ECONNREFUSED db:5432'));
console.log(internal.message);                  // full detail, for your logger
console.log(api.error(internal).error.message); // generic, for the client

// Explicit opt-in when a 5xx message IS meant for clients
console.log(api.error(new HttpError(503, { message: 'Maintenance until 17:00 UTC', expose: true })));

// ============================================================================
// 4. Structured validation errors
// ============================================================================

const validation = HttpError.validation([
    { field: 'email', message: 'Invalid email format', code: 'invalid_format' },
]);
console.log(api.error(validation).error.errors);

// ============================================================================
// 5. RFC 9457 Problem Details
// ============================================================================

const problem = api.problem(HttpError.notFound('User not found'), {
    typeBase: 'https://errors.example.com',
    instance: '/users/42',
    requestId: 'req-123',
});
console.log(PROBLEM_CONTENT_TYPE, problem);

// ============================================================================
// 6. Domain error catalog (stable machine-readable codes)
// ============================================================================

const Errors = createErrorCatalog({
    USER_NOT_FOUND: { status: 404, message: 'User does not exist' },
    PLAN_LIMIT_REACHED: { status: 402, message: 'Upgrade your plan' },
});
console.log(api.error(Errors.USER_NOT_FOUND()).error.code); // 'USER_NOT_FOUND'

// ============================================================================
// 7. Type guards
// ============================================================================

const res = api.fromError(new Error('boom'));
if (isErrorResponse(res)) {
    console.log('status:', res.status_code);
}
