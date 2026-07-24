/**
 * HTTP Response Kit - createApi()
 *
 * Ergonomic entry point that binds a single {@link ResponseKit} to every
 * framework adapter, so the kit and the adapters can never disagree on casing
 * or format. This closes the most common configuration trap: creating a kit
 * with `format: 'problem'` (or `casing: 'camel'`) and then forgetting to pass
 * it to `errorHandler()`, which would silently emit a different response
 * contract for errors than for successes.
 *
 * @module api
 */

import type { KitConfig } from './types';
import { createResponseKit, type ResponseKit } from './kit';
import type { AdapterOptions } from './adapters/shared';
import {
    errorHandler as expressErrorHandler,
    notFoundHandler as expressNotFoundHandler,
    asyncHandler as expressAsyncHandler,
    type ExpressErrorHandler,
    type ExpressAsyncHandler,
} from './adapters/express';
import { fastifyErrorHandler, fastifyNotFoundHandler } from './adapters/fastify';
import { koaErrorHandler } from './adapters/koa';
import { honoErrorHandler } from './adapters/hono';

/** Adapter options with `kit` already bound by {@link createApi}. */
export type BoundAdapterOptions = Omit<AdapterOptions, 'kit'>;

/** The kit plus every framework adapter, all pre-bound to that kit. */
export interface BoundApi {
    /** The underlying kit — use it for `ok()`, `error()`, `problem()`, ... */
    kit: ResponseKit;
    /** Express handlers bound to `kit` */
    express: {
        errorHandler: (options?: BoundAdapterOptions) => ExpressErrorHandler;
        notFoundHandler: (message?: string) => ReturnType<typeof expressNotFoundHandler>;
        asyncHandler: (handler: ExpressAsyncHandler) => ExpressAsyncHandler;
    };
    /** Fastify handlers bound to `kit` */
    fastify: {
        errorHandler: (options?: BoundAdapterOptions) => ReturnType<typeof fastifyErrorHandler>;
        notFoundHandler: (options?: BoundAdapterOptions) => ReturnType<typeof fastifyNotFoundHandler>;
    };
    /** Koa middleware bound to `kit` */
    koa: {
        errorHandler: (options?: BoundAdapterOptions) => ReturnType<typeof koaErrorHandler>;
    };
    /** Hono `onError` handler bound to `kit` */
    hono: {
        errorHandler: (options?: BoundAdapterOptions) => ReturnType<typeof honoErrorHandler>;
    };
}

/**
 * Create a kit and its framework adapters in one shot, already wired together.
 *
 * @example
 * ```ts
 * import { createApi } from 'http-response-kit';
 *
 * export const { kit, express } = createApi({
 *   format: 'problem',
 *   problemTypeBase: 'https://errors.example.com',
 * });
 *
 * // impossible to misconfigure — the adapter shares the kit's format/casing
 * app.use(express.notFoundHandler());
 * app.use(express.errorHandler({ onError: (e, id) => logger.error({ err: e, requestId: id }) }));
 * ```
 */
export function createApi(config: KitConfig = {}): BoundApi {
    const kit = createResponseKit(config);
    const bind = (options?: BoundAdapterOptions): AdapterOptions => ({ ...options, kit });

    return {
        kit,
        express: {
            errorHandler: (options) => expressErrorHandler(bind(options)),
            notFoundHandler: (message) => expressNotFoundHandler(message),
            asyncHandler: (handler) => expressAsyncHandler(handler),
        },
        fastify: {
            errorHandler: (options) => fastifyErrorHandler(bind(options)),
            notFoundHandler: (options) => fastifyNotFoundHandler(bind(options)),
        },
        koa: {
            errorHandler: (options) => koaErrorHandler(bind(options)),
        },
        hono: {
            errorHandler: (options) => honoErrorHandler(bind(options)),
        },
    };
}
