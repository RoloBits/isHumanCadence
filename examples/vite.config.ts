import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/isHumanCadence/',
  resolve: {
    alias: {
      '@rolobits/is-human-cadence': resolve(__dirname, '../src/index.ts'),
    },
  },
});
