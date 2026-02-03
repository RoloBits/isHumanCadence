import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  base: '/isHumanCadence/',
  plugins: [react()],
  resolve: {
    alias: {
      // Order matters — more specific path first
      '@rolobits/is-human-cadence/react': resolve(__dirname, '../../src/react/index.ts'),
      '@rolobits/is-human-cadence': resolve(__dirname, '../../src/index.ts'),
    },
  },
});
