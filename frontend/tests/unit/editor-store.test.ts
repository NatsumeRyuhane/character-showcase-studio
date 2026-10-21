import { describe, expect, it, vi } from 'vitest';
import { editorRevision, notifyEditor, subscribeEditor } from '../../src/editor/store.ts';

describe('editor store', () => {
  it('advances the revision and notifies subscribers on every sync', () => {
    const listener = vi.fn();
    const before = editorRevision();
    const unsubscribe = subscribeEditor(listener);
    notifyEditor();
    notifyEditor();
    expect(editorRevision()).toBe(before + 2);
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    notifyEditor();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
