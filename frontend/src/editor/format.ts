// Display text derived from the editor state. Pure, so the panels and the tests share it.
import type { StudioState } from '../studio-state.ts';
import { studioContinuousShow } from '../timeline.ts';
import { studioOutputDimensions } from '../output-payload.ts';

export type OutputMode = 'obs' | 'ae';

/** One line under the export settings, e.g. "1920 × 1080 · 透明底 · 一体网页源 · 引入 4.5 秒 / 展示 12 秒". */
export function outputSummary(state: StudioState, mode: OutputMode): string {
  const [width, height] = studioOutputDimensions(state), n = state.narrative, continuous = studioContinuousShow(n);
  const separate = mode === 'obs' && state.output.obsLayers === 'separate';
  const target = mode === 'obs' ? (separate ? ' · 三层源 / 同步控制' : ' · 一体网页源') : ' · ' + state.output.fps + ' fps 可编辑合成';
  const intro = mode === 'ae' && !state.output.aeIntro || mode === 'obs' && state.output.start === 'show' ? 0 : state.introDuration;
  const show = mode === 'obs' && continuous ? '持续展示' : '展示 ' + n.showDuration + ' 秒';
  const ending = n.outroEnabled ? ' / 片尾 ' + n.outroDuration + ' 秒' : mode === 'obs' && !continuous ? ' · 循环' : '';
  return width + ' × ' + height + ' · ' + (state.output.transparent ? '透明底' : '完整背景') + target + ' · 引入 ' + intro + ' 秒 / ' + show + ending;
}

/** Label of a resolution option in the current ratio, e.g. "4K · 3840 × 2160". */
export function resolutionLabel(state: StudioState, resolution: '1080' | '2160'): string {
  const scale = resolution === '2160' ? 2 : 1, portrait = state.ratio === 'portrait';
  return (scale === 2 ? '4K' : '1080p') + ' · ' + (portrait ? 1080 * scale : 1920 * scale) + ' × ' + (portrait ? 1920 * scale : 1080 * scale);
}

/** The timing note above the preview, e.g. "引入 4.5s · 展示 12s · 片尾 3.5s". */
export function loopNote(state: StudioState): string {
  const n = state.narrative, continuous = studioContinuousShow(n);
  const ending = n.outroEnabled
    ? n.outroTrigger === 'manual' ? ' 循环 · 片尾待命' : ' · 片尾 ' + n.outroDuration + 's'
    : continuous ? ' · 持续展示 ∞' : ' 循环';
  return '引入 ' + state.introDuration + 's' + (continuous ? '' : ' · 展示 ' + n.showDuration + 's') + ending;
}
