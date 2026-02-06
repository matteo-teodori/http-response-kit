/**
 * HTTP Response Kit - Error Definitions
 * @module constants/error-definitions
 */

import type { HttpErrorInfo } from '../types';
import { HttpClientErrorCode, HttpServerErrorCode } from './status-codes';

/**
 * Complete definitions for all HTTP error types (4xx and 5xx)
 */
export const HttpErrorDefinitions: Record<number, HttpErrorInfo> = {
    // ========================================================================
    // 4xx Client Errors
    // ========================================================================

    [HttpClientErrorCode.BAD_REQUEST]: {
        type: 'bad_request',
        title: 'Bad Request',
        code: 400,
        details: 'The request cannot be processed due to invalid syntax or missing parameters.',
    },

    [HttpClientErrorCode.UNAUTHORIZED]: {
        type: 'unauthorized',
        title: 'Unauthorized',
        code: 401,
        details: 'Authentication is required and has failed or not yet been provided.',
    },

    [HttpClientErrorCode.PAYMENT_REQUIRED]: {
        type: 'payment_required',
        title: 'Payment Required',
        code: 402,
        details: 'Payment is required to access this resource.',
    },

    [HttpClientErrorCode.FORBIDDEN]: {
        type: 'forbidden',
        title: 'Forbidden',
        code: 403,
        details: 'The server understood the request but refuses to authorize it.',
    },

    [HttpClientErrorCode.NOT_FOUND]: {
        type: 'not_found',
        title: 'Not Found',
        code: 404,
        details: 'The requested resource could not be found.',
    },

    [HttpClientErrorCode.METHOD_NOT_ALLOWED]: {
        type: 'method_not_allowed',
        title: 'Method Not Allowed',
        code: 405,
        details: 'The method specified in the request is not allowed for the resource.',
    },

    [HttpClientErrorCode.NOT_ACCEPTABLE]: {
        type: 'not_acceptable',
        title: 'Not Acceptable',
        code: 406,
        details: 'The resource is not available in a format acceptable to the client.',
    },

    [HttpClientErrorCode.PROXY_AUTHENTICATION_REQUIRED]: {
        type: 'proxy_authentication_required',
        title: 'Proxy Authentication Required',
        code: 407,
        details: 'Authentication with the proxy is required.',
    },

    [HttpClientErrorCode.REQUEST_TIMEOUT]: {
        type: 'request_timeout',
        title: 'Request Timeout',
        code: 408,
        details: 'The server timed out waiting for the request.',
    },

    [HttpClientErrorCode.CONFLICT]: {
        type: 'conflict',
        title: 'Conflict',
        code: 409,
        details: 'The request conflicts with the current state of the resource.',
    },

    [HttpClientErrorCode.GONE]: {
        type: 'gone',
        title: 'Gone',
        code: 410,
        details: 'The requested resource is no longer available and will not be available again.',
    },

    [HttpClientErrorCode.LENGTH_REQUIRED]: {
        type: 'length_required',
        title: 'Length Required',
        code: 411,
        details: 'The request did not specify the length of its content, which is required.',
    },

    [HttpClientErrorCode.PRECONDITION_FAILED]: {
        type: 'precondition_failed',
        title: 'Precondition Failed',
        code: 412,
        details: 'One or more conditions in the request header fields evaluated to false.',
    },

    [HttpClientErrorCode.PAYLOAD_TOO_LARGE]: {
        type: 'payload_too_large',
        title: 'Payload Too Large',
        code: 413,
        details: 'The request payload is larger than the server is willing to process.',
    },

    [HttpClientErrorCode.URI_TOO_LONG]: {
        type: 'uri_too_long',
        title: 'URI Too Long',
        code: 414,
        details: 'The URI provided was too long for the server to process.',
    },

    [HttpClientErrorCode.UNSUPPORTED_MEDIA_TYPE]: {
        type: 'unsupported_media_type',
        title: 'Unsupported Media Type',
        code: 415,
        details: 'The media format of the requested data is not supported by the server.',
    },

    [HttpClientErrorCode.RANGE_NOT_SATISFIABLE]: {
        type: 'range_not_satisfiable',
        title: 'Range Not Satisfiable',
        code: 416,
        details: 'The range specified in the request header cannot be fulfilled.',
    },

    [HttpClientErrorCode.EXPECTATION_FAILED]: {
        type: 'expectation_failed',
        title: 'Expectation Failed',
        code: 417,
        details: 'The server cannot meet the requirements of the Expect request-header field.',
    },

    [HttpClientErrorCode.IM_A_TEAPOT]: {
        type: 'im_a_teapot',
        title: "I'm a Teapot",
        code: 418,
        details: 'The server refuses to brew coffee because it is, permanently, a teapot.',
    },

    [HttpClientErrorCode.MISDIRECTED_REQUEST]: {
        type: 'misdirected_request',
        title: 'Misdirected Request',
        code: 421,
        details: 'The request was directed at a server that is not able to produce a response.',
    },

    [HttpClientErrorCode.UNPROCESSABLE_ENTITY]: {
        type: 'unprocessable_entity',
        title: 'Unprocessable Entity',
        code: 422,
        details: 'The request was well-formed but was unable to be followed due to semantic errors.',
    },

    [HttpClientErrorCode.LOCKED]: {
        type: 'locked',
        title: 'Locked',
        code: 423,
        details: 'The resource that is being accessed is locked.',
    },

    [HttpClientErrorCode.FAILED_DEPENDENCY]: {
        type: 'failed_dependency',
        title: 'Failed Dependency',
        code: 424,
        details: 'The request failed because it depended on another request that failed.',
    },

    [HttpClientErrorCode.TOO_EARLY]: {
        type: 'too_early',
        title: 'Too Early',
        code: 425,
        details: 'The server is unwilling to risk processing a request that might be replayed.',
    },

    [HttpClientErrorCode.UPGRADE_REQUIRED]: {
        type: 'upgrade_required',
        title: 'Upgrade Required',
        code: 426,
        details: 'The client should switch to a different protocol.',
    },

    [HttpClientErrorCode.PRECONDITION_REQUIRED]: {
        type: 'precondition_required',
        title: 'Precondition Required',
        code: 428,
        details: 'The origin server requires the request to be conditional.',
    },

    [HttpClientErrorCode.TOO_MANY_REQUESTS]: {
        type: 'too_many_requests',
        title: 'Too Many Requests',
        code: 429,
        details: 'The user has sent too many requests in a given amount of time.',
        retryAfter: 60,
    },

    [HttpClientErrorCode.REQUEST_HEADER_FIELDS_TOO_LARGE]: {
        type: 'request_header_fields_too_large',
        title: 'Request Header Fields Too Large',
        code: 431,
        details: 'The server is unwilling to process the request because its header fields are too large.',
    },

    [HttpClientErrorCode.UNAVAILABLE_FOR_LEGAL_REASONS]: {
        type: 'unavailable_for_legal_reasons',
        title: 'Unavailable For Legal Reasons',
        code: 451,
        details: 'The resource is unavailable due to legal demands.',
    },

    // ========================================================================
    // 5xx Server Errors
    // ========================================================================

    [HttpServerErrorCode.INTERNAL_SERVER_ERROR]: {
        type: 'internal_server_error',
        title: 'Internal Server Error',
        code: 500,
        details: 'An unexpected error occurred on the server.',
    },

    [HttpServerErrorCode.NOT_IMPLEMENTED]: {
        type: 'not_implemented',
        title: 'Not Implemented',
        code: 501,
        details: 'The server does not support the functionality required to fulfill the request.',
    },

    [HttpServerErrorCode.BAD_GATEWAY]: {
        type: 'bad_gateway',
        title: 'Bad Gateway',
        code: 502,
        details: 'The server received an invalid response from an upstream server.',
    },

    [HttpServerErrorCode.SERVICE_UNAVAILABLE]: {
        type: 'service_unavailable',
        title: 'Service Unavailable',
        code: 503,
        details: 'The server is currently unable to handle the request due to temporary overloading or maintenance.',
        retryAfter: 60,
        resolution: 'Try again after a short period or contact support.',
    },

    [HttpServerErrorCode.GATEWAY_TIMEOUT]: {
        type: 'gateway_timeout',
        title: 'Gateway Timeout',
        code: 504,
        details: 'The server did not receive a timely response from an upstream server.',
    },

    [HttpServerErrorCode.HTTP_VERSION_NOT_SUPPORTED]: {
        type: 'http_version_not_supported',
        title: 'HTTP Version Not Supported',
        code: 505,
        details: 'The server does not support the HTTP protocol version used in the request.',
    },

    [HttpServerErrorCode.VARIANT_ALSO_NEGOTIATES]: {
        type: 'variant_also_negotiates',
        title: 'Variant Also Negotiates',
        code: 506,
        details: 'The server has an internal configuration error during content negotiation.',
    },

    [HttpServerErrorCode.INSUFFICIENT_STORAGE]: {
        type: 'insufficient_storage',
        title: 'Insufficient Storage',
        code: 507,
        details: 'The server is unable to store the representation needed to complete the request.',
    },

    [HttpServerErrorCode.LOOP_DETECTED]: {
        type: 'loop_detected',
        title: 'Loop Detected',
        code: 508,
        details: 'The server detected an infinite loop while processing the request.',
    },

    [HttpServerErrorCode.BANDWIDTH_LIMIT_EXCEEDED]: {
        type: 'bandwidth_limit_exceeded',
        title: 'Bandwidth Limit Exceeded',
        code: 509,
        details: 'The server has exceeded the bandwidth limit.',
    },

    [HttpServerErrorCode.NOT_EXTENDED]: {
        type: 'not_extended',
        title: 'Not Extended',
        code: 510,
        details: 'Further extensions to the request are required for the server to fulfill it.',
    },

    [HttpServerErrorCode.NETWORK_AUTHENTICATION_REQUIRED]: {
        type: 'network_authentication_required',
        title: 'Network Authentication Required',
        code: 511,
        details: 'The client needs to authenticate to gain network access.',
    },
};

/**
 * Get error definition by status code
 */
export function getErrorDefinition(code: number): HttpErrorInfo {
    return HttpErrorDefinitions[code] || HttpErrorDefinitions[500];
}
