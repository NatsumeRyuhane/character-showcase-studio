// Starts the editor: builds the design views, mounts the editor UI and the other page parts around
// them, connects them to the session (the sync that update() runs), and drives the shared paint
// loop. Nothing imports this module; src/main.js runs it.
import { studioAdvanceTime, studioTotalDuration } from './timeline.ts';
import { advanceMotionClock } from './motion-clock.ts';
import { mountStudioPreview, refreshStudioPreview } from './studio-preview.js';
import { mountStudioNarrative } from './studio-narrative.js';
import { mountStudioOutput } from './studio-output.js';
import { mountEditorUI } from './editor/mount.tsx';
import { mountStudioLayerSync, studioApplyLayerClock } from './obs-layer-sync.js';
import { createViews, draw, measure, paintGrain, syncView } from './studio-views.js';
import { connectStudio, frame, images, motionClock, reduced, root, saveStudio, showStudioError, state } from './studio-session.js';

const views = createViews();
mountStudioPreview(root, views);
const narrativeUI = mountStudioNarrative(views);
const editorUI = mountEditorUI(root, views);
mountStudioOutput(root);
mountStudioLayerSync();

// Shows the active design only, re-renders the controls, and syncs every view's artwork.
function sync() {
  const selected = views.find(v => v.key === state.activeDesign) || views[0];
  state.activeDesign = selected.key;
  for (const view of views) view.section.hidden = view !== selected;
  refreshStudioPreview();
  narrativeUI.sync();
  editorUI.sync();
  for (const view of views) syncView(view);
  showStudioError(views.some(v => v.qrError) && !images.qr ? '请输入完整的 http:// 或 https:// 链接，或上传二维码图片。' : '');
}
connectStudio({ sync, notify: editorUI.sync });

for (const view of views) {
  // The pointer moves the artwork slightly (parallax); draw() eases towards it.
  view.art.addEventListener('pointermove', event => {
    if (reduced.matches || !state.playing) return;
    const rect = view.art.getBoundingClientRect();
    view.px = (event.clientX - rect.left) / rect.width - .5;
    view.py = (event.clientY - rect.top) / rect.height - .5;
  });
  view.art.addEventListener('pointerleave', () => { view.px = 0; view.py = 0; });
  paintGrain(view);
  new ResizeObserver(() => { measure(view); draw(view); }).observe(view.art);
}
reduced.addEventListener('change', () => {
  if (reduced.matches) {
    state.playing = false;
    for (const view of views) view.px = view.py = view.sx = view.sy = 0;
    sync();
  }
});

sync();
document.fonts?.ready.then(() => { if (root.isConnected) for (const view of views) { measure(view); draw(view); } });

// The paint loop. The timeline and the continuous clocks advance by the elapsed time (capped, so a
// background tab does not jump), unless a separate OBS layer takes its clock from the shared server.
function paintFrame(now) {
  if (!root.isConnected) return;
  if (!studioApplyLayerClock() && frame.last && state.playing && !document.hidden) {
    const delta = Math.min((now - frame.last) / 1000, .08) * state.speed;
    state.time = studioAdvanceTime(state.time, delta, state.introDuration, state.narrative);
    if (state.narrative.outroEnabled && state.time >= studioTotalDuration(state.introDuration, state.narrative)) {
      state.playing = false;
      saveStudio();
      editorUI.sync();
    }
    advanceMotionClock(motionClock, delta, state.variants, state.edges);
  }
  frame.last = now;
  for (const view of views) {
    if (view.section.hidden) continue;
    if (state.playing) {
      view.sx += (view.px - view.sx) * .07;
      view.sy += (view.py - view.sy) * .07;
    }
    if (view.w) draw(view);
    else measure(view);
  }
  requestAnimationFrame(paintFrame);
}
requestAnimationFrame(paintFrame);
