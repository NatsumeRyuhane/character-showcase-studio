import { describe, expect, it } from 'vitest';
import { decodeStudioVariants, encodeStudioVariants } from '../../src/variant-codec.ts';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
// Compare plain JSON, as the snapshot stored by the shell would be.
const encode = (value: unknown) => copy(encodeStudioVariants(value));
const decode = <T extends Record<string, unknown>>(value: unknown, defaults: T) => copy(decodeStudioVariants(value, defaults));
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).length;

const names = ['couture', 'brutalist', 'cloud', 'plush', 'play', 'sticker', 'orbit', 'poster', 'wave', 'dual', 'district', 'tuner', 'arcade'];
const fixture = {
  typeface: 'editorial', cutStrength: 0.75, badgePalette: 'soft', badgeStyle: 'filled', badgeColor: '#dfe5d6', badgeInk: '#334036', badgeOpacity: 0.85,
  ringSpeed: 1, ringScale: 1.15, textMotion: true, textMotionStyle: 'refined', textMotionAmount: 0.55, textMotionSpeed: 1,
  geometryStrength: 1, geometryOpacity: 1, grid: true, gridMoving: true, gridOpacity: 0.035, gridMotion: 0.14, modelScale: 1, parallax: true,
  palette: 'acid', background: 'light', pattern: 'grid', accent: '#bceb45',
  effects: {
    gradeEnabled: true, grade: 'original', gradeStrength: 0.7, gradeModel: false, gradient: 'none', gradientStrength: 0.25, gradientColor: '#7b55ef',
    gradientMotion: true, titleGradient: false, grain: 0, vignette: 0, shadowEnabled: true, shadowStyle: 'cut', shadowStrength: 0.8, shadowDepth: 1, shadowColor: '#24302c',
  },
  shadows: { title: true, badges: true, model: true, geometry: false, floor: true },
  geometryBySeries: { atelier: 'signature', fur: 'signature', mini: 'signature' },
};
type Variant = typeof fixture & { dualSplit?: number; dualGuides?: boolean; unknownSetting?: string };

function setup() {
  const defaults: Record<string, Variant> = Object.fromEntries(names.map(name => [name, copy(fixture)]));
  Object.assign(defaults.dual, { dualSplit: 0.47, dualGuides: false });
  const variants = copy(defaults);
  for (const [index, name] of names.entries()) {
    variants[name].ringSpeed = index * 0.2;
    variants[name].effects.shadowColor = '#' + String(index + 1).padStart(6, '0');
    variants[name].shadows.geometry = index % 2 === 0;
    variants[name].geometryBySeries.fur = index % 2 ? 'orbit' : 'signature';
  }
  return { defaults, variants, encoded: encode(variants) as Record<string, unknown[]> };
}

describe('tuple-v1 encoding', () => {
  it('writes a fixed 51-slot schema with explicit nulls for missing optional values', () => {
    const { encoded } = setup();
    expect(encoded.couture).toHaveLength(51);
    expect(encoded.couture[25]).toBeNull(); // dualSplit
    expect(encoded.couture[26]).toBeNull(); // dualGuides
    expect(encoded.dual[25]).toBe(0.47);
    expect(encoded.dual[26]).toBe(false);
  });

  it('encodes only the documented fixed paths', () => {
    const { variants, encoded } = setup();
    const withUnknown: Record<string, Variant & { effects: { unknownEffect?: string } }> = copy(variants);
    withUnknown.couture.unknownSetting = 'discard';
    withUnknown.couture.effects.unknownEffect = 'discard';
    expect(encode(withUnknown)).toEqual(encoded);
  });

  it('leaves ample room below the 16 KiB host limit', () => {
    const { variants } = setup();
    expect(bytes(encode(variants))).toBeLessThan(bytes(variants) * 0.55);
  });
});

describe('tuple-v1 decoding', () => {
  it('round-trips all thirteen full variants', () => {
    const { defaults, variants, encoded } = setup();
    expect(decode(encoded, defaults)).toEqual(variants);
  });

  it('starts from the defaults when values are missing', () => {
    const { defaults, encoded } = setup();
    expect(decode(copy(encoded), {}), 'unknown variants cannot enter a project').toEqual({});
    expect(decode(null, defaults), 'null storage').toEqual(defaults);
    expect(decode({}, defaults), 'absent variants').toEqual(defaults);
    expect(decode({ couture: [] }, defaults), 'missing tuple slots').toEqual(defaults);
    expect(decode({ couture: Array(51).fill(null) }, defaults), 'explicit null slots').toEqual(defaults);
  });

  it('ignores future slots and unknown variants', () => {
    const { defaults, variants, encoded } = setup();
    const extra = copy(encoded);
    extra.couture.push('future slot', { __proto__: { polluted: true } });
    extra.unrecognized = encoded.couture;
    expect(decode(extra, defaults)).toEqual(variants);
  });

  it('keeps input inert and leaves scalar validation to restore', () => {
    const { defaults, encoded } = setup();
    const bad = copy(encoded);
    bad.couture[0] = 'not-a-font';
    bad.couture[7] = '(()=>{globalThis.ran=true})()';
    bad.couture[8] = { polluted: true };
    bad.couture[9] = ['not a boolean'];
    const result = decode(bad, defaults);
    expect(result.couture.typeface).toBe('not-a-font');
    expect(result.couture.ringSpeed).toBe('(()=>{globalThis.ran=true})()');
    expect((globalThis as { ran?: unknown }).ran, 'decoding never evaluates input').toBeUndefined();
    expect(result.couture.ringScale, 'objects cannot replace scalar values').toBe(defaults.couture.ringScale);
    expect(result.couture.textMotion, 'arrays cannot replace scalar values').toBe(defaults.couture.textMotion);
  });

  it('rejects prototype pollution', () => {
    const { defaults } = setup();
    const malicious = JSON.parse('{"__proto__":["bad"],"constructor":["bad"],"couture":null}');
    expect(decode(malicious, defaults)).toEqual(defaults);
    expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
  });

  it('returns values independent of the defaults and the input', () => {
    const { defaults, variants, encoded } = setup();
    const unchanged = copy(defaults);
    const decoded = decodeStudioVariants(encoded, defaults);
    decoded.couture.effects.shadowColor = '#ffffff';
    decoded.couture.geometryBySeries.fur = 'none';
    decoded.couture.shadows.title = false;
    expect(defaults, 'decoding never mutates the defaults').toEqual(unchanged);
    expect(decoded.brutalist.effects.shadowColor, 'nested settings are independent').toBe(variants.brutalist.effects.shadowColor);
    encoded.couture[27] = false;
    expect(decoded.couture.effects.gradeEnabled, 'decoded values keep no input references').toBe(true);
  });
});
