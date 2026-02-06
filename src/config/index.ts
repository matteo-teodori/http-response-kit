/**
 * HTTP Response Kit - Library Configuration
 * @module config
 */

import type { LibraryConfig } from '../types';

/**
 * Default library configuration
 */
const defaultConfig: LibraryConfig = {
    isDevelopment: process.env.NODE_ENV === 'development',
    includeTimestamp: true,
    customMessages: {},
    responseTransformer: undefined,
};

/**
 * Current library configuration (mutable)
 */
let currentConfig: LibraryConfig = { ...defaultConfig };

/**
 * Configure the library globally
 * 
 * @param config - Partial configuration to merge with current settings
 * 
 * @example
 * ```ts
 * configure({
 *   isDevelopment: true,
 *   includeTimestamp: false,
 *   customMessages: {
 *     404: 'Oops! This page went on vacation 🏝️',
 *     500: 'Well, this is embarrassing... 🤖'
 *   },
 * });
 * ```
 */
export function configure(config: Partial<LibraryConfig>): void {
    currentConfig = { ...currentConfig, ...config };
}

/**
 * Get the current library configuration
 */
export function getConfig(): LibraryConfig {
    return { ...currentConfig };
}

/**
 * Reset configuration to defaults
 */
export function resetConfig(): void {
    currentConfig = { ...defaultConfig };
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
    return currentConfig.isDevelopment ?? false;
}

/**
 * Check if timestamps should be included
 */
export function shouldIncludeTimestamp(): boolean {
    return currentConfig.includeTimestamp ?? true;
}

/**
 * Get custom message for a status code (if defined)
 */
export function getCustomMessage(code: number): string | undefined {
    return currentConfig.customMessages?.[code];
}

/**
 * Get the response transformer (if defined)
 */
export function getResponseTransformer(): LibraryConfig['responseTransformer'] {
    return currentConfig.responseTransformer;
}
