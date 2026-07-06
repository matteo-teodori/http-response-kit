/**
 * HTTP Response Kit - System/socket error mapping
 *
 * Maps Node.js system errors (socket, DNS, timeout - including the undici
 * codes thrown by Node 18+ global `fetch`) to the semantically correct
 * 5xx HTTP status:
 *
 * - upstream refused / reset / unreachable -> 502 Bad Gateway
 * - upstream timed out                     -> 504 Gateway Timeout
 * - temporary local exhaustion / DNS retry -> 503 Service Unavailable
 *
 * These are NOT new HTTP statuses: socket errors are causes, and this module
 * translates them into the right response. Mapped errors are always
 * `expose: false` (the raw message stays on the instance for logging) and
 * carry the syscall code as `errorCode` for telemetry.
 *
 * @module errors/system-errors
 */

import { HttpError } from './HttpError';

/**
 * Mapping from Node.js / undici error codes to HTTP status codes.
 * Exported so consumers can inspect or extend their own logic on top.
 */
export const SystemErrorStatusMap: Readonly<Record<string, number>> = Object.freeze({
    // Connection-level failures -> 502 Bad Gateway
    ECONNREFUSED: 502,
    ECONNRESET: 502,
    ECONNABORTED: 502,
    EPIPE: 502,
    EHOSTUNREACH: 502,
    ENETUNREACH: 502,
    ENETDOWN: 502,
    ENOTFOUND: 502,        // DNS: host does not resolve
    EPROTO: 502,           // TLS/protocol failure
    ERR_TLS_CERT_ALTNAME_INVALID: 502,

    // Timeouts -> 504 Gateway Timeout
    ETIMEDOUT: 504,
    ESOCKETTIMEDOUT: 504,

    // Temporary conditions -> 503 Service Unavailable
    EAI_AGAIN: 503,        // DNS: temporary resolution failure
    EMFILE: 503,           // too many open files (fd exhaustion)
    ENFILE: 503,
    ENOBUFS: 503,

    // undici / Node 18+ global fetch
    UND_ERR_CONNECT_TIMEOUT: 504,
    UND_ERR_HEADERS_TIMEOUT: 504,
    UND_ERR_BODY_TIMEOUT: 504,
    UND_ERR_SOCKET: 502,
    UND_ERR_DESTROYED: 502,
    UND_ERR_CLOSED: 502,
});

/** Max depth when searching the `cause` chain for a system error code */
const MAX_CAUSE_DEPTH = 5;

/**
 * Extract a known system error code from an error, walking the `cause`
 * chain (Node's `fetch failed` TypeError carries the real code in `cause`).
 * @internal
 */
export function findSystemErrorCode(error: unknown): string | undefined {
    let current: unknown = error;
    let depth = 0;
    while (current !== null && typeof current === 'object' && depth < MAX_CAUSE_DEPTH) {
        const code = (current as { code?: unknown }).code;
        if (typeof code === 'string' && code in SystemErrorStatusMap) {
            return code;
        }
        current = (current as { cause?: unknown }).cause;
        depth++;
    }
    return undefined;
}

/**
 * Map a Node.js system/socket error to the appropriate HttpError
 * (502/503/504), or return `undefined` when the error is not a
 * recognized system error.
 *
 * The resulting error is never exposable: clients get the generic status
 * description, while the original message and cause stay available for
 * logging. The syscall code is set as `errorCode` for telemetry.
 *
 * @example
 * ```ts
 * try {
 *   await fetch('http://upstream.internal/api');
 * } catch (err) {
 *   throw mapSystemError(err) ?? HttpError.fromError(err);
 * }
 * // ECONNREFUSED -> 502 { error: { code: 'ECONNREFUSED', message: <generic> } }
 * ```
 */
export function mapSystemError(error: unknown): HttpError | undefined {
    const code = findSystemErrorCode(error);
    if (code === undefined) {
        return undefined;
    }

    const status = SystemErrorStatusMap[code];
    return new HttpError(status, {
        message: error instanceof Error ? error.message : String(error),
        cause: error instanceof Error ? error : undefined,
        expose: false,
        errorCode: code,
    });
}
