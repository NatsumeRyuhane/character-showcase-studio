import { describe, expect, it } from 'vitest';
import { studioCRTPose } from '../../runtime/crt-motion.js';
import { informationMotionPose } from '../../src/information-motion.ts';
import { advanceMotionClock, createMotionClock } from '../../src/motion-clock.ts';
import {
  studioAdvanceTime, studioNarrativePose, studioNarrativeSettings, studioNarrativeTime, studioPhase,
  studioRetimeShow, studioStoryDuration, studioStoryPose, studioTotalDuration, type NarrativeInput,
} from '../../src/timeline.ts';

const near = (actual: number, expected: number) => expect(Math.abs(actual - expected), `${actual} != ${expected}`).toBeLessThan(1e-7);
const config = studioNarrativeSettings();
const pose = (time: number, intro = 4.5, n: NarrativeInput = config) => studioNarrativePose(time, intro, n);

describe('narrative settings', () => {
  it('defaults to the model-first intro, continuous show and no outro', () => {
    expect(config.introStyle).toBe('model');
    expect(config.outroEnabled).toBe(false);
    expect(config.showPlayback).toBe('continuous');
    expect(studioNarrativeSettings({ showPlayback: 'invalid' }).showPlayback).toBe('continuous');
  });

  it('bounds invalid values', () => {
    const bounded = studioNarrativeSettings({ introStyle: 'bad', nameReveal: 'bad', nameDelay: 99, outroDuration: -1, outroEnabled: 'yes', outroStyle: 'bad', outroContent: 'bad' });
    expect(bounded.introStyle).toBe('model');
    expect(bounded.outroEnabled).toBe(false);
    near(bounded.nameDelay, 0.9);
    near(bounded.outroDuration, 1.5);
    near(studioNarrativeSettings({ showDuration: Infinity }).showDuration, 12);
    near(studioNarrativeSettings({ showDuration: 0 }).showDuration, 1);
    near(studioNarrativeSettings({ showDuration: 999 }).showDuration, 60);
    near(studioNarrativeSettings({ outroDuration: 1.5, shutdownDuration: 99 }).shutdownDuration, 0.675);
  });

  it('bounds story settings', () => {
    const dirty = studioNarrativeSettings({ introStyle: 'story', characterShotDuration: Infinity, authorShotDuration: -1, storyTransitionDuration: 99, characterCorner: 'bad', authorEffect: 'bad', characterEffectStrength: 99, authorEffectSpeed: 0, characterScale: 99, authorX: -10, authorY: 1000 });
    near(dirty.characterShotDuration, 2.5);
    near(dirty.authorShotDuration, 0.5);
    near(dirty.storyTransitionDuration, 3);
    expect(dirty.characterCorner).toBe('tl-br');
    expect(dirty.authorEffect).toBe('polar');
    near(dirty.characterEffectStrength, 1);
    near(dirty.authorEffectSpeed, 0.1);
    near(dirty.characterScale, 2.4);
    near(dirty.authorX, 0);
    near(dirty.authorY, 100);
  });
});

describe('model and title intros', () => {
  it('shows the model first and fades the name in at the show', () => {
    for (const t of [0, 0.2, 1, 3, 4.499]) {
      const p = pose(t);
      near(p.model, 1);
      near(p.titleMove, 1);
      near(p.titleAlpha, 0);
      near(p.info, 0);
      near(p.outro, 0);
    }
    expect(pose(5).titleAlpha).toBeGreaterThan(0);
    expect(pose(5).titleAlpha).toBeLessThan(1);
    near(pose(5.5).titleAlpha, 1);
    near(pose(5.5).info, 1);
  });

  it('reveals the name late in the intro when delayed', () => {
    const delayed = { ...config, nameReveal: 'delayed', nameDelay: 0.65 };
    near(pose(2, 4.5, delayed).titleAlpha, 0);
    expect(pose(3.5, 4.5, delayed).titleAlpha).toBeGreaterThan(0);
    near(pose(3.5, 4.5, delayed).info, 0);
  });

  it('keeps the original big-title intro', () => {
    const legacy = { ...config, introStyle: 'title' };
    near(pose(0, 4.5, legacy).titleMove, 0);
    near(pose(0, 4.5, legacy).titleAlpha, 1);
    near(pose(4.5, 4.5, legacy).titleMove, 1);
  });
});

describe('show and outro timing', () => {
  it('handles any intro length, including zero', () => {
    for (const intro of [0, 1, 4.5, 30]) {
      const n = { ...config, outroEnabled: true, outroDuration: 3.5 }, end = intro + 15.5;
      near(studioTotalDuration(intro, n), end);
      near(studioAdvanceTime(end - 0.1, 1, intro, n), end);
      near(studioAdvanceTime(intro + 11.9, 0.2, intro, { ...config, showPlayback: 'repeat' }), intro + 0.1);
      near(pose(intro + 12 - 0.0001, intro, n).outro, pose(intro + 12 + 0.0001, intro, n).outro);
      near(pose(end, intro, n).outro, 1);
      near(pose(end, intro, n).brand, 1);
      near(pose(end, intro, n).mark, 1);
      expect(studioPhase(intro + 12, intro, n)).toBe('outro');
      expect(studioPhase(intro + 12, intro, config)).toBe('show');
      // Entering the show never jumps the geometry morph or reveals a large title.
      const a = pose(Math.max(0, intro - 0.00001), intro, n), b = pose(intro + 0.00001, intro, n);
      near(a.geometry, b.geometry);
      near(b.titleMove, 1);
    }
  });

  it('loops the show until a manual outro starts', () => {
    const manual = { ...config, outroEnabled: true, outroTrigger: 'manual' };
    near(studioAdvanceTime(16.4, 0.2, 4.5, manual), 4.6);
    near(studioAdvanceTime(16.5, 0.2, 4.5, manual), 16.7);
    near(studioAdvanceTime(19.9, 1, 4.5, manual), 20);
  });

  it('times 1–60 s shows and a seekable CRT shutdown', () => {
    for (const showDuration of [1, 7.5, 12, 60]) for (const intro of [0, 4.5, 30]) {
      const n = studioNarrativeSettings({ showDuration, outroEnabled: true, outroDuration: 4, shutdownDuration: 1 });
      const start = intro + showDuration, end = start + 4;
      near(studioTotalDuration(intro, n), end);
      expect(studioPhase(start - 0.001, intro, n)).toBe('show');
      expect(studioPhase(start, intro, n)).toBe('outro');
      near(studioAdvanceTime(start - 0.1, 0.2, intro, { ...n, outroTrigger: 'manual' }), intro + 0.1);
      near(studioAdvanceTime(end - 0.1, 0.5, intro, n), end);
      near(pose(end - 1, intro, n).shutdown, 0);
      near(pose(end - 0.5, intro, n).shutdown, 0.5);
      const line = pose(end - 0.3, intro, n);
      near(line.shutter, 1);
      expect(line.signal).toBeGreaterThan(0.9);
      expect(line.signalWidth).toBeGreaterThan(0);
      expect(line.signalWidth).toBeLessThan(1);
      near(pose(end, intro, n).shutter, 1);
      near(pose(end, intro, n).signal, 0);
      near(pose(end, intro, n).signalWidth, 0);
      near(pose(end, intro, { ...n, shutdownEnabled: false }).shutdown, 0);
      // Seeking backward reconstructs exactly the same pose.
      const before = JSON.stringify(pose(end - 0.5, intro, n));
      pose(end, intro, n);
      expect(JSON.stringify(pose(end - 0.5, intro, n))).toBe(before);
    }
  });

  it('keeps relative progress when the show is retimed', () => {
    near(studioRetimeShow(2, 4.5, { showDuration: 12 }, { showDuration: 24 }), 2);
    near(studioRetimeShow(10.5, 4.5, { showDuration: 12 }, { showDuration: 24 }), 16.5);
    near(studioRetimeShow(18, 4.5, { showDuration: 12 }, { showDuration: 24 }), 30);
  });

  // Run the narrative and the independent motion clocks past many former loop
  // boundaries. Information stays fully visible while every motion phase advances.
  it('holds a continuous show while the motion clocks keep running', () => {
    for (const intro of [0, 2, 4.5]) for (const showDuration of [1, 7.5]) for (const speed of [0.5, 1, 1.8]) {
      const n = studioNarrativeSettings({ showDuration }), variants = { poster: { ringSpeed: 1.7, textMotionSpeed: 0.8 } }, clock = createMotionClock(0, variants);
      let time = 0, previous = 0;
      for (let frame = 0; frame < 2400; frame++) {
        const delta = 0.04 * speed;
        time = studioAdvanceTime(time, delta, intro, n);
        advanceMotionClock(clock, delta, variants);
        expect(time, 'continuous narrative never rewinds').toBeGreaterThanOrEqual(previous);
        previous = time;
        if (clock.elapsed > intro + 1) {
          const p = pose(time, intro, n);
          near(p.info, 1);
          near(p.titleAlpha, 1);
          near(p.outro, 0);
          near(informationMotionPose(studioNarrativeTime(time, intro), clock.texts.poster, 1, 'refined', 0.55).entry, 1);
        }
      }
      near(time, intro + showDuration);
      near(clock.rings.poster, clock.elapsed * 1.7);
      near(clock.texts.poster, clock.elapsed * 0.8);
      expect(clock.elapsed, 'motion keeps advancing beyond the preview range').toBeGreaterThan(time + 20);
      near(studioAdvanceTime(time, 0, intro, n), time);
      near(studioAdvanceTime(time, 0.1, intro, n), time);
    }
  });
});

describe('CRT power-off envelope', () => {
  it('is finite everywhere and dark at both ends', () => {
    for (const q of [0, 0.04, 0.15, 0.38, 0.5, 0.6, 0.7, 0.82, 0.9, 0.96, 1]) {
      const p = studioCRTPose(q);
      for (const value of Object.values(p)) expect(Number.isFinite(value)).toBe(true);
      if (q === 0 || q === 1) for (const key of ['signal', 'dot', 'scan', 'flash', 'jitter'] as const) near(p[key], 0);
    }
  });

  it('passes through a full-width beam and a phosphor dot to black', () => {
    const line = studioCRTPose(0.6), dot = studioCRTPose(0.88), black = studioCRTPose(1);
    near(line.shutter, 1);
    expect(line.signal).toBeGreaterThan(0.95);
    expect(line.signalWidth).toBeGreaterThan(0.99);
    expect(dot.dot).toBeGreaterThan(0.95);
    expect(dot.signalWidth).toBeLessThan(0.02);
    near(black.shutter, 1);
    near(black.dot, 0);
  });
});

describe('story intro', () => {
  const storyDefaults = studioNarrativeSettings({ introStyle: 'story' });
  const storyDuration = studioStoryDuration(storyDefaults);

  it('adds two poster shots without changing the old defaults', () => {
    expect(storyDefaults.characterShotEnabled).toBe(true);
    expect(storyDefaults.authorShotEnabled).toBe(true);
    expect(storyDefaults.characterCorner).toBe('tl-br');
    expect(storyDefaults.authorCorner).toBe('tr-bl');
    expect(storyDefaults.characterEffect).toBe('polar');
    expect(storyDefaults.authorEffect).toBe('polar');
    expect(storyDefaults.storyPackagingOnly).toBe(false);
    expect(storyDefaults.storyFlash).toBe(false);
    near(storyDuration, 5.1);
  });

  it('lets each shot be turned off, skipping the opening when both are', () => {
    for (const characterShotEnabled of [false, true]) for (const authorShotEnabled of [false, true]) {
      const n = studioNarrativeSettings({ ...storyDefaults, characterShotEnabled, authorShotEnabled });
      const duration = studioStoryDuration(n), hasShot = characterShotEnabled || authorShotEnabled;
      near(duration, (characterShotEnabled ? 2.5 : 0) + (authorShotEnabled ? 2 : 0) + (hasShot ? 0.6 : 0));
      for (const t of [0, 0.1, 1, 2.49, 2.5, 3, 4.49, 4.5, 4.8, 5.1, 30]) {
        const shot = studioStoryPose(t, duration, n), p = pose(t, duration, n);
        for (const key of ['local', 'duration', 'alpha', 'shift', 'main', 'transitionStart', 'transitionDuration', 'flash'] as const) {
          expect(Number.isFinite(shot[key]), `story ${key} remains finite`).toBe(true);
        }
        expect(shot.alpha).toBeGreaterThanOrEqual(0);
        expect(shot.alpha).toBeLessThanOrEqual(1);
        expect(shot.main).toBeGreaterThanOrEqual(0);
        expect(shot.main).toBeLessThanOrEqual(1);
        near(p.titleMove, 1);
        near(p.geometry, shot.main);
        near(p.titleAlpha, shot.main);
        near(p.info, shot.main);
        near(p.model, shot.main);
        if (t >= duration) {
          near(shot.main, 1);
          expect(shot.active).toBe(false);
          near(shot.alpha, 0);
        }
        if (hasShot && t < duration - 0.6) near(shot.main, 0);
        if (!hasShot) {
          near(shot.main, 1);
          expect(shot.role).toBe('show');
        }
      }
      if (hasShot) {
        const first = studioStoryPose(0.4, duration, n);
        expect(first.role).toBe(characterShotEnabled ? 'character' : 'author');
        near(first.alpha, 1);
        const middle = studioStoryPose(duration - 0.3, duration, n);
        near(middle.main, 0.5);
        near(middle.alpha, 0.5);
        near(studioTotalDuration(duration, n), duration + 12);
      }
    }
  });

  it('dissolves into the show and stretches when retimed', () => {
    expect(studioStoryPose(2.5, storyDuration, storyDefaults).role).toBe('author');
    near(studioStoryPose(storyDuration - 0.6, storyDuration, storyDefaults).main, 0);
    near(studioStoryPose(storyDuration, storyDuration, storyDefaults).main, 1);
    const retimed = studioStoryPose((storyDuration - 0.3) * 2, storyDuration * 2, storyDefaults);
    near(retimed.main, 0.5);
    near(retimed.transitionDuration, 1.2);
  });

  it('flashes at cuts only when asked, and stays seekable', () => {
    const storyFlash = { ...storyDefaults, storyFlash: true };
    expect(studioStoryPose(2.5, storyDuration, storyFlash).flash).toBeGreaterThan(0.6);
    near(studioStoryPose(2.5, storyDuration, storyDefaults).flash, 0);
    const previous = JSON.stringify(studioStoryPose(4.8, storyDuration, storyFlash));
    studioStoryPose(1, storyDuration, storyFlash);
    expect(JSON.stringify(studioStoryPose(4.8, storyDuration, storyFlash))).toBe(previous);
  });
});
