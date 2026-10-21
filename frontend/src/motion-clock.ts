// The composition timeline can loop while the artwork phase keeps moving.
// Changing a speed alters only future increments, preserving the current pose.

export type EdgeSide = 'top' | 'bottom';
/** Per-design speeds the clocks read. Unvalidated values fall back to speed 1. */
export interface ClockVariant {
  ringSpeed?: unknown;
  textMotionSpeed?: unknown;
}
export type ClockVariants = Readonly<Record<string, ClockVariant | null | undefined>> | null | undefined;
export interface EdgeSetting {
  direction?: unknown;
  duration?: unknown;
}
export type EdgeSettings = { readonly [side in EdgeSide]?: EdgeSetting | null } | null | undefined;

/**
 * Accumulated phases. They only ever advance: never reset on replay, loop,
 * phase change or speed change. Rings and texts are in seconds at speed 1;
 * edges are in border cycles, negative for leftward motion.
 */
export interface MotionClock {
  elapsed: number;
  rings: Record<string, number>;
  texts: Record<string, number>;
  edges: Record<EdgeSide, number>;
}

const edgeDefaults = { top: { direction: 'negative', duration: 32 }, bottom: { direction: 'positive', duration: 38 } } as const;
const edgeSides: readonly EdgeSide[] = ['top', 'bottom'];
const finite = (value: unknown): value is number => Number.isFinite(value);

function speed(value: unknown, min: number, max: number) {
  return finite(value) ? Math.max(min, Math.min(max, value)) : 1;
}
function edgeRate(edge: EdgeSetting | null | undefined, side: EdgeSide) {
  const fallback = edgeDefaults[side];
  const direction = ['negative', 'positive', 'still'].includes(edge?.direction as string) ? edge!.direction : fallback.direction;
  const duration = finite(edge?.duration) ? Math.max(12, Math.min(90, edge.duration)) : fallback.duration;
  return (direction === 'negative' ? -1 : direction === 'positive' ? 1 : 0) / duration;
}

/** Rebuilds every clock as if it had run from 0 to `time` at the current speeds (seek, replay, restore). */
export function createMotionClock(time: unknown, variants: ClockVariants, edgeSettings?: EdgeSettings): MotionClock {
  const elapsed = finite(time) ? Math.max(0, time) : 0, entries = Object.entries(variants || {});
  return {
    elapsed,
    rings: Object.fromEntries(entries.map(([key, v]) => [key, elapsed * speed(v?.ringSpeed, 0, 3)])),
    texts: Object.fromEntries(entries.map(([key, v]) => [key, elapsed * speed(v?.textMotionSpeed, 0.25, 2)])),
    edges: Object.fromEntries(edgeSides.map(side => [side, elapsed * edgeRate(edgeSettings?.[side], side)])) as Record<EdgeSide, number>,
  };
}

/** Advances every clock by `delta` seconds at the current speeds. Non-positive or non-finite deltas do nothing. */
export function advanceMotionClock(clock: MotionClock, delta: number, variants: ClockVariants, edgeSettings?: EdgeSettings): void {
  if (!finite(delta) || delta <= 0) return;
  clock.elapsed += delta;
  // Clocks built elsewhere may lack a family; start it at 0.
  clock.rings ??= {};
  clock.texts ??= {};
  clock.edges ??= { top: 0, bottom: 0 };
  for (const [key, v] of Object.entries(variants || {})) {
    clock.rings[key] = (clock.rings[key] ?? 0) + delta * speed(v?.ringSpeed, 0, 3);
    // Disabled text effects still accumulate, so reenabling never restarts them.
    clock.texts[key] = (clock.texts[key] ?? 0) + delta * speed(v?.textMotionSpeed, 0.25, 2);
  }
  for (const side of edgeSides) clock.edges[side] = (clock.edges[side] ?? 0) + delta * edgeRate(edgeSettings?.[side], side);
}
