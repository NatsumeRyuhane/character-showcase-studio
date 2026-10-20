// Visual regression baseline (rewrite phase 2, issue #3). See docs/dev/build-and-test.md#visual-regression-tests.
import { defineConfig } from '@playwright/test';

const port = 8797;
// Fonts and rasterization differ between systems, so the baseline only holds in the pinned image.
if (process.env.STUDIO_VISUAL_DOCKER !== '1') {
  throw new Error('Run the visual tests through Docker: npm run test:visual (or set STUDIO_VISUAL_DOCKER=1 inside the Playwright image).');
}

export default defineConfig({
  testDir: 'tests/visual',
  // Baselines are rendered in the pinned Playwright Linux image only (tools/visual-docker.mjs, CI),
  // so file names carry no platform suffix.
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}{ext}',
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://127.0.0.1:${port}/`,
    browserName: 'chromium',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    locale: 'zh-CN',
    timezoneId: 'UTC',
  },
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  webServer: {
    command: `node tools/server.mjs ${port}`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: false,
  },
});
