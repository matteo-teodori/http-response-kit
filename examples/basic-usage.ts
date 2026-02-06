/**
 * HTTP Response Kit - Example Usage
 * Run with: npx ts-node examples/basic-usage.ts
 */

import {
    HttpError,
    HttpResponse,
    configure,
    HttpClientErrorCode
} from '../src';

// ============================================================================
// Configuration
// ============================================================================

console.log('🔧 Configuring library...\n');

configure({
    isDevelopment: true,
    includeTimestamp: true,
    customMessages: {
        404: 'Oops! This page went on vacation 🏝️'
    },
});

// ============================================================================
// HttpError Examples
// ============================================================================

console.log('📛 HttpError Examples\n');

// Using factory methods
const notFoundError = HttpError.notFound('User with ID 123 not found');
console.log('NotFound Error:', {
    code: notFoundError.code,
    type: notFoundError.type,
    title: notFoundError.title,
    message: notFoundError.message,
});

// Using constructor with options
const validationError = new HttpError(HttpClientErrorCode.BAD_REQUEST, {
    message: 'Validation failed',
    metadata: {
        fields: ['email', 'password'],
        errors: ['Email is invalid', 'Password too short'],
    },
});
console.log('\nValidation Error:', validationError.toJSON());

// With retry-after
const rateLimitError = HttpError.tooManyRequests('Too many requests', 60);
console.log('\nRate Limit Error:', {
    code: rateLimitError.code,
    retryAfter: rateLimitError.retryAfter,
});

// Check error type
console.log('\nIs client error?', notFoundError.isClientError()); // true
console.log('Is server error?', notFoundError.isServerError()); // false

// ============================================================================
// HttpResponse Examples
// ============================================================================

console.log('\n\n📦 HttpResponse Examples\n');

// Success response
const successResponse = HttpResponse.success({
    data: { id: 1, name: 'John Doe', email: 'john@example.com' },
    message: 'User retrieved successfully',
});
console.log('Success Response:', JSON.stringify(successResponse, null, 2));

// Created response
const createdResponse = HttpResponse.created(
    { id: 2, name: 'Jane Doe' },
    'User created successfully'
);
console.log('\nCreated Response:', JSON.stringify(createdResponse, null, 2));

// Error response
const errorResponse = HttpResponse.error(notFoundError);
console.log('\nError Response:', JSON.stringify(errorResponse, null, 2));

// Paginated response
const paginatedResponse = HttpResponse.paginated(
    [{ id: 1 }, { id: 2 }, { id: 3 }],
    { page: 1, limit: 10, total: 100 },
    'Users retrieved'
);
console.log('\nPaginated Response:', JSON.stringify(paginatedResponse, null, 2));

// ============================================================================
// Express-like Usage Example
// ============================================================================

console.log('\n\n🌐 Express-like Usage Example\n');

// Simulating an Express request handler
async function getUserById(id: string) {
    // Simulate database lookup
    if (id === '123') {
        return { id: '123', name: 'John Doe' };
    }
    return null;
}

async function handleRequest(userId: string) {
    try {
        const user = await getUserById(userId);

        if (!user) {
            throw HttpError.notFound(`User with ID ${userId} not found`);
        }

        // Return SuccessResponse directly - status_code is already inside!
        return HttpResponse.ok(user, 'User found');
    } catch (error) {
        // Return ErrorResponse directly - status_code is already inside!
        const httpError = HttpError.fromError(error);
        return HttpResponse.error(httpError);
    }
}

// Test with existing user
handleRequest('123').then((response) => {
    console.log('Request for user 123:');
    console.log(`  Status: ${response.status_code}`);
    console.log(`  Response: ${JSON.stringify(response, null, 2)}`);
});

// Test with non-existing user
handleRequest('999').then((response) => {
    console.log('\nRequest for user 999:');
    console.log(`  Status: ${response.status_code}`);
    console.log(`  Response: ${JSON.stringify(response, null, 2)}`);
});

console.log('\n✅ Examples completed!');

