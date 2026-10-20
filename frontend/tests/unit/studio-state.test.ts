import { describe, expect, it } from 'vitest';
import { createMotionClock } from '../../src/motion-clock.ts';
import { createStudioState, maxLengths, restoreStudioState, seriesLengths, studioModelContent, studioSnapshot, type StudioState } from '../../src/studio-state.ts';
import { studioStoryDuration } from '../../src/timeline.ts';

const LIMIT = 16384;
// Saved and restored data is plain JSON; tests edit copies freely.
const loose = (value: unknown): any => JSON.parse(JSON.stringify(value));
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;
const near = (actual: number, expected: number) => expect(Math.abs(actual - expected), `${actual} != ${expected}`).toBeLessThan(1e-9);

/** A browser opening the editor with `widgetState` saved: a new project, then restore. */
function open(widgetState?: unknown) {
  const state = createStudioState();
  restoreStudioState(state, widgetState);
  return { state, clock: createMotionClock(state.time, state.variants, state.edges) };
}
/** What the editor saves, as the shell stores it. */
const save = (state: StudioState) => loose({ modelContent: studioModelContent(state), privateContent: studioSnapshot(state) });
const v6 = (fields: object) => ({ privateContent: { design: 'character-explorations', version: 6, ...fields } });

describe('a new project', () => {
  it('starts with the two-shot poster intro at time 0', () => {
    const { state } = open();
    expect(state.narrative.introStyle).toBe('story');
    near(state.introDuration, studioStoryDuration(state.narrative));
    near(state.introDuration, 5.1);
    near(state.time, 0);
  });

  it('fits the 16 KiB snapshot budget', () => {
    expect(bytes(save(open().state))).toBeLessThan(LIMIT);
  });
});

describe('restoreStudioState', () => {
  it('rejects missing and incompatible snapshots without touching the state', () => {
    const { state } = open();
    state.time = 8.5;
    const before = loose(state);
    for (const invalid of [null, undefined, {}, { privateContent: { design: 'another-design', version: 5, time: 2 } }, { privateContent: { design: 'character-explorations', version: 999, time: 2 } }]) {
      expect(restoreStudioState(state, invalid)).toBe(false);
      expect(loose(state)).toEqual(before);
    }
  });

  it('applies an external object-form v6 snapshot, and the clock is rebuilt from its time', () => {
    const external = save(open().state);
    external.privateContent.variants = loose(open().state.variants);
    delete external.privateContent.variantEncoding;
    Object.assign(external.privateContent, { name: 'EXTERNAL', activeDesign: 'sticker', time: 2, edges: { top: { direction: 'positive', duration: 19 }, bottom: { direction: 'still', duration: 83 } } });
    Object.assign(external.privateContent.variants.couture, { ringSpeed: 1.7, textMotion: false, textMotionStyle: 'playful', textMotionAmount: 0.82, textMotionSpeed: 1.6 });
    const { state, clock } = open(external);
    expect(state.name).toBe('EXTERNAL');
    expect(state.activeDesign, 'the selected editor design restores with its settings').toBe('sticker');
    expect(state.edges).toEqual({ top: { direction: 'positive', duration: 19 }, bottom: { direction: 'still', duration: 83 } });
    expect(state.variants.couture.textMotion).toBe(false);
    expect(state.variants.couture.textMotionStyle).toBe('playful');
    near(state.variants.couture.textMotionAmount, 0.82);
    near(state.variants.couture.textMotionSpeed, 1.6);
    near(clock.elapsed, 2);
    near(clock.rings.couture, 3.4);
    near(clock.texts.couture, 3.2);
    near(clock.edges.top, 2 / 19);
    near(clock.edges.bottom, 0);

    // A later minimal v5 document still restores; the saved summary covers only the active design,
    // while the private snapshot keeps edits in every design.
    expect(restoreStudioState(state, { privateContent: { design: 'character-explorations', version: 5 } })).toBe(true);
    const saved = save(state);
    expect(saved.modelContent.borderMotion.top.direction).toBe('positive');
    expect(Object.keys(saved.modelContent.variants)).toEqual(['sticker']);
    expect(bytes(saved)).toBeLessThan(LIMIT);
    const reopened = open(saved).state;
    expect(reopened.variants.couture.textMotion).toBe(false);
    near(reopened.variants.couture.textMotionSpeed, 1.6);
  });

  it('migrates a v4 document, which predates ringSpeed, keeping its styling', () => {
    const { state } = open({ privateContent: { design: 'character-explorations', version: 4, name: 'KGG', frame: 'horizontal', variants: { couture: { background: 'dark', accent: '#bceb45', palette: 'acid', ringScale: 1.96 } } } });
    expect(state.name).toBe('KGG');
    expect(state.frame).toBe('horizontal');
    near(state.introDuration, 4.5);
    expect(state.output).toEqual({ resolution: '1080', obsLayers: 'combined', transparent: false, includeCharacters: false, start: 'intro', fit: 'contain', fps: 30, aeIntro: true });
    expect(state.variants.couture.background).toBe('dark');
    expect(state.variants.couture.palette).toBe('acid');
    expect(state.variants.couture.accent).toBe('#bceb45');
    near(state.variants.couture.ringScale, 1.96);
    near(state.variants.couture.ringSpeed, 0.65);
  });

  it('migrates a v5 document, supplying every new information default', () => {
    const { state, clock } = open({ privateContent: { design: 'character-explorations', version: 5, name: 'KGG', frame: 'horizontal', time: 7, variants: { couture: { background: 'dark', accent: '#bceb45', ringScale: 1.96, ringSpeed: 1.7 } } } });
    expect(state.version).toBe(6);
    expect(state.name).toBe('KGG');
    expect(state.frame).toBe('horizontal');
    expect(state.variants.couture.background).toBe('dark');
    expect(state.variants.couture.palette, 'a known accent selects its palette').toBe('acid');
    near(state.variants.couture.ringScale, 1.96);
    near(state.variants.couture.ringSpeed, 1.7);
    expect(state.edges).toEqual({ top: { direction: 'negative', duration: 32 }, bottom: { direction: 'positive', duration: 38 } });
    for (const [key, variant] of Object.entries(state.variants)) {
      expect(variant.textMotion).toBe(true);
      expect(variant.textMotionStyle).toBe(['cloud', 'plush', 'wave'].includes(key) ? 'soft' : ['play', 'sticker', 'arcade'].includes(key) ? 'playful' : 'refined');
      near(variant.textMotionAmount, 0.55);
      near(variant.textMotionSpeed, 1);
      near(clock.texts[key], 7);
    }
    near(clock.edges.top, -7 / 32);
    near(clock.edges.bottom, 7 / 38);
  });

  it('applies the same bounds as the controls', () => {
    const { state } = open(v6({ edges: { top: { direction: 'negative', duration: 2 }, bottom: { direction: 'positive', duration: 120 } }, variants: { couture: { textMotionAmount: 3, textMotionSpeed: 0.1 }, cloud: { textMotionAmount: -1, textMotionSpeed: 7 } } }));
    near(state.edges.top.duration, 12);
    near(state.edges.bottom.duration, 90);
    near(state.variants.couture.textMotionAmount, 1);
    near(state.variants.couture.textMotionSpeed, 0.25);
    near(state.variants.cloud.textMotionAmount, 0);
    near(state.variants.cloud.textMotionSpeed, 2);
  });

  it('restores the urban designs as the active design', () => {
    for (const key of ['district', 'tuner', 'arcade']) expect(open(v6({ activeDesign: key })).state.activeDesign).toBe(key);
  });
});

describe('intro, output and sequence settings', () => {
  it('round-trips output options', () => {
    const { state } = open(v6({ introDuration: 8, time: 19, output: { resolution: '2160', transparent: true, includeCharacters: true, start: 'show', fit: 'cover', fps: 60, aeIntro: false } }));
    near(state.introDuration, 8);
    near(state.time, 19);
    const saved = save(state).privateContent;
    expect(saved.output).toEqual({ resolution: '2160', obsLayers: 'combined', transparent: true, includeCharacters: true, start: 'show', fit: 'cover', fps: 60, aeIntro: false });
    expect(saved.introDuration).toBe(8);
    const separate = open(v6({ output: { obsLayers: 'separate' } })).state;
    expect(open(save(separate)).state.output.obsLayers).toBe('separate');
  });

  it('bounds intro length, time and output options', () => {
    const { state } = open(v6({ introDuration: 99, time: 99, output: { resolution: 'invalid', start: 'invalid', transparent: 'yes' } }));
    near(state.introDuration, 30);
    near(state.time, 42);
    expect(state.output).toEqual({ resolution: '1080', obsLayers: 'combined', transparent: false, includeCharacters: false, start: 'intro', fit: 'contain', fps: 30, aeIntro: true });
    near(open(v6({ introDuration: 0, time: 16.5 })).state.time, 12);
  });

  it('round-trips show playback, outro and shutdown settings', () => {
    for (const showPlayback of ['continuous', 'repeat']) {
      const { state } = open(v6({ narrative: { showPlayback, outroEnabled: false } }));
      expect(state.narrative.showPlayback).toBe(showPlayback);
      expect(save(state).privateContent.narrative.showPlayback).toBe(showPlayback);
    }
    const sequence = open(v6({ introDuration: 8, time: 99, narrative: { introStyle: 'model', nameReveal: 'delayed', nameDelay: 0.75, outroEnabled: true, outroDuration: 5, outroStyle: 'orbit', outroContent: 'logo' } })).state;
    near(sequence.time, 25);
    near(sequence.narrative.outroDuration, 5);
    expect(save(sequence).privateContent.narrative.outroContent).toBe('logo');
    expect(save(sequence).modelContent.sequence.outroStyle).toBe('orbit');
    const shutdown = open(v6({ introDuration: 3, time: 99, narrative: { showDuration: 27.5, outroEnabled: true, outroDuration: 4, shutdownEnabled: true, shutdownDuration: 1.2 } })).state;
    near(shutdown.time, 34.5);
    const saved = save(shutdown).privateContent.narrative;
    near(saved.showDuration, 27.5);
    near(saved.shutdownDuration, 1.2);
    expect(saved.shutdownEnabled).toBe(true);
    const disabled = open(v6({ narrative: { showDuration: 999, shutdownEnabled: false } })).state;
    near(disabled.narrative.showDuration, 60);
    expect(disabled.narrative.shutdownEnabled).toBe(false);
  });

  // Story settings survive compact and older object snapshots. The story intro's
  // length is derived from its shots, so a stale saved introDuration never wins.
  it('round-trips every story option and derives the story intro length', () => {
    const storyValues = { introStyle: 'story', characterShotEnabled: true, authorShotEnabled: true, characterShotDuration: 3.25, authorShotDuration: 2.75, storyTransitionDuration: 0.4, characterCorner: 'tr-bl', authorCorner: 'tl-br', characterEffect: 'holo', authorEffect: 'crt', characterEffectStrength: 0.45, authorEffectStrength: 0.65, characterEffectSpeed: 1.2, authorEffectSpeed: 0.8, storyPackagingOnly: true, storyFlash: true, characterScale: 1.2, authorScale: 1.4, characterX: 33, characterY: 65, authorX: 72, authorY: 38 };
    const { state } = open(v6({ introDuration: 29, time: 1, narrative: storyValues }));
    near(state.introDuration, studioStoryDuration(state.narrative));
    expect(state.introDuration).not.toBe(29);
    for (const [key, value] of Object.entries(storyValues)) expect(state.narrative[key as keyof typeof state.narrative], key).toBe(value);
    const saved = save(state);
    expect(saved.privateContent.variantEncoding).toBe('tuple-v1');
    const reopened = open(saved).state;
    expect(reopened.narrative).toEqual(state.narrative);
    near(reopened.introDuration, state.introDuration);
  });

  it('keeps an existing v6 model or title intro and its length', () => {
    for (const introStyle of ['model', 'title']) {
      const { state } = open(v6({ introDuration: 7, narrative: { introStyle } }));
      expect(state.narrative.introStyle).toBe(introStyle);
      near(state.introDuration, 7);
    }
  });

  it('skips the story intro when both shots are off', () => {
    for (const characterShotEnabled of [false, true]) for (const authorShotEnabled of [false, true]) {
      const { state } = open(v6({ introDuration: 29, narrative: { introStyle: 'story', characterShotEnabled, authorShotEnabled } }));
      near(state.introDuration, studioStoryDuration(state.narrative));
      if (!characterShotEnabled && !authorShotEnabled) near(state.introDuration, 0);
    }
  });
});

describe('snapshot size', () => {
  const fillLabels = (state: StudioState) => {
    for (const [key, max] of Object.entries(maxLengths)) (state as unknown as Record<string, string>)[key] = '界'.repeat(max);
    for (const entry of Object.values(state.seriesData)) {
      for (const [key, max] of Object.entries(seriesLengths)) entry[key as keyof typeof entry] = key === 'serial' ? '9'.repeat(max) : key === 'prefix' ? 'X'.repeat(max) : '界'.repeat(max);
    }
  };
  const fillTypography = (state: StudioState) => {
    for (const key of ['name', 'character', 'author', 'caption', 'subtitle'] as const) Object.assign(state.typography[key], { text: '界'.repeat(64), font: 'condensed', scale: 1.5, tracking: 0.25, weight: '900', italic: 'italic', colorMode: 'custom', color: '#abcdef', case: 'uppercase' });
    for (const role of ['character', 'author'] as const) state.typography.copy[role] = { kicker: '界'.repeat(80), label: '界'.repeat(80), meta: '界'.repeat(120) };
  };
  const customizeDesigns = (state: StudioState) => {
    for (const v of Object.values(state.variants)) {
      Object.assign(v, { typeface: 'editorial', badgePalette: 'custom', badgeStyle: 'outline', accent: '#16acde', badgeColor: '#234567', badgeInk: '#fedcba', ringSpeed: 2.95, ringScale: 2.39, textMotionAmount: 0.95, textMotionSpeed: 1.95, geometryStrength: 1.45, geometryOpacity: 0.95, gridOpacity: 0.145, gridMotion: 0.48, modelScale: 1.29, cutStrength: 0.95, badgeOpacity: 0.95, palette: 'custom', background: 'light', pattern: 'ripple', grid: false, gridMoving: false, parallax: false, textMotion: false });
      Object.assign(v.effects, { gradeEnabled: false, grade: 'original', gradeStrength: 0.99, gradeModel: false, gradient: 'spotlight', gradientStrength: 0.59, gradientColor: '#765432', gradientMotion: false, titleGradient: false, grain: 0.29, vignette: 0.59, shadowEnabled: false, shadowStyle: 'soft', shadowStrength: 0.99, shadowDepth: 1.95, shadowColor: '#123456' });
      for (const key of Object.keys(v.shadows) as (keyof typeof v.shadows)[]) v.shadows[key] = false;
      for (const key of Object.keys(v.geometryBySeries) as (keyof typeof v.geometryBySeries)[]) v.geometryBySeries[key] = 'signature';
    }
  };

  it('fits custom typography, and restores it', () => {
    const { state } = open();
    for (const key of ['name', 'character', 'author', 'caption', 'subtitle'] as const) Object.assign(state.typography[key], { text: key === 'author' ? 'Studio K / 原创角色设计' : 'NOVA / 原创角色', font: 'grotesk', scale: 1.15, tracking: 0.025, weight: '700', italic: 'normal', colorMode: 'custom', color: '#aabbcc', case: 'uppercase' });
    state.typography.copy.character = { kicker: 'ORIGINAL CHARACTER', label: 'EDITION / AT-001', meta: 'Soft heart. Bold energy.' };
    state.typography.copy.author = { kicker: 'CREATOR / CREDITS', label: 'MODEL / STUDIO K', meta: 'DESIGN / STUDIO K' };
    const saved = save(state);
    expect(open(saved).state.typography).toEqual(state.typography);
    expect(bytes(saved)).toBeLessThan(LIMIT);
  });

  it('fits every label at its maximum length, all typography overrides and 13 customized designs', () => {
    const { state } = open();
    fillLabels(state);
    const labels = bytes(save(state));
    fillTypography(state);
    const typography = save(state);
    expect(open(typography).state.typography, 'maximum-length typography restores without truncation').toEqual(state.typography);
    customizeDesigns(state);
    const everything = bytes(save(state));
    console.log(`Snapshot bytes: maximum labels ${labels}; + all typography ${bytes(typography)}; + 13 customized designs ${everything} / ${LIMIT}.`);
    for (const size of [labels, bytes(typography), everything]) expect(size).toBeLessThan(LIMIT);
  });
});

describe('compact tuple-v1 snapshots', () => {
  it('contain every design and reset local edits on restore', () => {
    const saved = save(open().state), defaults = loose(open().state.variants);
    const { state } = open(saved);
    expect(loose(state.variants)).toEqual(defaults);
    state.variants.district.ringSpeed = 2.7;
    state.variants.tuner.effects.shadowColor = '#123456';
    state.variants.arcade.geometryBySeries.mini = 'rays';
    restoreStudioState(state, saved);
    expect(loose(state.variants)).toEqual(defaults);
  });

  it('round-trips 13 fully customized designs', () => {
    const { state } = open();
    for (const v of Object.values(state.variants)) {
      Object.assign(v, { accent: '#123456', palette: 'custom', background: 'dark', ringSpeed: 2.75, textMotionAmount: 0.95 });
      v.geometryBySeries.fur = 'cut';
      v.effects.shadowColor = '#543210';
      v.effects.grade = 'chrome';
    }
    const saved = save(state);
    expect(saved.privateContent.variantEncoding).toBe('tuple-v1');
    expect(bytes(saved)).toBeLessThan(LIMIT);
    expect(open(saved).state.variants).toEqual(loose(state.variants));
    expect(state.variants.dual, 'the dual-pane design keeps independent settings').toBeTruthy();
  });
});
