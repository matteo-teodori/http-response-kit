import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['tests/**/*.test.ts'],
        globals: false,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            reporter: ['text', 'lcov'],
            // Blocking thresholds: a coverage drop fails CI.
            thresholds: {
                lines: 90,
                functions: 90,
                statements: 90,
                branches: 88,
            },
        },
    },
});
