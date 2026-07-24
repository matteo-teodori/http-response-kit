/**
 * Spec conformance: replays spec/vectors/vectors.json against the
 * implementation. This is the same exercise a port in any other language
 * must pass to claim conformance with http-response-kit spec v1.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createResponseKit, HttpError, createErrorCatalog } from '../src';
import type { KitConfig, ValidationIssue } from '../src';

interface VectorCase {
    name: string;
    description: string;
    method: 'error' | 'fromError' | 'problem' | 'success' | 'paginated' | 'paginatedCursor';
    config?: KitConfig;
    input: Record<string, any>;
    expected: unknown;
}

const vectors = JSON.parse(
    readFileSync(join(__dirname, '..', 'spec', 'vectors', 'vectors.json'), 'utf8')
) as { spec_version: string; cases: VectorCase[] };

function buildError(input: Record<string, any>): HttpError {
    if (input.validation) {
        return HttpError.validation(input.validation as ValidationIssue[]);
    }
    if (input.catalog) {
        const catalog = createErrorCatalog(input.catalog);
        const key = Object.keys(input.catalog)[0] as string;
        return catalog[key]!();
    }
    return new HttpError(input.status, input.options ?? {});
}

function buildUnknown(input: Record<string, any>): unknown {
    const err = new Error(input.errorMessage) as Error & { code?: string; cause?: unknown };
    if (input.systemCode) err.code = input.systemCode;
    if (input.causeMessage) {
        const cause = new Error(input.causeMessage) as Error & { code?: string };
        if (input.causeSystemCode) cause.code = input.causeSystemCode;
        err.cause = cause;
    }
    return err;
}

describe(`spec v${vectors.spec_version} conformance (${vectors.cases.length} vectors)`, () => {
    for (const c of vectors.cases) {
        it(`${c.name} - ${c.description}`, () => {
            const kit = createResponseKit({ includeTimestamp: false, ...c.config });
            let actual: unknown;

            switch (c.method) {
                case 'error':
                    actual = kit.error(buildError(c.input), c.input.requestId ? { requestId: c.input.requestId } : {});
                    break;
                case 'fromError':
                    actual = kit.fromError(buildUnknown(c.input));
                    break;
                case 'problem':
                    actual = kit.problem(
                        c.input.errorMessage ? HttpError.fromError(buildUnknown(c.input)) : buildError(c.input),
                        c.input.problemOptions ?? {}
                    );
                    break;
                case 'success':
                    actual = c.input.message !== undefined && c.input.statusCode === undefined
                        ? kit.ok(c.input.data, c.input.message)
                        : kit.success({ data: c.input.data, statusCode: c.input.statusCode, requestId: c.input.requestId });
                    break;
                case 'paginated':
                    actual = kit.paginated(c.input.data, { page: c.input.page, limit: c.input.limit, total: c.input.total });
                    break;
                case 'paginatedCursor':
                    actual = kit.paginatedCursor(c.input.data, { nextCursor: c.input.nextCursor, limit: c.input.limit });
                    break;
            }

            expect(actual).toEqual(c.expected);
        });
    }
});
