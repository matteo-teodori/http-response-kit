import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        express: 'src/adapters/express.ts',
        fastify: 'src/adapters/fastify.ts',
        koa: 'src/adapters/koa.ts',
        hono: 'src/adapters/hono.ts',
        schemas: 'src/schemas/index.ts',
    },
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    target: 'node18',
});
