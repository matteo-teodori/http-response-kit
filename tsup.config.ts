import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        express: 'src/adapters/express.ts',
        fastify: 'src/adapters/fastify.ts',
        koa: 'src/adapters/koa.ts',
        hono: 'src/adapters/hono.ts',
        schemas: 'src/schemas/index.ts',
        context: 'src/context.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    // Sourcemaps are omitted from the published artifact to keep the package
    // lean; the output is unminified and readable. Rebuild locally for maps.
    sourcemap: false,
    treeshake: true,
    // Matches engines.node (>= 20); Node 18 is end-of-life.
    target: 'node20',
});
