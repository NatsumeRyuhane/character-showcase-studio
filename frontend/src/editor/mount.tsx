// Mounts the React editor UI around the design sections that studio-views.js builds.
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { notifyEditor } from './store.ts';
import { Workspace, type WorkspaceView } from './Workspace.tsx';

export function mountEditorUI(root: HTMLElement, views: WorkspaceView[]): { sync(): void } {
  root.classList.add('studio-editor');
  root.dataset.panel = 'preview';
  const carousel = root.querySelector<HTMLElement>('.viz-carousel')!;
  carousel.className = 'studio-views';
  // The React root itself stays detached; everything it renders is portalled into the page.
  const host = createRoot(document.createElement('div'));
  // Render synchronously, so the controls exist before the first sync.
  flushSync(() => host.render(<Workspace root={root} views={views} carousel={carousel} />));
  return { sync: notifyEditor };
}
