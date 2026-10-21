// Shared text overrides. Empty values retain the visual language of each design.
// Pure settings and text helpers; the editor controls live in studio-text.js.

export type TypographyKey = 'name' | 'character' | 'author' | 'caption' | 'subtitle';
export type StoryRole = 'character' | 'author';
export interface TextStyle {
  text: string;
  font: 'auto' | 'manrope' | 'grotesk' | 'condensed' | 'serif' | 'rounded' | 'system';
  scale: number;
  /** null keeps the design's own tracking. */
  tracking: number | null;
  weight: 'auto' | '400' | '500' | '600' | '700' | '800' | '900';
  italic: 'auto' | 'normal' | 'italic';
  colorMode: 'auto' | 'custom';
  color: string;
  case: 'original' | 'uppercase' | 'lowercase';
}
export interface StoryCopy {
  kicker: string;
  label: string;
  meta: string;
}
export type TypographySettings = Record<TypographyKey, TextStyle> & { copy: Record<StoryRole, StoryCopy> };

type Loose = Record<string, unknown>;
const typographyKeys: readonly TypographyKey[] = ['name', 'character', 'author', 'caption', 'subtitle'];
const record = (value: unknown): value is Loose => !!value && typeof value === 'object';
function pick<T extends string>(value: unknown, list: readonly T[], fallback: T): T {
  return (list as readonly unknown[]).includes(value) ? value as T : fallback;
}
const bounded = (value: unknown, min: number, max: number, fallback: number) => Number.isFinite(value) ? Math.max(min, Math.min(max, value as number)) : fallback;
const clean = (value: unknown, max = 64) => typeof value === 'string' ? value.replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, max) : '';

/** Validates saved text overrides, filling in defaults. Control characters become spaces. */
export function studioTypographySettings(value: unknown = {}): TypographySettings {
  const source = record(value) ? value : {};
  const result = {} as TypographySettings;
  for (const key of typographyKeys) {
    const item = record(source[key]) ? source[key] : {};
    result[key] = {
      text: clean(item.text),
      font: pick(item.font, ['auto', 'manrope', 'grotesk', 'condensed', 'serif', 'rounded', 'system'], 'auto'),
      scale: bounded(item.scale, 0.6, 1.5, 1),
      tracking: Number.isFinite(item.tracking) ? bounded(item.tracking, -0.12, 0.25, 0) : null,
      weight: pick(item.weight, ['auto', '400', '500', '600', '700', '800', '900'], 'auto'),
      italic: pick(item.italic, ['auto', 'normal', 'italic'], 'auto'),
      colorMode: pick(item.colorMode, ['auto', 'custom'], 'auto'),
      color: typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color) ? item.color : '#f3f0e5',
      case: pick(item.case, ['original', 'uppercase', 'lowercase'], 'original'),
    };
  }
  result.copy = {} as TypographySettings['copy'];
  for (const role of ['character', 'author'] as const) {
    const item = ((source.copy as Loose | undefined)?.[role] || {}) as Loose;
    result.copy[role] = { kicker: clean(item.kicker, 80), label: clean(item.label, 80), meta: clean(item.meta, 120) };
  }
  return result;
}

type PartialTypography = { readonly [key: string]: Partial<TextStyle> | Partial<Record<StoryRole, Partial<StoryCopy>>> | undefined } | null | undefined;

/** The override text for `key`, or `fallback`, with the chosen letter case applied. */
export function studioTypographyValue(settings: PartialTypography, key: TypographyKey, fallback?: string): string {
  const item = (settings?.[key] || {}) as Partial<TextStyle>, text = (item.text || '').trim() || fallback || '';
  return item.case === 'uppercase' ? text.toUpperCase() : item.case === 'lowercase' ? text.toLowerCase() : text;
}
export function studioTypographyCopy(settings: PartialTypography, role: StoryRole, key: keyof StoryCopy, fallback?: string): string {
  const copy = settings?.copy as Partial<Record<StoryRole, Partial<StoryCopy>>> | undefined;
  return (copy?.[role]?.[key] || '').trim() || fallback || '';
}
/** Whether any override can move the name or taglines, so layout has to be measured again. */
export function studioTypographyLayoutChanged(settings: PartialTypography): boolean {
  return (['name', 'caption', 'subtitle'] as const).some(key => {
    const item = settings?.[key] as Partial<TextStyle> | undefined;
    return !!item && (item.scale !== 1 || item.font !== 'auto' || item.weight !== 'auto' || item.italic !== 'auto' || item.tracking !== null || !!item.text || item.case !== 'original');
  });
}
