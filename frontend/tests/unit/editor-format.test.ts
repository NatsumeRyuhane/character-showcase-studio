import { describe, expect, it } from 'vitest';
import { createStudioState } from '../../src/studio-state.ts';
import { loopNote, outputSummary, resolutionLabel } from '../../src/editor/format.ts';

describe('outputSummary', () => {
  it('describes an OBS package', () => {
    const state = createStudioState();
    Object.assign(state.narrative, { outroEnabled: false, showPlayback: 'continuous' });
    expect(outputSummary(state, 'obs')).toBe(`1920 × 1080 · 完整背景 · 一体网页源 · 引入 ${state.introDuration} 秒 / 持续展示`);
    Object.assign(state.output, { obsLayers: 'separate', start: 'show', transparent: true });
    state.narrative.showPlayback = 'repeat';
    expect(outputSummary(state, 'obs')).toBe(`1920 × 1080 · 透明底 · 三层源 / 同步控制 · 引入 0 秒 / 展示 ${state.narrative.showDuration} 秒 · 循环`);
  });

  it('describes an AE template', () => {
    const state = createStudioState();
    Object.assign(state.output, { fps: 60, aeIntro: false, resolution: '2160' });
    Object.assign(state.narrative, { outroEnabled: true, outroDuration: 3.5 });
    expect(outputSummary(state, 'ae')).toBe(`3840 × 2160 · 完整背景 · 60 fps 可编辑合成 · 引入 0 秒 / 展示 ${state.narrative.showDuration} 秒 / 片尾 3.5 秒`);
  });
});

describe('resolutionLabel', () => {
  it('follows the ratio', () => {
    const state = createStudioState();
    expect(resolutionLabel(state, '2160')).toBe('4K · 3840 × 2160');
    state.ratio = 'portrait';
    expect(resolutionLabel(state, '1080')).toBe('1080p · 1080 × 1920');
  });
});

describe('loopNote', () => {
  it('names each part of the sequence', () => {
    const state = createStudioState();
    state.introDuration = 4.5;
    Object.assign(state.narrative, { outroEnabled: false, showPlayback: 'continuous' });
    expect(loopNote(state)).toBe('引入 4.5s · 持续展示 ∞');
    Object.assign(state.narrative, { showPlayback: 'repeat', showDuration: 12 });
    expect(loopNote(state)).toBe('引入 4.5s · 展示 12s 循环');
    Object.assign(state.narrative, { outroEnabled: true, outroTrigger: 'manual' });
    expect(loopNote(state)).toBe('引入 4.5s · 展示 12s 循环 · 片尾待命');
    state.narrative.outroTrigger = 'auto';
    state.narrative.outroDuration = 3;
    expect(loopNote(state)).toBe('引入 4.5s · 展示 12s · 片尾 3s');
  });
});
