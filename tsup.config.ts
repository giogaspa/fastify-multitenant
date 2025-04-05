import { defineConfig } from 'tsup'

export default defineConfig({
    entry: ['src/index.ts'],
    splitting: false,
    clean: true,
    dts: true,
    format: ['esm', 'cjs'],
    target: 'node16',
    outExtension({ format }) {
        return {
            js: format === 'esm' ? '.mjs' : '.cjs',
        }
    }
})