// The live editor session: the state every module reads and changes, session-only images,
// the continuous motion clock, saving and restoring through the widget host, and frame timing.
// It imports no UI or artwork module, so every module can import it without a cycle.
// studio-app.js registers the sync that update() runs (onStudioSync).
import { createMotionClock } from './motion-clock.ts';
import { createStudioState, restoreStudioState, stateSignature, studioModelContent, studioSnapshot } from './studio-state.ts';
import { notifyEditor } from './editor/store.ts';

// Rendered output plays the requested animation regardless of OS UI preferences.
export const root = document.getElementById('character-directions'), reduced = globalThis.studioOutput?.enabled === true ? { matches: false, addEventListener() {} } : matchMedia('(prefers-reduced-motion: reduce)');
export const state = createStudioState({ reducedMotion: reduced.matches });
// Uploaded images live only for this page session; they are never saved in the state.
export const images = { qr: '', barcode: '', logo: '', model: '', portrait: '', introCharacter: '', introAuthor: '' };
export const imageNames = {};
export const currentSeries = () => state.seriesData[state.series];
const restore = saved => restoreStudioState(state, saved, { reducedMotion: reduced.matches });
restore(window.openai?.widgetState);

// An exported page starts from its output settings and carries its permitted images.
if (globalThis.studioOutput?.enabled === true) {
  const output = globalThis.studioOutput;
  if (output.playback === 'complete' && state.narrative.outroEnabled) state.narrative.outroTrigger = 'auto';
  state.time = output.start === 'show' ? state.introDuration : 0;
  state.playing = !reduced.matches;
  state.output.transparent = output.transparent === true;
  state.output.includeCharacters = output.includeCharacters === true;
  state.output.obsLayers = output.obsLayers === 'separate' ? 'separate' : 'combined';
  state.output.start = output.start === 'show' ? 'show' : 'intro';
  state.output.fit = output.fit === 'cover' ? 'cover' : 'contain';
  for (const key of Object.keys(images)) {
    const value = globalThis.studioImages?.[key];
    if (typeof value === 'string' && /^data:image\/(png|jpeg|webp);base64,/i.test(value)) {
      images[key] = value;
      imageNames[key] = '已打包素材';
    }
  }
}

export let motionClock = createMotionClock(state.time, state.variants, state.edges);
// Imported bindings are read-only, so other modules replace the clock through this.
export function setMotionClock(clock) { motionClock = clock; }
// Time of the last animation frame, 0 to restart frame timing (after seeking, replaying or restoring).
export const frame = { last: 0 };
export function resetLastFrame() { frame.last = 0; }

const ownSnapshots = new Set();
function save() {
  const snapshot = studioSnapshot(state);
  ownSnapshots.add(stateSignature(snapshot));
  if (ownSnapshots.size > 32) ownSnapshots.delete(ownSnapshots.values().next().value);
  window.openai?.setWidgetState?.({ modelContent: studioModelContent(state), privateContent: snapshot })?.catch(() => {});
}

let sync = () => {};
export function onStudioSync(handler) { sync = handler; }
// Sync the page with the state, then save. syncStudio redraws without saving (while seeking),
// and saveStudio saves once a seek ends.
export function update() { sync(); save(); }
export function syncStudio() { sync(); }
export function saveStudio() { save(); }

// Shown under the content pane (src/editor/ContentPanel.tsx).
export let studioError = '';
export function showStudioError(text) {
  if (studioError === text) return;
  studioError = text;
  notifyEditor();
}

export function loadStudioImage(kind, file) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
    showStudioError('请选择 12 MB 以内的 PNG、WebP 或 JPG 图片。');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => { images[kind] = reader.result; imageNames[kind] = file.name; sync(); };
  reader.onerror = () => showStudioError('图片读取失败，请重新选择。');
  reader.readAsDataURL(file);
}
export function clearStudioImage(kind) { images[kind] = ''; delete imageNames[kind]; sync(); }

// A state saved elsewhere (another tab, the host) replaces this one; echoes of our own saves are ignored.
window.addEventListener('openai:set_globals', event => {
  const globals = event.detail?.globals;
  if (Object.hasOwn(globals || {}, 'widgetState')) {
    if (ownSnapshots.has(stateSignature(globals.widgetState?.privateContent))) return;
    if (!restore(globals.widgetState)) return;
    motionClock = createMotionClock(state.time, state.variants, state.edges);
    frame.last = 0;
    sync();
  }
});
