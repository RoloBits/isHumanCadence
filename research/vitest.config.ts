import { defineConfig } from 'vitest/config';

// Runner for research experiments only. The main suite (vitest.config.ts at the
// root) never picks these up: its include is tests/**/*.test.ts, so nothing in
// research/ runs in CI or blocks a merge.
export default defineConfig({
  test: {
    include: ['research/experiments/**/*.exp.ts'],
    environment: 'node',
    globals: true,
  },
});
