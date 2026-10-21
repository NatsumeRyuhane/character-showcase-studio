import { studioContinuousShow, studioShowDuration, studioTotalDuration } from './timeline.ts';
import { createMotionClock } from './motion-clock.ts';
import { resetLastFrame, setMotionClock, state, update } from './studio-session.js';
import { refreshStudioPreview } from './studio-preview.js';
// Clean stage previews and the exported page's keyboard shortcuts. Native Spout transport belongs to OBS.
// The output dialog itself is the React component src/editor/OutputDialog.tsx.
const exported = globalThis.studioOutput?.enabled === true;
let root = null, exitHint = null;
export function setStudioCleanOutput(enabled) {
  root.classList.toggle('is-clean-output', enabled);
  root.classList.toggle('is-transparent-output', enabled && state.output.transparent);
  root.classList.toggle('output-hide-characters', enabled && !state.output.includeCharacters);
  document.documentElement.classList.toggle('studio-output-root', enabled);
  document.body.classList.toggle('studio-output-body', enabled);
  exitHint.hidden = !enabled || exported;
  exitHint.classList.toggle('is-visible', enabled && !exported);
  refreshStudioPreview();
}
export function mountStudioOutput(editor) {
  root = editor;
  exitHint = document.createElement('div');
  exitHint.className = 'studio-clean-hint';
  exitHint.textContent = '纯画面预览 · Esc 返回编辑';
  exitHint.hidden = true;
  root.append(exitHint);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !exported && root.classList.contains('is-clean-output')) {
      event.preventDefault();
      setStudioCleanOutput(false);
      return;
    }
    if (!exported || event.ctrlKey || event.altKey || event.metaKey || /INPUT|SELECT|TEXTAREA/.test(event.target?.tagName)) return;
    if (event.code === 'Space') {
      event.preventDefault();
      if (!state.playing && !studioContinuousShow(state.narrative) && state.time >= studioTotalDuration(state.introDuration, state.narrative)) {
        state.time = 0;
        setMotionClock(createMotionClock(0, state.variants, state.edges));
      }
      state.playing = !state.playing;
    } else if (event.key.toLowerCase() === 'r') {
      state.time = 0;
      setMotionClock(createMotionClock(0, state.variants, state.edges));
      state.playing = true;
    } else if (event.key.toLowerCase() === 's') {
      state.time = state.introDuration;
      state.playing = true;
    } else if (event.key.toLowerCase() === 'e' && state.narrative.outroEnabled) {
      state.time = state.introDuration + studioShowDuration(state.narrative);
      state.playing = true;
    } else return;
    resetLastFrame();
    update();
  });
  if (exported) {
    root.classList.add('is-exported-output');
    setStudioCleanOutput(true);
  }
}
