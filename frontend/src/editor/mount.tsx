// Mounts the React editor UI. Panels render through portals into the workspace that
// studio-workspace.js still builds, so they can move to React one at a time.
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { OutputDialog } from './OutputDialog.tsx';
import { notifyEditor } from './store.ts';

export function mountEditorUI(root: HTMLElement, views: { section: HTMLElement }[]): { sync(): void } {
  // The React root itself stays detached; everything it renders is portalled into the page.
  const host = createRoot(document.createElement('div'));
  // Render synchronously, so the controls exist before the logic module's first sync.
  flushSync(() => host.render(<OutputDialog headerActions={root.querySelector('.studio-header-actions')!} root={root} views={views} />));
  return { sync: notifyEditor };
}
