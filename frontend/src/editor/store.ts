// Bridges the editor's mutable state to React.
// The session (studio-session.js) owns `state`, and everything mutates it in place. Each sync calls
// notifyEditor(), and components read the state again through useEditorRevision().
import { useSyncExternalStore } from 'react';

type Listener = () => void;
const listeners = new Set<Listener>();
let revision = 0;

export function notifyEditor(): void {
  revision++;
  for (const listener of listeners) listener();
}

export function subscribeEditor(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const editorRevision = (): number => revision;

/** Re-renders the calling component after every editor sync. */
export function useEditorRevision(): number {
  return useSyncExternalStore(subscribeEditor, editorRevision);
}
