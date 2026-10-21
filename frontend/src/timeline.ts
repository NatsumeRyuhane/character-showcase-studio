import { studioCRTPose } from '../runtime/crt-motion.js';

// Narrative timing is independent of the continuous geometry/text clocks.

export type IntroStyle = 'model' | 'title' | 'story';
export type StoryCorner = 'tl-br' | 'tr-bl' | 'bl-tr' | 'br-tl' | 'center';
export type StoryEffect = 'none' | 'crt' | 'holo' | 'polar';
export type PostEffect = 'none' | 'polar' | 'crt' | 'holo' | 'bloom' | 'anamorphic' | 'prism' | 'film';

/** Validated narrative settings, as `studioNarrativeSettings` returns them. */
export interface NarrativeSettings {
  introStyle: IntroStyle;
  nameReveal: 'show' | 'delayed';
  nameDelay: number;
  showDuration: number;
  showPlayback: 'continuous' | 'repeat';
  outroEnabled: boolean;
  outroDuration: number;
  outroStyle: 'signature' | 'orbit' | 'quiet';
  outroContent: 'auto' | 'word' | 'logo';
  outroTrigger: 'auto' | 'manual';
  shutdownEnabled: boolean;
  shutdownDuration: number;
  characterShotEnabled: boolean;
  authorShotEnabled: boolean;
  characterShotDuration: number;
  authorShotDuration: number;
  storyTransitionDuration: number;
  characterCorner: StoryCorner;
  authorCorner: StoryCorner;
  characterEffect: StoryEffect;
  authorEffect: StoryEffect;
  characterEffectStrength: number;
  authorEffectStrength: number;
  characterEffectSpeed: number;
  authorEffectSpeed: number;
  postEffect: PostEffect;
  postStrength: number;
  postSpeed: number;
  postFade: number;
  postGlow: number;
  postCharacter: boolean;
  postAuthor: boolean;
  postShow: boolean;
  postOutro: boolean;
  storyPackagingOnly: boolean;
  storyFlash: boolean;
  characterScale: number;
  authorScale: number;
  characterX: number;
  characterY: number;
  authorX: number;
  authorY: number;
}
/**
 * Narrative settings that may not have been validated, such as a restored
 * snapshot. Most functions validate what they read; a few read raw flags.
 */
export type NarrativeInput = { readonly [K in keyof NarrativeSettings]?: unknown } | null | undefined;

export interface StoryPose {
  active: boolean;
  role: 'character' | 'author' | 'show';
  local: number;
  duration: number;
  alpha: number;
  shift: number;
  /** Progress of the dissolve into the show, 0–1. */
  main: number;
  transitionStart: number;
  transitionDuration: number;
  flash: number;
}
export type CRTPose = ReturnType<typeof studioCRTPose>;
export interface NarrativePose extends CRTPose {
  geometry: number;
  titleMove: number;
  titleAlpha: number;
  info: number;
  model: number;
  story: StoryPose | null;
  outro: number;
  brand: number;
  mark: number;
  shutdown: number;
  progress: number;
}

const finite = (value: unknown): value is number => Number.isFinite(value);
const ease = (x: number) => {
  x = Math.max(0, Math.min(1, x));
  return x * x * (3 - 2 * x);
};
function pick<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return (values as readonly unknown[]).includes(value) ? value as T : fallback;
}
const bounded = (value: unknown, min: number, max: number, fallback: number) => finite(value) ? Math.max(min, Math.min(max, value)) : fallback;

export function studioIntroDuration(value: unknown): number {
  return finite(value) ? Math.max(0, Math.min(30, value)) : 4.5;
}
export function studioShowDuration(narrative: NarrativeInput): number {
  const value = narrative?.showDuration;
  return finite(value) ? Math.max(1, Math.min(60, value)) : 12;
}

const corners: readonly StoryCorner[] = ['tl-br', 'tr-bl', 'bl-tr', 'br-tl', 'center'];
const storyEffects: readonly StoryEffect[] = ['none', 'crt', 'holo', 'polar'];

/** Validates and clamps narrative settings, filling in defaults. */
export function studioNarrativeSettings(raw: unknown = {}): NarrativeSettings {
  const value: Exclude<NarrativeInput, null | undefined> = raw && typeof raw === 'object' ? raw : {};
  const outroDuration = bounded(value.outroDuration, 1.5, 12, 3.5);
  return {
    introStyle: pick(value.introStyle, ['model', 'title', 'story'], 'model'),
    nameReveal: pick(value.nameReveal, ['show', 'delayed'], 'show'),
    nameDelay: bounded(value.nameDelay, 0.2, 0.9, 0.65),
    showDuration: studioShowDuration(value),
    showPlayback: pick(value.showPlayback, ['continuous', 'repeat'], 'continuous'),
    outroEnabled: value.outroEnabled === true,
    outroDuration,
    outroStyle: pick(value.outroStyle, ['signature', 'orbit', 'quiet'], 'signature'),
    outroContent: pick(value.outroContent, ['auto', 'word', 'logo'], 'auto'),
    outroTrigger: pick(value.outroTrigger, ['auto', 'manual'], 'auto'),
    shutdownEnabled: value.shutdownEnabled !== false,
    shutdownDuration: bounded(value.shutdownDuration, 0.3, Math.min(1.5, outroDuration * 0.45), Math.min(0.8, outroDuration * 0.45)),
    characterShotEnabled: value.characterShotEnabled !== false,
    authorShotEnabled: value.authorShotEnabled !== false,
    characterShotDuration: bounded(value.characterShotDuration, 0.5, 12, 2.5),
    authorShotDuration: bounded(value.authorShotDuration, 0.5, 12, 2),
    storyTransitionDuration: bounded(value.storyTransitionDuration, 0.15, 3, 0.6),
    characterCorner: pick(value.characterCorner, corners, 'tl-br'),
    authorCorner: pick(value.authorCorner, corners, 'tr-bl'),
    characterEffect: pick(value.characterEffect, storyEffects, 'polar'),
    authorEffect: pick(value.authorEffect, storyEffects, 'polar'),
    characterEffectStrength: bounded(value.characterEffectStrength, 0, 1, 0.3),
    authorEffectStrength: bounded(value.authorEffectStrength, 0, 1, 0.3),
    characterEffectSpeed: bounded(value.characterEffectSpeed, 0.1, 2, 0.7),
    authorEffectSpeed: bounded(value.authorEffectSpeed, 0.1, 2, 0.7),
    // A snapshot from before post-processing falls back to its legacy per-shot effect.
    postEffect: pick(value.postEffect, ['none', 'polar', 'crt', 'holo', 'bloom', 'anamorphic', 'prism', 'film'], pick(value.characterEffect, ['polar', 'crt', 'holo'], 'polar')),
    postStrength: bounded(value.postStrength, 0, 1, 0.6),
    postSpeed: bounded(value.postSpeed, 0.1, 2, 0.7),
    postFade: bounded(value.postFade, 0.15, 1.5, 0.45),
    postGlow: bounded(value.postGlow, 0, 1, 0.25),
    postCharacter: value.postCharacter !== false,
    postAuthor: value.postAuthor !== false,
    postShow: value.postShow === true,
    postOutro: value.postOutro === true,
    storyPackagingOnly: value.storyPackagingOnly === true,
    storyFlash: value.storyFlash === true,
    characterScale: bounded(value.characterScale, 0.6, 2.4, 1.15),
    authorScale: bounded(value.authorScale, 0.6, 2.4, 1.25),
    characterX: bounded(value.characterX, 0, 100, 55),
    characterY: bounded(value.characterY, 0, 100, 50),
    authorX: bounded(value.authorX, 0, 100, 45),
    authorY: bounded(value.authorY, 0, 100, 50),
  };
}

// Two independently composed poster shots precede the main showcase. Disabled
// shots consume no time; with neither enabled, the opening is skipped entirely.
export function studioStoryDuration(narrative: NarrativeInput): number {
  const n = studioNarrativeSettings(narrative);
  return (n.characterShotEnabled ? n.characterShotDuration : 0) + (n.authorShotEnabled ? n.authorShotDuration : 0) + (n.characterShotEnabled || n.authorShotEnabled ? n.storyTransitionDuration : 0);
}

/** The two-shot poster intro at `time`. `intro` stretches the shots to that total duration. */
export function studioStoryPose(time: number, intro: unknown, narrative: NarrativeInput): StoryPose {
  const n = studioNarrativeSettings(narrative), nominal = studioStoryDuration(n), total = finite(intro) ? studioIntroDuration(intro) : nominal;
  if (!nominal || !total) return { active: false, role: 'show', local: 0, duration: 0, alpha: 0, shift: 0, main: 1, transitionStart: 0, transitionDuration: 0, flash: 0 };
  const scale = total / nominal, shots: { role: 'character' | 'author'; duration: number }[] = [];
  if (n.characterShotEnabled) shots.push({ role: 'character', duration: n.characterShotDuration * scale });
  if (n.authorShotEnabled) shots.push({ role: 'author', duration: n.authorShotDuration * scale });
  const transitionDuration = n.storyTransitionDuration * scale, transitionStart = total - transitionDuration;
  const t = Math.max(0, finite(time) ? time : 0), main = ease((t - transitionStart) / transitionDuration);
  let start = 0, shot = shots[0], index = 0;
  while (index < shots.length - 1 && t >= start + shot.duration) {
    start += shot.duration;
    shot = shots[++index];
  }
  const local = Math.min(shot.duration, Math.max(0, t - start));
  const fadeIn = Math.min(0.24 * scale, shot.duration * 0.22), fadeOut = Math.min(0.2 * scale, shot.duration * 0.2);
  const entry = ease(local / fadeIn), lastShot = index === shots.length - 1, exit = lastShot ? main : 1 - ease((shot.duration - local) / fadeOut);
  const alpha = t >= total ? 0 : entry * (1 - exit), shift = 0.032 * (1 - ease(local / Math.min(0.65 * scale, shot.duration * 0.55))) - 0.018 * exit;
  let flash = 0;
  if (n.storyFlash) {
    for (const boundary of [shots.length > 1 ? shots[0].duration : -1, transitionStart]) {
      if (boundary > 0) {
        const distance = (t - boundary) / (0.055 * scale);
        flash = Math.max(flash, Math.exp(-distance * distance) * 0.7);
      }
    }
    if (t >= total) flash = 0;
  }
  return { active: t < total, role: t >= total ? 'show' : shot.role, local, duration: shot.duration, alpha, shift, main, transitionStart, transitionDuration, flash };
}

/** Without an outro or a repeating show, the show holds once the information has entered. */
export function studioContinuousShow(narrative: NarrativeInput): boolean {
  return !narrative?.outroEnabled && narrative?.showPlayback !== 'repeat';
}
export function studioTotalDuration(intro: unknown, narrative: NarrativeInput): number {
  return studioIntroDuration(intro) + studioShowDuration(narrative) + (narrative?.outroEnabled ? studioNarrativeSettings(narrative).outroDuration : 0);
}
export function studioPhase(time: number, intro: unknown, narrative: NarrativeInput): 'intro' | 'show' | 'outro' {
  return time < studioIntroDuration(intro) ? 'intro' : narrative?.outroEnabled && time >= studioIntroDuration(intro) + studioShowDuration(narrative) ? 'outro' : 'show';
}
/** Maps time onto the 4.5 s reference intro, then continues 1:1 into the show. */
export function studioNarrativeTime(time: unknown, intro: unknown): number {
  const duration = studioIntroDuration(intro), t = finite(time) ? Math.max(0, time) : 0;
  return duration > 0 && t < duration ? t / duration * 4.5 : 4.5 + Math.max(0, t - duration);
}
/** Advances playback by `delta`: continuous or repeating show, automatic or manual outro. */
export function studioAdvanceTime(time: number, delta: number, intro: unknown, narrative: NarrativeInput): number {
  const duration = studioIntroDuration(intro), show = studioShowDuration(narrative), next = Math.max(0, time + delta);
  if (narrative?.outroEnabled && (narrative.outroTrigger !== 'manual' || time >= duration + show)) return Math.min(next, studioTotalDuration(intro, narrative));
  // Hold the completed information entrance, while independent motion clocks
  // keep rings, patterns, copy and border text moving without a narrative reset.
  if (studioContinuousShow(narrative)) return Math.min(next, duration + show);
  return next >= duration + show ? duration + (next - duration) % show : next;
}
/** Keeps relative progress inside the show when its duration changes. */
export function studioRetimeShow(time: number, intro: unknown, before: NarrativeInput, after: NarrativeInput): number {
  const start = studioIntroDuration(intro), old = studioShowDuration(before), next = studioShowDuration(after);
  if (time < start) return time;
  return time < start + old ? start + (time - start) / old * next : start + next + (time - start - old);
}
/** Keeps relative progress inside the intro when its duration changes. */
export function studioRetime(time: number, before: unknown, after: unknown): number {
  const old = studioIntroDuration(before), next = studioIntroDuration(after);
  return old > 0 && time < old ? time / old * next : next + Math.max(0, time - old);
}

// All narrative animation is seekable. The independent ring clock never resets
// when moving from intro to showcase or when the brand ending starts.
export function studioNarrativePose(time: number, intro: unknown, narrative: NarrativeInput): NarrativePose {
  const n = studioNarrativeSettings(narrative), duration = studioIntroDuration(intro), t = Math.max(0, time);
  const story = n.introStyle === 'story' ? studioStoryPose(t, duration, n) : null;
  const geometry = story ? story.main : ease((studioNarrativeTime(t, duration) - 0.75) / 3.6), modelFirst = n.introStyle === 'model';
  const reveal = n.nameReveal === 'show' ? duration : duration * n.nameDelay;
  const outroTime = n.outroEnabled ? Math.max(0, t - duration - n.showDuration) : 0;
  const shutdown = n.outroEnabled && n.shutdownEnabled ? Math.max(0, Math.min(1, (outroTime - n.outroDuration + n.shutdownDuration) / n.shutdownDuration)) : 0;
  const crt = studioCRTPose(shutdown);
  return {
    geometry,
    titleMove: modelFirst || story ? 1 : geometry,
    titleAlpha: story ? story.main : modelFirst && duration > 0 ? ease((t - reveal) / Math.max(0.35, Math.min(0.9, duration * 0.25))) : 1,
    info: story ? story.main : modelFirst && duration > 0 ? ease((t - duration) / 0.85) : geometry,
    model: story ? story.main : modelFirst ? 1 : geometry,
    story,
    outro: ease(outroTime / Math.min(0.8, n.outroDuration * 0.28)),
    brand: ease((outroTime - 0.12) / Math.min(1, n.outroDuration * 0.35)),
    mark: ease((outroTime - 0.08) / Math.min(1.1, n.outroDuration * 0.4)),
    shutdown,
    ...crt,
    progress: Math.max(0, Math.min(1, outroTime / n.outroDuration)),
  };
}
