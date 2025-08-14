import { defineConfig } from 'tsup'

export default defineConfig([
    // Build configuration for plugin
    {
        entry: ['src/index.ts'],
        clean: true,
        dts: true,
        sourcemap: true,
        format: ['esm', 'cjs'],
        target: 'node16',
        outExtension({ format }) {
            return {
                js: format === 'esm' ? '.mjs' : '.cjs',
            }
        }
    },
    // Build configuration for tests
    {
        entry: ['test/**/*.test.ts'],
        sourcemap: true,
        clean: false, // false to keep plugin build files   
        format: ['esm'],
        target: 'node16',
        outDir: 'dist/test',
    }
])