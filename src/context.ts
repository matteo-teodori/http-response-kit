/**
 * HTTP Response Kit - Request context (opt-in)
 *
 * A tiny `AsyncLocalStorage` helper for propagating a correlation id (and any
 * other per-request data) without threading it through every call. Wire it to
 * a kit via `requestIdProvider` so BOTH success and error responses carry the
 * id automatically:
 *
 * ```ts
 * import { createRequestContext } from 'http-response-kit/context';
 * import { createResponseKit } from 'http-response-kit';
 *
 * export const ctx = createRequestContext();
 * export const api = createResponseKit({ requestIdProvider: () => ctx.getRequestId() });
 *
 * // once, as the outermost middleware:
 * app.use((req, res, next) => ctx.run({ requestId: req.headers['x-request-id'] }, next));
 * ```
 *
 * This module imports `node:async_hooks`; keep it in its own subpath so the
 * core bundle stays free of Node built-ins.
 *
 * @module context
 */

import { AsyncLocalStorage } from 'node:async_hooks';

/** Per-request store. `requestId` is understood by `requestIdProvider`. */
export interface RequestContext {
    requestId?: string;
    [key: string]: unknown;
}

/** A store handle returned by {@link createRequestContext}. */
export interface RequestContextStore<T extends RequestContext = RequestContext> {
    /** Run `fn` with `context` as the active store for its entire async subtree. */
    run<R>(context: T, fn: () => R): R;
    /** The active store, or `undefined` outside any `run()`. */
    get(): T | undefined;
    /** Shorthand for `get()?.requestId`. */
    getRequestId(): string | undefined;
}

/**
 * Create an isolated request-context store backed by `AsyncLocalStorage`.
 * Like kits, stores are instances with no shared global state.
 */
export function createRequestContext<T extends RequestContext = RequestContext>(): RequestContextStore<T> {
    const als = new AsyncLocalStorage<T>();
    return {
        run: (context, fn) => als.run(context, fn),
        get: () => als.getStore(),
        getRequestId: () => als.getStore()?.requestId,
    };
}
