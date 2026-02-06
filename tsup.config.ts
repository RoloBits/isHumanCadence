import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm', 'cjs', 'iife'],
    globalName: 'IsHumanCadence',
    dts: true,
    clean: true,
    minify: true,
    sourcemap: false,
    treeshake: true,
    splitting: false,
    target: 'es2020',
  },
  {
    entry: { react: 'src/react/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    minify: true,
    sourcemap: false,
    external: ['react', 'is-human-cadence'],
    outDir: 'dist',
  },
  {
    entry: { vue: 'src/vue/index.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    minify: true,
    sourcemap: false,
    external: ['vue', 'is-human-cadence'],
    outDir: 'dist',
  },
]);
