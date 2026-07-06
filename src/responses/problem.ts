/**
 * HTTP Response Kit - RFC 9457 Problem Details helpers
 * @module responses/problem
 */

import type { ProblemDetails, ProblemOptions } from '../types';
import { HttpError } from '../errors/HttpError';

/**
 * The media type for RFC 9457 Problem Details responses.
 * Set it as `Content-Type` when sending problem bodies.
 */
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/**
 * Build an RFC 9457 Problem Details object from any error.
 *
 * @example
 * ```ts
 * res
 *   .status(problem.status)
 *   .set('Content-Type', PROBLEM_CONTENT_TYPE)
 *   .json(toProblem(err, { typeBase: 'https://errors.example.com' }));
 * ```
 */
export function toProblem(error: unknown, options: ProblemOptions = {}): ProblemDetails {
    const httpError = HttpError.fromError(error);
    return httpError.toProblemDetails(options);
}

/**
 * Type guard for Problem Details objects
 */
export function isProblemDetails(value: unknown): value is ProblemDetails {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as ProblemDetails).title === 'string' &&
        typeof (value as ProblemDetails).status === 'number' &&
        typeof (value as ProblemDetails).type === 'string'
    );
}
