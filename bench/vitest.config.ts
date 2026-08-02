import { defineConfig } from 'vitest/config';

// Runner for npm run bench only. The main suite (vitest.config.ts at the root)
// never picks this up: its include is tests/**/*.test.ts.
export default defineConfig({
  test: {
    include: ['bench/bench.ts'],
    environment: 'node',
    globals: true,
  },
});
