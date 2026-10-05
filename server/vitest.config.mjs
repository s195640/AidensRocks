import { defineConfig } from 'vitest/config';

// Regression suite -- see data/ai-build-docs/regression-testing/RUNBOOK.md.
// Needs the throwaway stack (npm run test:db:up) on 5433 / 1026 / 8026.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs}'],
    globalSetup: ['tests/setup/globalSetup.mjs'],
    setupFiles: ['tests/setup/perFile.mjs'],
    // Forks (not threads) so perFile can process.chdir() into the temp media
    // root; one file at a time because every file shares one database.
    pool: 'forks',
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
});
