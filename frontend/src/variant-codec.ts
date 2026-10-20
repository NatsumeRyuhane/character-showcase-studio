/* tuple-v1 stores complete variant values without repeating property names.
   This positional schema is append-only: changing an existing slot requires a
   new encoding marker. State validation remains the restore function's job. */

export type Scalar = string | number | boolean;
/** One design's settings: a value, or null when missing, for each slot in `slotPaths`. */
export type VariantTuple = (Scalar | null)[];
export type EncodedVariants = Record<string, VariantTuple>;
type SlotPath = readonly [string] | readonly [string, string];
type PlainRecord = Record<string, unknown>;

const main = ['typeface', 'cutStrength', 'badgePalette', 'badgeStyle', 'badgeColor', 'badgeInk', 'badgeOpacity', 'ringSpeed', 'ringScale', 'textMotion', 'textMotionStyle', 'textMotionAmount', 'textMotionSpeed', 'geometryStrength', 'geometryOpacity', 'grid', 'gridMoving', 'gridOpacity', 'gridMotion', 'modelScale', 'parallax', 'palette', 'background', 'pattern', 'accent', 'dualSplit', 'dualGuides'];
const effects = ['gradeEnabled', 'grade', 'gradeStrength', 'gradeModel', 'gradient', 'gradientStrength', 'gradientColor', 'gradientMotion', 'titleGradient', 'grain', 'vignette', 'shadowEnabled', 'shadowStyle', 'shadowStrength', 'shadowDepth', 'shadowColor'];
const shadows = ['title', 'badges', 'model', 'geometry', 'floor'];
const series = ['atelier', 'fur', 'mini'];
/** The 51 slots, in order. Never derive this from object key order. */
const slotPaths: readonly SlotPath[] = [
  ...main.map(key => [key] as const),
  ...effects.map(key => ['effects', key] as const),
  ...shadows.map(key => ['shadows', key] as const),
  ...series.map(key => ['geometryBySeries', key] as const),
];

const record = (value: unknown): value is PlainRecord => value !== null && typeof value === 'object' && !Array.isArray(value);
const own = (value: unknown, key: string): value is PlainRecord => value !== null && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key);
const safeKey = (key: string) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
const scalar = (value: unknown): value is Scalar => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

function clone<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clone) as T;
  if (!record(value)) return value;
  const copy: PlainRecord = {};
  for (const key of Object.keys(value)) if (safeKey(key)) copy[key] = clone(value[key]);
  return copy as T;
}

/** Encodes every design in `variants`. Values that are missing or not scalars become null. */
export function encodeStudioVariants(variants: unknown): EncodedVariants {
  const encoded: EncodedVariants = {};
  if (!record(variants)) return encoded;
  for (const name of Object.keys(variants)) {
    const source = variants[name];
    if (!safeKey(name) || !record(source)) continue;
    encoded[name] = slotPaths.map(path => {
      let value: unknown = source;
      for (const key of path) {
        if (!own(value, key)) return null;
        value = value[key];
      }
      return scalar(value) ? value : null;
    });
  }
  return encoded;
}

/**
 * Expands `encoded` over a deep copy of `defaults`. Only designs present in the
 * defaults are read, and only non-null scalar slots apply; future slots are ignored.
 * The result is not validated: restore still checks enums, colours and ranges.
 */
export function decodeStudioVariants<T extends PlainRecord>(encoded: unknown, defaults: T): T {
  const expanded = (record(defaults) ? clone(defaults) : {}) as PlainRecord;
  if (!record(encoded)) return expanded as T;
  for (const name of Object.keys(expanded)) {
    const target = expanded[name], tuple = own(encoded, name) ? encoded[name] : undefined;
    if (!safeKey(name) || !record(target) || !Array.isArray(tuple)) continue;
    for (let index = 0; index < slotPaths.length && index < tuple.length; index++) {
      const value: unknown = tuple[index];
      if (value === null || !scalar(value)) continue;
      const path = slotPaths[index];
      if (path.length === 1) {
        target[path[0]] = value;
      } else {
        if (!record(target[path[0]])) target[path[0]] = {};
        (target[path[0]] as PlainRecord)[path[1]] = value;
      }
    }
  }
  return expanded as T;
}
