// Unit tests. See docs/dev/build-and-test.md#unit-tests.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { outputHostDefines } from './tools/output-host-defines.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => ({
  // The output host's build-time constants, exactly as tools/build.mjs supplies them.
  define: await outputHostDefines(root),
  test: {
    // Only the unit tests: tests/*.cjs are the older vm-based checks.
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
}));
