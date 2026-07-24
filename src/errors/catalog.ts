/**
 * HTTP Response Kit - Domain Error Catalog
 *
 * Enterprises need stable, machine-readable application error codes
 * (e.g. "USER_NOT_FOUND", "PLAN_LIMIT_REACHED") that are independent from
 * HTTP status codes. A catalog turns a declarative map into typed factories.
 *
 * @module errors/catalog
 */

import type { CatalogEntry, HttpErrorOptions } from '../types';
import { HttpError } from './HttpError';

/** A factory produced by {@link createErrorCatalog} */
export type CatalogFactory = (message?: string, options?: Omit<HttpErrorOptions, 'errorCode'>) => HttpError;

/**
 * Create a typed catalog of domain errors.
 *
 * Each key becomes the stable `errorCode` (serialized as `error.code` in
 * responses and as the `code` extension in Problem Details).
 *
 * @example
 * ```ts
 * export const Errors = createErrorCatalog({
 *   USER_NOT_FOUND: { status: 404, message: 'User does not exist' },
 *   PLAN_LIMIT_REACHED: { status: 402, message: 'Upgrade your plan' },
 *   PAYMENT_GATEWAY_DOWN: { status: 502, expose: false },
 * });
 *
 * throw Errors.USER_NOT_FOUND();                    // default message
 * throw Errors.USER_NOT_FOUND('No user with id 42'); // override message
 * ```
 */
export function createErrorCatalog<T extends Record<string, CatalogEntry>>(
    catalog: T
): { [K in keyof T]: CatalogFactory } {
    const factories = {} as { [K in keyof T]: CatalogFactory };

    for (const key of Object.keys(catalog) as Array<keyof T>) {
        const entry = catalog[key];
        if (entry === undefined) continue;
        factories[key] = (message?: string, options: Omit<HttpErrorOptions, 'errorCode'> = {}) =>
            new HttpError(entry.status, {
                ...options,
                message: message ?? entry.message ?? options.message,
                errorCode: String(key),
                expose: options.expose ?? entry.expose,
                metadata: options.metadata ?? entry.metadata,
            });
    }

    return factories;
}
