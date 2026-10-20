import { describe, expect, it } from 'vitest';
import { informationMotionPose, marqueeOffset } from '../../src/information-motion.ts';

const near = (actual: number, expected: number) => expect(Math.abs(actual - expected), `${actual} != ${expected}`).toBeLessThan(1e-9);
const snapshot = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('informationMotionPose', () => {
  it('finishes every stagger by 4.2 s, and lets titles skip the entrance', () => {
    for (let index = 0; index < 20; index++) {
      near(informationMotionPose(4.2, 3, index, 'refined').entry, 1);
      near(informationMotionPose(4.2, 3, index, 'refined').opacity, 1);
    }
    near(informationMotionPose(0, 0, -1, 'refined').entry, 1);
    expect(informationMotionPose(0.79, 0, 0, 'refined').entry).toBe(0);
    expect(informationMotionPose(1, 0, 3, 'refined').entry).toBe(0);
  });

  it('stands still at strength 0', () => {
    expect(snapshot(informationMotionPose(0, 100, 5, 'playful', 0))).toEqual({ x: 0, y: 0, scale: 1, opacity: 1, entry: 1 });
  });

  it('stays readable: small, bounded offsets in every style', () => {
    for (const style of ['refined', 'soft', 'playful']) for (let sample = 0; sample <= 500; sample++) {
      const pose = informationMotionPose(sample / 100, sample * 0.137 - 20, sample % 10, style);
      expect(Object.values(pose).every(Number.isFinite)).toBe(true);
      expect(pose.opacity >= 0 && pose.opacity <= 1 && pose.entry >= 0 && pose.entry <= 1).toBe(true);
      expect(Math.abs(pose.x)).toBeLessThan(2);
      expect(Math.abs(pose.y)).toBeLessThan(style === 'refined' ? 2 : 3);
      expect(pose.scale > 0.99 && pose.scale < 1.025).toBe(true);
    }
  });

  it('treats unknown styles as refined and survives invalid input', () => {
    expect(snapshot(informationMotionPose(4.5, 3, 1, 'unknown'))).toEqual(snapshot(informationMotionPose(4.5, 3, 1, 'refined')));
    expect(Object.values(informationMotionPose(NaN, Infinity, NaN, 'soft')).every(Number.isFinite)).toBe(true);
  });
});

// Repeated content uses the same visual period for either direction.
describe('marqueeOffset', () => {
  it('wraps the display position into one cycle in either direction', () => {
    near(marqueeOffset(-0.25, 800), -200);
    near(marqueeOffset(0.25, 800), -600);
    for (const phase of [-10, -1, 0, 1, 10]) near(marqueeOffset(phase, 800), 0);
    for (const phase of [-100.9, -1.3, -0.001, 0.001, 0.9, 10.3, 100.9]) {
      const offset = marqueeOffset(phase, 800);
      expect(offset >= -800 && offset <= 0).toBe(true);
      near(marqueeOffset(phase + 1, 800), offset);
    }
  });

  it('moves continuously across the wrap', () => {
    near(marqueeOffset(0.3, 800) - marqueeOffset(0.25, 800), 40);
    near(marqueeOffset(-0.3, 800) - marqueeOffset(-0.25, 800), -40);
    near(marqueeOffset(1.0001, 800) - marqueeOffset(0.9999, 800) + 800, 0.0002 * 800);
  });

  it('returns 0 for invalid input', () => {
    for (const [phase, width] of [[NaN, 100], [1, 0], [1, -1], [1, Infinity]]) near(marqueeOffset(phase, width), 0);
  });
});
