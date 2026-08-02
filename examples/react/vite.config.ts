import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// The "new" engine is always this working tree's src (the branch).
// The "baseline" engine is the CURRENT shipped code — main's src. In the PR
// preview build the workflow checks out main's src and points VITE_BASELINE_SRC
// at it; locally it falls back to this same tree, so the demo still builds
// (current and proposed are then identical — the real diff only shows in the
// preview, where main's src is fetched).
const branchSrc = resolve(__dirname, '../../src');
const baselineSrc = process.env.VITE_BASELINE_SRC
  ? resolve(process.env.VITE_BASELINE_SRC)
  : branchSrc;

export default defineConfig({
  base: '/isHumanCadence/',
  plugins: [react()],
  resolve: {
    alias: {
      // Order matters — more specific path first.
      '@rolobits/is-human-cadence/react': resolve(branchSrc, 'react/index.ts'),
      '@rolobits/is-human-cadence': resolve(branchSrc, 'index.ts'),
      // The baseline (main) engine, imported only by the comparison view.
      '@rolobits/is-human-cadence-baseline/react': resolve(baselineSrc, 'react/index.ts'),
      '@rolobits/is-human-cadence-baseline': resolve(baselineSrc, 'index.ts'),
    },
  },
});
