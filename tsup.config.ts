import { defineConfig } from 'tsup'

export default defineConfig([
    // Build configuration for plugin
    {
        entry: ['src/index.ts'],
        clean: true,
        dts: true,
        sourcemap: true,
        format: ['esm', 'cjs'],
        target: 'node20',
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
        target: 'node20',
        outDir: 'dist/test',
    }
])