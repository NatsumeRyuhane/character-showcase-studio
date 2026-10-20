// Unit tests (rewrite phase 3, issue #3). See docs/dev/build-and-test.md#unit-tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only the unit tests: tests/visual holds Playwright specs, tests/*.cjs the older vm-based checks.
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
