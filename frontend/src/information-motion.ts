export type TextMotionStyle = 'refined' | 'soft' | 'playful';
/** x and y are pixels. `entry` is an unblurred fade for stationary QR and barcode layers. */
export interface InformationPose {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  entry: number;
}

const finite = (value: unknown, fallback: number) => Number.isFinite(value) ? value as number : fallback;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

/**
 * Text entrance and idle motion.
 * @param time narrative seconds
 * @param phase independently accumulated text seconds (`MotionClock.texts`)
 * @param index stagger order; negative skips the entrance
 * @param style unknown styles move like `refined`
 * @param amount strength, 0–1
 */
export function informationMotionPose(time: number, phase: number, index: number, style: string, amount = 1): InformationPose {
  const strength = clamp(finite(amount, 1));
  if (strength === 0) return { x: 0, y: 0, scale: 1, opacity: 1, entry: 1 };
  const order = finite(index, 0), start = 0.8 + clamp(order, 0, 7) * 0.32;
  const progress = order < 0 ? 1 : clamp((finite(time, 0) - start) / 1.12);
  const entry = progress * progress * (3 - 2 * progress);
  const angle = finite(phase, 0) * Math.PI * 2 / 12 + Math.max(0, order) * 0.47;
  let x, y, scale = 1;
  if (style === 'soft') {
    x = 0.65 * Math.sin(angle * 0.5);
    y = 2.35 * Math.sin(angle) + 0.45 * (1 - entry);
    scale += 0.0025 * Math.sin(angle * 0.5) * entry;
  } else if (style === 'playful') {
    const bounce = Math.max(0, Math.sin(angle)) ** 4;
    x = 0.65 * Math.sin(angle * 0.5);
    y = -1.7 * bounce + 1.15 * (1 - entry);
    scale += 0.015 * bounce * entry;
  } else {
    x = 1.15 * Math.sin(angle * 0.5);
    y = 0.55 * Math.sin(angle) + 0.65 * (1 - entry);
  }
  return { x: x * strength, y: y * strength, scale: 1 + (scale - 1) * strength, opacity: 1 - strength * (1 - entry), entry };
}

// Positive cycles move right and negative cycles move left. Only the repeated
// content's display position wraps; the shared animation clocks never wrap.
export function marqueeOffset(phase: number, cycleWidth: number): number {
  if (!Number.isFinite(phase) || !Number.isFinite(cycleWidth) || cycleWidth <= 0) return 0;
  const fraction = ((-phase % 1) + 1) % 1;
  return fraction === 0 ? 0 : -fraction * cycleWidth;
}
