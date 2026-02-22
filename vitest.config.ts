import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 45,
        functions: 50,
        branches: 68,
        statements: 45
      },
      exclude: [
        'node_modules/',
        'dist/',
        'coverage/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'eslint.config.js',
        'vitest.config.ts'
      ]
    },
    include: [
      'tests/**/*.{test,spec}.ts'
    ]
  }
});