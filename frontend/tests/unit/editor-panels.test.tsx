// @vitest-environment jsdom
// The React panels against a stand-in for the editor session: each control writes the setting it names.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { palettes } from '../../src/studio-state.ts';

const logic = vi.hoisted(() => ({ update: vi.fn(), state: null as never }));
vi.mock('../../src/studio-session.js', async () => {
  const { createStudioState, seriesDefaults } = await vi.importActual<typeof import('../../src/studio-state.ts')>('../../src/studio-state.ts');
  const { notifyEditor } = await vi.importActual<typeof import('../../src/editor/store.ts')>('../../src/editor/store.ts');
  const state = createStudioState();
  logic.state = state as never;
  logic.update.mockImplementation(() => notifyEditor());
  return {
    state,
    images: { qr: '', barcode: '', logo: '', model: '', portrait: '', introCharacter: '', introAuthor: '' },
    imageNames: {},
    studioError: '',
    update: logic.update,
    currentSeries: () => state.seriesData[state.series] ?? seriesDefaults.atelier,
    loadStudioImage: vi.fn(),
    clearStudioImage: vi.fn(),
    resetLastFrame: vi.fn(),
  };
});
vi.mock('../../src/studio-views.js', () => ({
  badgeColors: (v: { badgeColor: string; badgeInk: string }) => [v.badgeColor, v.badgeInk],
}));

const { ContentPanel } = await import('../../src/editor/ContentPanel.tsx');
const { Inspectors } = await import('../../src/editor/Inspector.tsx');
const { NumberInput } = await import('../../src/editor/controls.tsx');
const { state } = await import('../../src/studio-session.js');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let host: HTMLElement, root: Root;
beforeEach(() => {
  host = document.body.appendChild(document.createElement('div'));
  root = createRoot(host);
  logic.update.mockClear();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

// React tracks input values itself, so set them through the native setter before dispatching.
function type(el: Element, value: string, event = 'input') {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value);
    el.dispatchEvent(new Event(event, { bubbles: true }));
  });
}
const byLabel = (text: string, scope: ParentNode = document) => {
  const label = [...scope.querySelectorAll('label')].find(el => el.textContent?.startsWith(text));
  if (!label) throw new Error('No label ' + text);
  return (label.htmlFor ? document.getElementById(label.htmlFor) : label.querySelector('input, select')) ?? label.parentElement!.querySelector('input, select')!;
};

describe('ContentPanel', () => {
  it('writes the shared content and the current series', () => {
    act(() => root.render(<ContentPanel views={[]} />));
    type(byLabel('角色名字'), 'Mika');
    expect(state.name).toBe('Mika');
    act(() => (host.querySelector('[aria-label^="FUR"]') as HTMLButtonElement).click());
    expect(state.series).toBe('fur');
    type(byLabel('作品编号'), '12a');
    expect(state.seriesData.fur.serial).toBe('12');
    expect(byLabel('作品编号')).toHaveProperty('value', '12');
    expect(host.querySelector('.studio-series-summary')!.textContent).toContain('-12');
    expect(logic.update).toHaveBeenCalledTimes(3);
  });

  it('keeps badges in catalog order', () => {
    state.badges = [];
    act(() => root.render(<ContentPanel views={[]} />));
    for (const name of ['Poiyomi', 'MMD Compatible']) act(() => (byLabel(name) as HTMLInputElement).click());
    expect(state.badges).toEqual(['mmd', 'poiyomi']);
  });
});

describe('Inspectors', () => {
  const views = (['couture', 'poster'] as const).map(key => {
    const section = document.body.appendChild(document.createElement('section'));
    section.dataset.variant = key;
    return { key, section };
  });

  it('edits only the visible design and stores ranges as fractions', () => {
    state.activeDesign = 'couture';
    act(() => root.render(<Inspectors views={views} />));
    const couture = views[0].section, before = state.variants.poster.ringScale;
    type(byLabel('几何大小', couture), '120');
    expect(state.variants.couture.ringScale).toBeCloseTo(1.2);
    expect(state.variants.poster.ringScale).toBe(before);
    expect(byLabel('几何大小', couture).closest('.direction-field')!.querySelector('output')!.textContent).toBe('120%');
    type(byLabel('点缀配色', couture), 'red', 'change');
    expect(state.variants.couture.accent).toBe(palettes.red);
  });

  it('disables controls that have no effect', () => {
    state.activeDesign = 'couture';
    Object.assign(state.variants.couture, { grid: true, pattern: 'mesh' });
    act(() => root.render(<Inspectors views={views} />));
    const couture = views[0].section, strength = byLabel('背景图案强度', couture) as HTMLInputElement;
    expect(strength.disabled).toBe(false);
    act(() => (byLabel('显示背景图案', couture) as HTMLInputElement).click());
    expect(state.variants.couture.grid).toBe(false);
    expect(strength.disabled).toBe(true);
  });

  it('shows the shared border controls in the visible inspector only', () => {
    state.activeDesign = 'poster';
    state.frame = 'vertical';
    act(() => root.render(<Inspectors views={views} />));
    expect(views[0].section.querySelector('#direction-top-text')).toBeNull();
    expect(views[1].section.querySelector('label[for="direction-top-text"]')!.textContent).toBe('左边框文字');
  });
});

describe('NumberInput', () => {
  it('keeps the typed text until the field loses focus', () => {
    let stored = 4.5;
    const onValue = vi.fn((value: number) => { stored = Math.min(30, value); });
    const render = () => root.render(<NumberInput value={stored} onValue={onValue} />);
    act(render);
    const input = host.querySelector('input')!;
    type(input, '45');
    act(render);
    expect(onValue).toHaveBeenLastCalledWith(45);
    expect(input.value).toBe('45');
    act(() => input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })));
    act(render);
    expect(input.value).toBe('30');
  });
});
