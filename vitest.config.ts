import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'src/shared/vitest.config.ts',
      'src/functions/vitest.config.ts',
      'src/web/vitest.config.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
