/**
 * HTTP Response Kit - HttpResponse Class
 * @module responses/HttpResponse
 */

import type { SuccessResponseConfig, ErrorResponseConfig, SuccessResponse, ErrorResponse } from '../types';
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
    static success(config: SuccessResponseConfig = {}): SuccessResponse {
        const {
            data = null,
            message,
            statusCode = HttpSuccessCode.OK,
            metadata = {},
        } = config;

        const successInfo = getSuccessDefinition(statusCode);

        const response: SuccessResponse = {
            success: true,
            status_code: successInfo.code,
        };

        if (shouldIncludeTimestamp()) {
            response.timestamp = new Date().toISOString();
        }

        // Don't include data for 204 No Content and 205 Reset Content
        if (
            statusCode !== HttpSuccessCode.NO_CONTENT &&
            statusCode !== HttpSuccessCode.RESET_CONTENT
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
            return transformer(response) as SuccessResponse;
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

        // Include stack trace in development mode
        if (includeStack ?? isDevelopment()) {
            (response.error as Record<string, unknown>).details = error.stack;
        }

        // Include retry-after if present
        if (error.retryAfter) {
            (response as Record<string, unknown>).retry_after = error.retryAfter;
        }

        // Include metadata if present
        if (error.metadata) {
            response.metadata = error.metadata;
        }

        // Add any additional fields
        if (additionalFields) {
            Object.assign(response, additionalFields);
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
        const httpError = HttpError.fromError(error);
        return HttpResponse.error(httpError, config);
    }

    // ========================================================================
    // Convenience Methods
    // ========================================================================

    /** 200 OK */
    static ok(data?: unknown, message?: string): SuccessResponse {
        return HttpResponse.success({ data, message, statusCode: HttpSuccessCode.OK });
    }

    /** 201 Created */
    static created(data?: unknown, message?: string): SuccessResponse {
        return HttpResponse.success({ data, message, statusCode: HttpSuccessCode.CREATED });
    }

    /** 202 Accepted */
    static accepted(data?: unknown, message?: string): SuccessResponse {
        return HttpResponse.success({ data, message, statusCode: HttpSuccessCode.ACCEPTED });
    }

    /** 204 No Content */
    static noContent(): SuccessResponse {
        return HttpResponse.success({ statusCode: HttpSuccessCode.NO_CONTENT });
    }

    /** 206 Partial Content */
    static partialContent(data?: unknown, message?: string): SuccessResponse {
        return HttpResponse.success({ data, message, statusCode: HttpSuccessCode.PARTIAL_CONTENT });
    }

    /** 304 Not Modified */
    static notModified(): SuccessResponse {
        return HttpResponse.success({ statusCode: HttpRedirectCode.NOT_MODIFIED });
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
    static paginated(
        data: unknown[],
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages?: number;
        },
        message?: string
    ): SuccessResponse {
        return HttpResponse.success({
            data,
            message,
            metadata: {
                pagination: {
                    page: pagination.page,
                    limit: pagination.limit,
                    total: pagination.total,
                    total_pages: pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit),
                    has_next: pagination.page < (pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit)),
                    has_prev: pagination.page > 1,
                },
            },
        });
    }
}
