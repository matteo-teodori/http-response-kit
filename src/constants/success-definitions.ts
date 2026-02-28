/**
 * HTTP Response Kit - Success Definitions
 * @module constants/success-definitions
 */

import type { HttpSuccessInfo } from '../types';
import { HttpSuccessCode, HttpRedirectCode, HttpInfoCode } from './status-codes';

/**
 * Complete definitions for HTTP 2xx Success codes
 */
export const HttpSuccessDefinitions: Record<number, HttpSuccessInfo> = {
    [HttpSuccessCode.OK]: {
        code: 200,
        description: 'The request has succeeded.',
    },

    [HttpSuccessCode.CREATED]: {
        code: 201,
        description: 'The request has been fulfilled and resulted in a new resource being created.',
    },

    [HttpSuccessCode.ACCEPTED]: {
        code: 202,
        description: 'The request has been accepted for processing, but the processing has not been completed.',
    },

    [HttpSuccessCode.NON_AUTHORITATIVE_INFORMATION]: {
        code: 203,
        description: 'The returned meta-information is from a local or third-party copy.',
    },

    [HttpSuccessCode.NO_CONTENT]: {
        code: 204,
        description: 'The server successfully processed the request and is not returning any content.',
    },

    [HttpSuccessCode.RESET_CONTENT]: {
        code: 205,
        description: 'The server successfully processed the request and requires the requester to reset the document view.',
    },

    [HttpSuccessCode.PARTIAL_CONTENT]: {
        code: 206,
        description: 'The server is delivering only part of the resource due to a range header sent by the client.',
    },

    [HttpSuccessCode.MULTI_STATUS]: {
        code: 207,
        description: 'The message body contains multiple status codes for multiple independent operations.',
    },

    [HttpSuccessCode.ALREADY_REPORTED]: {
        code: 208,
        description: 'The members of a DAV binding have already been enumerated in a preceding part of the response.',
    },

    [HttpSuccessCode.IM_USED]: {
        code: 226,
        description: 'The server has fulfilled a GET request and the response is a representation of the result of one or more instance-manipulations.',
    },
} as const;

Object.freeze(HttpSuccessDefinitions);

/**
 * Complete definitions for HTTP 3xx Redirect codes
 */
export const HttpRedirectDefinitions: Record<number, HttpSuccessInfo> = {
    [HttpRedirectCode.MULTIPLE_CHOICES]: {
        code: 300,
        description: 'The request has more than one possible response.',
    },

    [HttpRedirectCode.MOVED_PERMANENTLY]: {
        code: 301,
        description: 'The URL of the requested resource has been changed permanently.',
    },

    [HttpRedirectCode.FOUND]: {
        code: 302,
        description: 'The URI of the requested resource has been changed temporarily.',
    },

    [HttpRedirectCode.SEE_OTHER]: {
        code: 303,
        description: 'The response can be found under another URI using the GET method.',
    },

    [HttpRedirectCode.NOT_MODIFIED]: {
        code: 304,
        description: 'The resource has not been modified since the version specified by the request headers.',
    },

    [HttpRedirectCode.USE_PROXY]: {
        code: 305,
        description: 'The requested resource must be accessed through the proxy.',
    },

    [HttpRedirectCode.TEMPORARY_REDIRECT]: {
        code: 307,
        description: 'The request should be repeated with another URI but future requests should use the original URI.',
    },

    [HttpRedirectCode.PERMANENT_REDIRECT]: {
        code: 308,
        description: 'The request and all future requests should be repeated using another URI.',
    },
} as const;

Object.freeze(HttpRedirectDefinitions);

/**
 * Complete definitions for HTTP 1xx Informational codes
 */
export const HttpInfoDefinitions: Record<number, HttpSuccessInfo> = {
    [HttpInfoCode.CONTINUE]: {
        code: 100,
        description: 'The initial part of a request has been received and has not yet been rejected by the server.',
    },

    [HttpInfoCode.SWITCHING_PROTOCOLS]: {
        code: 101,
        description: 'The server is switching protocols as requested by the client.',
    },

    [HttpInfoCode.PROCESSING]: {
        code: 102,
        description: 'The server has received and is processing the request, but no response is available yet.',
    },

    [HttpInfoCode.EARLY_HINTS]: {
        code: 103,
        description: 'The server is sending some response headers before the final response.',
    },
} as const;

Object.freeze(HttpInfoDefinitions);

/**
 * Get success definition by status code
 */
export function getSuccessDefinition(code: number): HttpSuccessInfo {
    const definedInfo =
        HttpSuccessDefinitions[code] ||
        HttpRedirectDefinitions[code] ||
        HttpInfoDefinitions[code];

    if (definedInfo) {
        return definedInfo;
    }

    // Preserve the original code but provide a generic fallback definition
    return {
        code: code,
        description: 'The request was processed with a non-standard status code.',
    };
}
