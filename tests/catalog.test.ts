import { describe, it, expect } from 'vitest';
import { createErrorCatalog } from '../src/errors/catalog';
import { HttpError } from '../src/errors/HttpError';

describe('createErrorCatalog', () => {
    const Errors = createErrorCatalog({
        USER_NOT_FOUND: { status: 404, message: 'User does not exist' },
        PLAN_LIMIT_REACHED: { status: 402, message: 'Upgrade your plan' },
        GATEWAY_DOWN: { status: 502, message: 'Payment gateway offline' },
        LOUD_FAILURE: { status: 500, message: 'Visible 500', expose: true },
    });

    it('should create factories with stable errorCode', () => {
        const err = Errors.USER_NOT_FOUND();
        expect(HttpError.isHttpError(err)).toBe(true);
        expect(err.code).toBe(404);
        expect(err.errorCode).toBe('USER_NOT_FOUND');
        expect(err.message).toBe('User does not exist');
    });

    it('should allow message override at call site', () => {
        const err = Errors.USER_NOT_FOUND('No user with id 42');
        expect(err.message).toBe('No user with id 42');
        expect(err.errorCode).toBe('USER_NOT_FOUND');
    });

    it('should default expose from status (4xx true, 5xx false)', () => {
        expect(Errors.PLAN_LIMIT_REACHED().expose).toBe(true);
        expect(Errors.GATEWAY_DOWN().expose).toBe(false);
    });

    it('should honor explicit expose in the catalog entry', () => {
        expect(Errors.LOUD_FAILURE().expose).toBe(true);
    });

    it('should pass through options (metadata, retryAfter)', () => {
        const err = Errors.USER_NOT_FOUND(undefined, { metadata: { id: 42 } });
        expect(err.metadata).toEqual({ id: 42 });
    });
});
