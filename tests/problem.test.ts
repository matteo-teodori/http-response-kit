import { describe, it, expect } from 'vitest';
import { HttpError } from '../src/errors/HttpError';
import { toProblem, isProblemDetails, PROBLEM_CONTENT_TYPE } from '../src/responses/problem';

describe('RFC 9457 Problem Details', () => {
    it('exports the correct media type', () => {
        expect(PROBLEM_CONTENT_TYPE).toBe('application/problem+json');
    });

    it('should produce a minimal compliant problem object', () => {
        const problem = HttpError.notFound('User not found').toProblemDetails();
        expect(problem).toMatchObject({
            type: 'about:blank',
            title: 'Not Found',
            status: 404,
            detail: 'User not found',
        });
    });

    it('should build type URI from typeBase (trailing slash tolerant)', () => {
        const p1 = HttpError.notFound().toProblemDetails({ typeBase: 'https://err.io' });
        const p2 = HttpError.notFound().toProblemDetails({ typeBase: 'https://err.io/' });
        expect(p1.type).toBe('https://err.io/not_found');
        expect(p2.type).toBe('https://err.io/not_found');
    });

    it('should sanitize non-exposable messages', () => {
        const problem = HttpError.fromError(new Error('secret db string')).toProblemDetails();
        expect(problem.detail).toBe('An unexpected error occurred on the server.');
        expect(JSON.stringify(problem)).not.toContain('secret db string');
    });

    it('should carry extensions, code, errors and request_id', () => {
        const err = HttpError.validation([{ field: 'a', message: 'bad' }]);
        const problem = err.toProblemDetails({
            requestId: 'req-9',
            extensions: { balance: 30 },
        });
        expect(problem.code).toBe('VALIDATION_FAILED');
        expect(problem.errors).toHaveLength(1);
        expect(problem.request_id).toBe('req-9');
        expect(problem.balance).toBe(30);
    });

    it('extensions must not override reserved members', () => {
        const problem = HttpError.notFound().toProblemDetails({ extensions: { status: 200 } });
        expect(problem.status).toBe(404);
    });

    it('toProblem() should accept any error type', () => {
        const problem = toProblem('boom');
        expect(problem.status).toBe(500);
        expect(isProblemDetails(problem)).toBe(true);
        expect(isProblemDetails({})).toBe(false);
    });
});
