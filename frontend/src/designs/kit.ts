// Number and colour helpers shared by the design painters. They are one object rather than
// separate exports because tests/support/module-script.cjs turns exports into globals.
export const kit = {
  clamp: (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v)),
  /** `v` if it is a finite number, otherwise `fallback`. */
  num: (v: unknown, fallback: number) => (Number.isFinite(v) ? (v as number) : fallback),
  /** `#rrggbb` with an alpha, clamped to 0–1, as an `rgba()` colour. */
  rgba(hex: string, alpha: number) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + kit.clamp(alpha) + ')';
  },
  /** Blends two `#rrggbb` colours: 0 gives `first`, 1 gives `second`. */
  mix(first: string, second: string, amount: number) {
    const a = parseInt(first.slice(1), 16), b = parseInt(second.slice(1), 16), v = kit.clamp(amount);
    const f = (shift: number) => Math.round(((a >> shift) & 255) * (1 - v) + ((b >> shift) & 255) * v);
    return '#' + [f(16), f(8), f(0)].map(n => n.toString(16).padStart(2, '0')).join('');
  },
  /** A colour from the settings if it is `#rrggbb`, otherwise `fallback`. */
  hex: (value: string | undefined, fallback: string) => (/^#[0-9a-f]{6}$/i.test(value || '') ? value! : fallback),
};

/** The `{ paper, ink, muted }` palette of a colour triple. */
export const paletteOf = ([paper, ink, muted]: readonly [string, string, string]) => ({ paper, ink, muted });
