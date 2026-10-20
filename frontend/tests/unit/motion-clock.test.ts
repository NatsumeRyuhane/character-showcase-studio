import { describe, expect, it } from 'vitest';
import { advanceMotionClock, createMotionClock, type EdgeSettings } from '../../src/motion-clock.ts';
import { informationMotionPose, marqueeOffset } from '../../src/information-motion.ts';

const near = (actual: number, expected: number) => expect(Math.abs(actual - expected), `${actual} != ${expected}`).toBeLessThan(1e-9);
const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('ring clock', () => {
  it('moves from the first intro frame and keeps its phase across scene and loop boundaries', () => {
    const variants = { couture: { ringSpeed: 0.65 }, orbit: { ringSpeed: 1.37 }, still: { ringSpeed: 0 } };
    const clock = createMotionClock(0, variants);
    advanceMotionClock(clock, 1, variants);
    expect(clock.rings.couture, 'geometry moves before the show').toBeGreaterThan(0);
    advanceMotionClock(clock, 3.49, variants);
    const before = clock.rings.orbit;
    advanceMotionClock(clock, 0.02, variants);
    near(clock.rings.orbit - before, 0.02 * 1.37);
    near(clock.elapsed, 4.51);
    // The narrative timeline wraps, but an arbitrary geometry speed keeps its pose.
    advanceMotionClock(clock, 11.98, variants);
    const loopBoundary = clock.rings.orbit;
    advanceMotionClock(clock, 0.02, variants);
    near(clock.rings.orbit - loopBoundary, 0.02 * 1.37);
    near(clock.elapsed, 16.51);
  });

  it('applies speed edits to future time only, and freezes at speed 0', () => {
    const variants = { couture: { ringSpeed: 0.65 }, still: { ringSpeed: 0 } };
    const clock = createMotionClock(3, variants);
    const pose = clock.rings.couture;
    variants.couture.ringSpeed = 2.5;
    near(clock.rings.couture, pose);
    advanceMotionClock(clock, 0.2, variants);
    near(clock.rings.couture, pose + 0.5);
    variants.couture.ringSpeed = 0;
    const frozen = clock.rings.couture, background = clock.elapsed;
    advanceMotionClock(clock, 1, variants);
    near(clock.rings.couture, frozen);
    near(clock.elapsed, background + 1);
    near(clock.rings.still, 0);
  });

  it('rebuilds the same phases when seeking or replaying', () => {
    const variants = { orbit: { ringSpeed: 1.37 } };
    near(createMotionClock(2, variants).rings.orbit, 2 * 1.37);
    const replay = createMotionClock(0, variants);
    near(replay.elapsed, 0);
    near(replay.rings.orbit, 0);
  });
});

describe('text and border clocks', () => {
  const setup = () => {
    const variants: Record<string, { ringSpeed?: number; textMotion?: boolean; textMotionSpeed?: number }> = { refined: { ringSpeed: 0.65, textMotionSpeed: 0.75 }, soft: { textMotion: false, textMotionSpeed: 0.5 }, default: {} };
    const edges = { top: { direction: 'negative', duration: 32 }, bottom: { direction: 'positive', duration: 38 } };
    return { variants, edges, clock: createMotionClock(4.5, variants, edges) };
  };

  it('starts every family from the same elapsed time', () => {
    const { clock } = setup();
    near(clock.elapsed, 4.5);
    near(clock.rings.refined, 4.5 * 0.65);
    near(clock.texts.refined, 4.5 * 0.75);
    near(clock.texts.default, 4.5);
    near(clock.edges.top, -4.5 / 32);
    near(clock.edges.bottom, 4.5 / 38);
  });

  it('keeps advancing when the narrative loops, including disabled text motion', () => {
    const { variants, edges, clock } = setup();
    advanceMotionClock(clock, 11.99, variants, edges);
    let narrative = 16.49;
    const before = snapshot(clock);
    advanceMotionClock(clock, 0.02, variants, edges);
    narrative = 4.5 + (narrative + 0.02 - 16.5) % 12;
    near(narrative, 4.51);
    near(clock.texts.refined - before.texts.refined, 0.02 * 0.75);
    near(clock.edges.top - before.edges.top, -0.02 / 32);
    near(clock.edges.bottom - before.edges.bottom, 0.02 / 38);
    near(clock.texts.soft - before.texts.soft, 0.02 * 0.5);
  });

  it('never alters an accumulated pose when speed, direction or period change', () => {
    const { variants, edges, clock } = setup();
    const textBefore = informationMotionPose(4.5, clock.texts.refined, 0, 'refined');
    const edgeBefore = marqueeOffset(clock.edges.top, 800), phaseBefore = clock.edges.top;
    variants.refined.textMotionSpeed = 2;
    edges.top.direction = 'positive';
    edges.top.duration = 12;
    expect(snapshot(informationMotionPose(4.5, clock.texts.refined, 0, 'refined'))).toEqual(snapshot(textBefore));
    near(marqueeOffset(clock.edges.top, 800), edgeBefore);
    const textPhase = clock.texts.refined;
    advanceMotionClock(clock, 1, variants, edges);
    near(clock.texts.refined, textPhase + 2);
    near(clock.edges.top, phaseBefore + 1 / 12);
  });

  it('ignores paused and invalid steps, and holds a still border while text runs', () => {
    const { variants, edges, clock } = setup();
    const paused = snapshot(clock);
    for (const delta of [0, -1, NaN, Infinity]) advanceMotionClock(clock, delta, variants, edges);
    expect(snapshot(clock)).toEqual(paused);
    edges.top.direction = 'still';
    const frozenTop = clock.edges.top, activeBottom = clock.edges.bottom, activeText = clock.texts.soft;
    advanceMotionClock(clock, 2, variants, edges);
    near(clock.edges.top, frozenTop);
    near(clock.edges.bottom, activeBottom + 2 / 38);
    near(clock.texts.soft, activeText + 1);
  });

  it('rebuilds every family at the current settings on seek and replay', () => {
    const { variants, edges } = setup();
    variants.refined.textMotionSpeed = 2;
    edges.top.direction = 'still';
    const seek = createMotionClock(2, variants, edges), replay = createMotionClock(0, variants, edges);
    near(seek.texts.refined, 4);
    near(seek.edges.top, 0);
    near(seek.edges.bottom, 2 / 38);
    for (const family of [replay.rings, replay.texts, replay.edges]) expect(Object.values(family).every(value => value === 0)).toBe(true);
  });

  it('falls back to the default speeds and border settings, and bounds them', () => {
    const legacy = createMotionClock(1, { original: { ringSpeed: 1.37 } });
    advanceMotionClock(legacy, 1, { original: { ringSpeed: 1.37 } });
    near(legacy.rings.original, 2.74);
    near(legacy.texts.original, 2);
    near(legacy.edges.top, -2 / 32);
    near(legacy.edges.bottom, 2 / 38);
    const bounds: EdgeSettings = { top: { direction: 'negative', duration: 0 }, bottom: { direction: 'positive', duration: 1000 } };
    const clamped = createMotionClock(12, { low: { textMotionSpeed: 0 }, high: { textMotionSpeed: 9 } }, bounds);
    near(clamped.texts.low, 3);
    near(clamped.texts.high, 24);
    near(clamped.edges.top, -1);
    near(clamped.edges.bottom, 12 / 90);
  });
});
