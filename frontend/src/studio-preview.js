import { draw, measure } from './studio-views.js';
import { state } from './studio-session.js';
import { studioOutputLayout } from './export-layout.js';
// Fits each design's artwork into its preview area: 16:9 or 9:16 in the editor, scaled from the
// logical output size in clean-output mode. The controls around it are src/editor/Workspace.tsx.
let root = null, views = [];
export function sizeStudioPreview(view) {
  const stage = view.preview.querySelector('.stage-viewport');
  if (!stage.clientWidth || !stage.clientHeight) return;
  const style = getComputedStyle(stage);
  const width = stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const height = stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  if (width <= 0 || height <= 0) return;
  if (root.classList.contains('is-clean-output')) {
    const layout = studioOutputLayout(width, height, state.ratio === 'portrait', state.output.fit === 'cover');
    view.outputScale = layout.scale;
    view.art.style.setProperty('--preview-width', layout.width + 'px');
    view.art.style.transform = 'scale(' + layout.scale + ')';
    view.art.style.transformOrigin = 'center';
  } else {
    view.outputScale = 0;
    view.art.style.removeProperty('transform');
    view.art.style.removeProperty('transform-origin');
    const ratio = state.ratio === 'portrait' ? 9 / 16 : 16 / 9;
    view.art.style.setProperty('--preview-width', Math.max(1, Math.min(width, height * ratio)) + 'px');
  }
  measure(view);
  draw(view);
}
/** Re-fits the visible design after the next layout, e.g. when the panes or the ratio change. */
export function refreshStudioPreview() {
  requestAnimationFrame(() => {
    const view = views.find(v => !v.section.hidden);
    if (view) sizeStudioPreview(view);
  });
}
/** Wraps each section's stage in a .studio-preview, which the playback controls join. */
export function mountStudioPreview(editor, list) {
  root = editor;
  views = list;
  for (const view of views) {
    const preview = document.createElement('div');
    preview.className = 'studio-preview';
    preview.append(view.section.querySelector('.stage-viewport'));
    view.section.append(preview);
    view.preview = preview;
    new ResizeObserver(() => sizeStudioPreview(view)).observe(preview.querySelector('.stage-viewport'));
  }
}
