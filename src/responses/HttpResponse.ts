/**
 * HTTP Response Kit - HttpResponse Class
 * @module responses/HttpResponse
 */

import type { SuccessResponseConfig, ErrorResponseConfig, SuccessResponse, ErrorResponse, PaginationInput } from '../types';
import { HttpError } from '../errors/HttpError';
import { getSuccessDefinition } from '../constants/success-definitions';
import { HttpSuccessCode, HttpRedirectCode } from '../constants/status-codes';
import { isDevelopment, shouldIncludeTimestamp, getResponseTransformer } from '../config';

/**
 * Utility class for formatting HTTP responses.
 * Provides consistent structure for both success and error responses.
 * 
 * @example
 * ```ts
 * // Success response
 * const response = HttpResponse.success({ 
 *   data: { id: 1, name: 'John' },
 *   message: 'User created successfully',
 *   statusCode: 201
 * });
 * 
 * // Error response
 * const error = new HttpError(404, { message: 'User not found' });
 * const errorResponse = HttpResponse.error(error);
 * 
 * // Express integration
 * app.get('/user/:id', (req, res) => {
 *   try {
 *     const user = findUser(req.params.id);
 *     const response = HttpResponse.success({ data: user });
 *     res.status(response.status_code).json(response);
 *   } catch (err) {
 *     const response = HttpResponse.error(HttpError.fromError(err));
 *     res.status(response.status_code).json(response);
 *   }
 * });
 * ```
 */
export class HttpResponse {
    /**
     * Format a success response
     * 
     * @param config - Success response configuration
     * @returns Formatted success response object
     */
    static success<T = unknown>(config: SuccessResponseConfig<T> = {}): SuccessResponse<T> {
        const {
            data,
            message,
            statusCode = HttpSuccessCode.OK,
            metadata = {},
        } = config;

        const successInfo = getSuccessDefinition(statusCode);

        const response: SuccessResponse<T> = {
            success: true,
            status_code: successInfo.code,
        };

        if (shouldIncludeTimestamp()) {
            response.timestamp = new Date().toISOString();
        }

        // Don't include data for 204 No Content, 205 Reset Content, and 304 Not Modified
        if (
            statusCode !== HttpSuccessCode.NO_CONTENT &&
            statusCode !== HttpSuccessCode.RESET_CONTENT &&
            statusCode !== HttpRedirectCode.NOT_MODIFIED
        ) {
            if (data !== null && data !== undefined) {
                response.data = data;
            }
        }

        if (message) {
            response.message = message;
        }

        if (Object.keys(metadata).length > 0) {
            response.metadata = metadata;
        }

        // Apply custom transformer if configured
        const transformer = getResponseTransformer();
        if (transformer) {
            return transformer(response) as SuccessResponse<T>;
        }

        return response;
    }

    /**
     * Format an error response
     * 
     * @param error - HttpError instance
     * @param config - Optional error response configuration
     * @returns Formatted error response object
     */
    static error(error: HttpError, config: ErrorResponseConfig = {}): ErrorResponse {
        const { includeStack, additionalFields } = config;

        const response: ErrorResponse = {
            success: false,
            status_code: error.code,
            error: {
                type: error.type,
                title: error.title,
                message: error.message,
            },
        };

        if (shouldIncludeTimestamp()) {
            response.timestamp = new Date().toISOString();
        }

        // Include original error details if available
        if (error.details) {
            response.error.details = error.details;
        }

        // Include stack trace in development mode (separate field)
        if (includeStack ?? isDevelopment()) {
            response.error.stack = error.stack;
        }

        // Include retry-after if present
        if (error.retryAfter) {
            response.retry_after = error.retryAfter;
        }

        // Include metadata if present
        if (error.metadata) {
            response.metadata = error.metadata;
        }

        // Add any additional fields (protecting core structure)
        if (additionalFields) {
            const { success, status_code, error: _error, timestamp, metadata, retry_after, ...safeFields } = additionalFields;
            Object.assign(response, safeFields);
        }

        // Apply custom transformer if configured
        const transformer = getResponseTransformer();
        if (transformer) {
            return transformer(response) as ErrorResponse;
        }

        return response;
    }

    /**
     * Format a response from any error (converts to HttpError first)
     * 
     * @param error - Any error type
     * @param config - Optional error response configuration
     * @returns Formatted error response object
     */
    static fromError(error: unknown, config: ErrorResponseConfig = {}): ErrorResponse {
        const httpError = HttpError.fromError(error, config.fallbackCode);
        return HttpResponse.error(httpError, config);
    }

    // ========================================================================
    // Convenience Methods
    // ========================================================================

    /** 200 OK */
    static ok<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return HttpResponse.success<T>({ data, message, statusCode: HttpSuccessCode.OK });
    }

    /** 201 Created */
    static created<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return HttpResponse.success<T>({ data, message, statusCode: HttpSuccessCode.CREATED });
    }

    /** 202 Accepted */
    static accepted<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return HttpResponse.success<T>({ data, message, statusCode: HttpSuccessCode.ACCEPTED });
    }

    /** 204 No Content */
    static noContent(): SuccessResponse<never> {
        return HttpResponse.success<never>({ statusCode: HttpSuccessCode.NO_CONTENT });
    }

    /** 206 Partial Content */
    static partialContent<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
        return HttpResponse.success<T>({ data, message, statusCode: HttpSuccessCode.PARTIAL_CONTENT });
    }

    /** 304 Not Modified — Note: 304 is a 3xx redirect code, included here as a convenience method */
    static notModified(): SuccessResponse<never> {
        return HttpResponse.success<never>({ statusCode: HttpRedirectCode.NOT_MODIFIED });
    }

    // ========================================================================
    // Utility Methods
    // ========================================================================

    /**
     * Check if a response is a success response
     */
    static isSuccess(response: SuccessResponse | ErrorResponse): response is SuccessResponse {
        return response.success === true;
    }

    /**
     * Check if a response is an error response
     */
    static isError(response: SuccessResponse | ErrorResponse): response is ErrorResponse {
        return response.success === false;
    }

    /**
     * Create a paginated success response
     */
    static paginated<T = unknown>(
        data: T[],
        pagination: PaginationInput,
        message?: string
    ): SuccessResponse<T[]> {
        const effectiveLimit = pagination.limit > 0 ? pagination.limit : 1;
        return HttpResponse.success<T[]>({
            data,
            message,
            metadata: {
                pagination: {
                    page: pagination.page,
                    limit: effectiveLimit,
                    total: pagination.total,
                    total_pages: pagination.totalPages ?? Math.ceil(pagination.total / effectiveLimit),
                    has_next: pagination.page < (pagination.totalPages ?? Math.ceil(pagination.total / effectiveLimit)),
                    has_prev: pagination.page > 1,
                },
            },
        });
    }
}
