/**
 * HTTP Response Kit
 * A professional HTTP error and response formatting library for Node.js
 * 
 * @packageDocumentation
 */

// ============================================================================
// Types
// ============================================================================

export type {
    HttpErrorInfo,
    HttpErrorOptions,
    HttpSuccessInfo,
    SuccessResponseConfig,
    ErrorResponseConfig,
    LibraryConfig,
    SuccessResponse,
    ErrorResponse,
    PaginationInput,
    PaginationMeta,
} from './types';

// ============================================================================
// Status Codes
// ============================================================================

export {
    HttpClientErrorCode,
    HttpServerErrorCode,
    HttpErrorCode,
    HttpSuccessCode,
    HttpRedirectCode,
    HttpInfoCode,
} from './constants/status-codes';

// ============================================================================
// Definitions
// ============================================================================

export {
    HttpErrorDefinitions,
    getErrorDefinition,
} from './constants/error-definitions';

export {
    HttpSuccessDefinitions,
    HttpRedirectDefinitions,
    HttpInfoDefinitions,
    getSuccessDefinition,
} from './constants/success-definitions';

// ============================================================================
// Core Classes
// ============================================================================

export { HttpError } from './errors/HttpError';
export { HttpResponse } from './responses/HttpResponse';

// ============================================================================
// Configuration
// ============================================================================

export {
    configure,
    getConfig,
    resetConfig,
    isDevelopment,
} from './config';
