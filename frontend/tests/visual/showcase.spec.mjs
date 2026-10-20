// Screenshot baseline for every design: both ratios, swapped sides, and fixed points on the timeline.
// Each case restores a saved state that is paused at a given time, so the frame is a pure function of
// that state (no playback, no seeking through the UI). See docs/dev/build-and-test.md#visual-regression-tests.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Frozen copy of the startup preset's widgetState, so publishing a new preset does not move the baseline.
const fixture = JSON.parse(fs.readFileSync(path.join(root, 'tests/visual/fixtures/studio-state.json'), 'utf8'));
const page = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8');
const preset = JSON.parse(page.match(/<script type="application\/json" id="studio-startup-defaults">([\s\S]*?)<\/script>/)[1]);

const designs = ['couture', 'brutalist', 'cloud', 'orbit', 'play', 'plush', 'poster', 'sticker', 'wave', 'dual', 'district', 'tuner', 'arcade'];
// The fixture's story intro: character shot 0–2.5 s, transition to 3.1 s, creator shot to 5.1 s,
// show to 17.1 s, then a 3.5 s outro ending in a 0.3 s CRT shutdown.
const moments = [
  { name: 'character', time: 1.2 },
  { name: 'creator', time: 4 },
  { name: 'show', time: 11 },
  { name: 'outro', time: 18.4 },
];
// The editor fits the preview to the window. These viewports give a 708×398 landscape and a 405×720
// portrait preview: big enough to show layout shifts, small enough to keep the baseline light.
const viewports = { landscape: { width: 1280, height: 800 }, portrait: { width: 1280, height: 1080 } };
const layouts = [
  { name: 'landscape', ratio: 'landscape', swapped: false },
  { name: 'landscape-swapped', ratio: 'landscape', swapped: true },
  { name: 'portrait', ratio: 'portrait', swapped: false },
  { name: 'portrait-swapped', ratio: 'portrait', swapped: true },
];
// Swapping only moves the show layout, so the swapped layouts are captured in the show only.
const cases = designs.flatMap(design => layouts.flatMap(layout => moments
  .filter(moment => !layout.swapped || moment.name === 'show')
  .map(moment => ({ design, layout, moment }))));

// Same key as runtime/standalone-shell.js for the page served at /.
const storageKey = `codex:visualization-widget-state-v2:${JSON.stringify(['/', ''])}`;

for (const { design, layout, moment } of cases) {
  test(`${design} ${layout.name} ${moment.name}`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (['error', 'warning'].includes(message.type())) errors.push(message.text()); });
    const state = structuredClone(fixture);
    Object.assign(state.privateContent, { activeDesign: design, ratio: layout.ratio, swapped: layout.swapped, time: moment.time, playing: false });
    await page.addInitScript(({ storageKey, state, revision }) => {
      // The sandboxed frame has an opaque origin and no storage; only the shell seeds it.
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
        localStorage.setItem(`${storageKey}:startup-revision`, revision);
      } catch {}
    }, { storageKey, state, revision: preset.revision });
    await page.setViewportSize(viewports[layout.ratio]);
    await page.goto('/');
    const frame = page.frameLocator('#codex-visualization');
    const art = frame.locator(`section[data-design="${design}"]:not([hidden]) .design-art`);
    await expect(art).toBeVisible();
    await expect(frame.locator('[data-seek]:visible')).toHaveValue(String(moment.time));
    await art.evaluate(() => document.fonts.ready);
    await expect(art).toHaveScreenshot([design, `${layout.name}-${moment.name}.png`]);
    expect(errors).toEqual([]);
  });
}
