import { studioIntroDuration, studioNarrativeSettings, studioStoryDuration, studioTotalDuration, type NarrativeSettings } from './timeline.ts';
import { studioTypographySettings, type TypographySettings } from './typography.ts';
import { decodeStudioVariants, encodeStudioVariants, type EncodedVariants } from './variant-codec.ts';

// The editor state: defaults, validation and restore of saved snapshots, and the
// snapshot the editor saves. See docs/dev/state-and-timing.md.

export type DesignKey = 'couture' | 'brutalist' | 'cloud' | 'plush' | 'play' | 'sticker' | 'orbit' | 'poster' | 'wave' | 'dual' | 'district' | 'tuner' | 'arcade';
export type SeriesKey = 'atelier' | 'fur' | 'mini';
export type EdgeSide = 'top' | 'bottom';
export type GeometryKey = keyof typeof geometryNames;
export type PaletteKey = keyof typeof palettes;

export interface SeriesEntry {
  label: string;
  prefix: string;
  serial: string;
  caption: string;
  subtitle: string;
}
export interface VariantEffects {
  gradeEnabled: boolean;
  grade: 'original' | 'chrome' | 'cold' | 'warm' | 'faded' | 'vivid';
  gradeStrength: number;
  gradeModel: boolean;
  gradient: 'none' | 'spotlight' | 'diagonal' | 'halo' | 'aurora';
  gradientStrength: number;
  gradientColor: string;
  gradientMotion: boolean;
  titleGradient: boolean;
  grain: number;
  vignette: number;
  shadowEnabled: boolean;
  shadowStyle: 'cut' | 'soft';
  shadowStrength: number;
  shadowDepth: number;
  shadowColor: string;
}
export interface VariantShadows {
  title: boolean;
  badges: boolean;
  model: boolean;
  geometry: boolean;
  floor: boolean;
}
/** One design's settings. Every design has them all; `dual` also has its split and guides. */
export interface VariantSettings {
  typeface: 'editorial' | 'grotesk' | 'classic' | 'serif' | 'rounded';
  cutStrength: number;
  badgePalette: 'soft' | 'mono' | 'custom';
  badgeStyle: 'filled' | 'outline' | 'bare';
  badgeColor: string;
  badgeInk: string;
  badgeOpacity: number;
  ringSpeed: number;
  ringScale: number;
  textMotion: boolean;
  textMotionStyle: 'refined' | 'soft' | 'playful';
  textMotionAmount: number;
  textMotionSpeed: number;
  geometryStrength: number;
  geometryOpacity: number;
  geometryBySeries: Record<SeriesKey, GeometryKey>;
  grid: boolean;
  gridMoving: boolean;
  gridOpacity: number;
  gridMotion: number;
  modelScale: number;
  parallax: boolean;
  palette: PaletteKey | 'custom';
  background: 'light' | 'dark';
  pattern: 'mesh' | 'dots' | 'ripple' | 'grid' | 'none';
  accent: string;
  dualSplit?: number;
  dualGuides?: boolean;
  effects: VariantEffects;
  shadows: VariantShadows;
}
export interface EdgeMotion {
  direction: 'negative' | 'positive' | 'still';
  duration: number;
}
export interface OutputSettings {
  resolution: '1080' | '2160';
  obsLayers: 'combined' | 'separate';
  transparent: boolean;
  includeCharacters: boolean;
  start: 'intro' | 'show';
  fit: 'contain' | 'cover';
  fps: 30 | 60;
  aeIntro: boolean;
}
export interface StudioState {
  version: 6;
  design: 'character-explorations';
  activeDesign: DesignKey;
  ratio: 'landscape' | 'portrait';
  frame: 'none' | 'horizontal' | 'vertical';
  name: string;
  series: SeriesKey;
  seriesData: Record<SeriesKey, SeriesEntry>;
  brand: string;
  modelCredit: string;
  designCredit: string;
  topText: string;
  bottomText: string;
  formats: { fbx: boolean; vrchat: boolean; vrm: boolean; warudo: boolean };
  badges: string[];
  qrUrl: string;
  type: boolean;
  swapped: boolean;
  playing: boolean;
  time: number;
  speed: number;
  edges: Record<EdgeSide, EdgeMotion>;
  variants: Record<DesignKey, VariantSettings>;
  typography: TypographySettings;
  introDuration: number;
  output: OutputSettings;
  narrative: NarrativeSettings;
}
/** What the editor saves: the state, with `variants` in the compact tuple-v1 form. */
export type StudioSnapshot = Omit<StudioState, 'variants'> & { variantEncoding: 'tuple-v1'; variants: EncodedVariants };

export const palettes = { acid: '#bceb45', red: '#ee2949', blue: '#3055ed', pink: '#d077e7', orange: '#ff6839', champagne: '#a68b62', lavender: '#b5a3db', oat: '#c49c83', coral: '#f47565', ink: '#4b6fe9' };
export const geometryNames = { signature: '构图推荐', orbit: '交错轨道', slices: '偏心切片', wave: '同心共振', flow: '开放流线', facet: '折面切框', ribbon: '柔波缎环', blocks: '玩趣积木', ring: '极简圆环', burst: '放射碎片', cut: '切角星环', rays: '放射星芒', none: '无几何' };
/** Compatibility badges, in display order. */
export const badgeCatalog: readonly { id: string; name: string; sub?: string; icon: string; description?: string }[] = [
  { id: 'mmd', name: 'MMD', sub: 'COMPATIBLE', icon: 'person-standing' },
  { id: 'arkit', name: 'ARKit', sub: 'COMPATIBLE', icon: 'scan-face' },
  { id: 'vrcft', name: 'VRCFT', icon: 'scan-face', description: 'Face Tracking' },
  { id: 'mtoon', name: 'MToon', icon: 'layers-2' },
  { id: 'liltoon', name: 'lilToon', icon: 'sparkles' },
  { id: 'poiyomi', name: 'Poiyomi', icon: 'orbit' },
  { id: 'face', name: 'FACE', sub: 'TRACKING', icon: 'scan-face' },
];
export const seriesDefaults: Readonly<Record<SeriesKey, SeriesEntry>> = {
  atelier: { label: 'ATELIER', prefix: 'AT', serial: '001', caption: '生来不设限。', subtitle: 'SOFT HEART. BOLD ENERGY.' },
  fur: { label: 'FUR', prefix: 'FR', serial: '001', caption: '蓬松有形 · 触感想象', subtitle: 'SOFT TEXTURE. BOLD SOUL.' },
  mini: { label: 'MINI', prefix: 'MN', serial: '001', caption: '小小身形 · 大大个性', subtitle: 'SMALL FORM. BIG ENERGY.' },
};
/** The designs drawn by the design-language modules (rather than the original exploration painter). */
export const languageKeys: readonly DesignKey[] = ['couture', 'brutalist', 'cloud', 'plush', 'play', 'sticker', 'district', 'tuner', 'arcade'];

type VariantOverrides = Partial<Omit<VariantSettings, 'effects' | 'shadows'>> & { effects?: Partial<VariantEffects>; shadows?: Partial<VariantShadows> };
/** Each design's differences from the shared variant defaults. Key order is the designs' order everywhere. */
const variantDefaults: Record<DesignKey, VariantOverrides> = {
  couture: { ringSpeed: 0.65, palette: 'champagne', background: 'light', pattern: 'none', typeface: 'serif', badgeStyle: 'bare', cutStrength: 0.6, effects: { shadowStyle: 'soft', shadowStrength: 0.25 }, shadows: { title: false, badges: false, geometry: true } },
  brutalist: { palette: 'acid', background: 'dark', pattern: 'grid', typeface: 'editorial', badgeStyle: 'outline', cutStrength: 0.9, effects: { shadowStrength: 0.45, shadowColor: '#030404' }, shadows: { badges: false } },
  cloud: { ringSpeed: 0.6, palette: 'lavender', background: 'light', pattern: 'none', typeface: 'rounded', badgeStyle: 'filled', cutStrength: 0.55, effects: { shadowStyle: 'soft', shadowStrength: 0.28, shadowColor: '#85779c' }, shadows: { title: false, badges: false, geometry: true } },
  plush: { ringSpeed: 0.55, palette: 'oat', background: 'light', pattern: 'none', typeface: 'serif', badgeStyle: 'bare', cutStrength: 0.5, effects: { shadowStyle: 'soft', shadowStrength: 0.3, shadowColor: '#97806c' }, shadows: { title: false, badges: false, geometry: true } },
  play: { palette: 'coral', background: 'light', pattern: 'dots', typeface: 'rounded', badgeStyle: 'bare', cutStrength: 0.7, effects: { shadowStyle: 'cut', shadowStrength: 0.25 }, shadows: { title: false, badges: false } },
  sticker: { palette: 'ink', background: 'light', pattern: 'none', typeface: 'grotesk', badgeStyle: 'outline', cutStrength: 0.7, effects: { shadowStyle: 'cut', shadowStrength: 0.3, shadowColor: '#8b7c53' }, shadows: { title: false, badges: false } },
  orbit: { palette: 'acid', background: 'light', pattern: 'mesh' },
  poster: { palette: 'red', background: 'dark', pattern: 'dots' },
  wave: { palette: 'blue', background: 'light', pattern: 'ripple' },
  dual: { palette: 'acid', background: 'light', pattern: 'grid', typeface: 'classic', ringScale: 1, dualSplit: 0.47, dualGuides: false, geometryBySeries: { atelier: 'rays', fur: 'orbit', mini: 'ring' }, effects: { shadowStrength: 0.25 }, shadows: { title: false, badges: false } },
  district: { palette: 'acid', background: 'dark', pattern: 'dots', typeface: 'editorial', badgeStyle: 'bare', badgePalette: 'soft', badgeColor: '#262924', badgeInk: '#e3e8d5', badgeOpacity: 0.7, ringSpeed: 0.7, ringScale: 1.12, cutStrength: 0.75, gridOpacity: 0.04, effects: { shadowStyle: 'cut', shadowStrength: 0.45, shadowColor: '#090b09' }, shadows: { title: true, badges: false, geometry: true } },
  tuner: { palette: 'orange', background: 'light', pattern: 'grid', typeface: 'grotesk', badgeStyle: 'bare', badgePalette: 'soft', badgeColor: '#222321', badgeInk: '#56564e', badgeOpacity: 0.8, ringSpeed: 0.5, ringScale: 1.07, cutStrength: 0.55, gridOpacity: 0.025, effects: { shadowStyle: 'soft', shadowStrength: 0.28, shadowColor: '#5b5545' }, shadows: { title: false, badges: false, geometry: true } },
  arcade: { palette: 'blue', background: 'light', pattern: 'dots', typeface: 'rounded', badgeStyle: 'outline', badgePalette: 'soft', badgeColor: '#222720', badgeInk: '#424e40', badgeOpacity: 0.6, ringSpeed: 0.65, ringScale: 1.08, cutStrength: 0.65, gridOpacity: 0.03, textMotionStyle: 'playful', effects: { shadowStyle: 'cut', shadowStrength: 0.22, shadowColor: '#95a88e' }, shadows: { title: false, badges: false, geometry: true } },
};
export const designKeys = Object.keys(variantDefaults) as DesignKey[];
const effectDefaults: VariantEffects = { gradeEnabled: true, grade: 'original', gradeStrength: 0.7, gradeModel: false, gradient: 'none', gradientStrength: 0.25, gradientColor: '#7b55ef', gradientMotion: true, titleGradient: false, grain: 0, vignette: 0, shadowEnabled: true, shadowStyle: 'cut', shadowStrength: 0.8, shadowDepth: 1, shadowColor: '#24302c' };
const shadowDefaults: VariantShadows = { title: true, badges: true, model: true, geometry: false, floor: true };
/** Maximum lengths of the shared text fields. */
export const maxLengths = { name: 32, brand: 24, modelCredit: 35, designCredit: 30, topText: 60, bottomText: 60, qrUrl: 180 };
/** Maximum lengths of each series' fields. */
export const seriesLengths = { label: 10, prefix: 3, serial: 4, caption: 14, subtitle: 32 };

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Every design's default settings, as a fresh copy. */
export function createDefaultVariants(): Record<DesignKey, VariantSettings> {
  const variants = {} as Record<DesignKey, VariantSettings>;
  for (const [key, v] of Object.entries(variantDefaults) as [DesignKey, VariantOverrides][]) {
    const modern = languageKeys.includes(key);
    // Spread order fixes the property order of saved snapshots; keep it.
    variants[key] = {
      typeface: key === 'wave' ? 'grotesk' : 'editorial', cutStrength: 0.75, badgePalette: 'soft', badgeStyle: 'filled', badgeColor: '#dfe5d6', badgeInk: '#334036', badgeOpacity: 0.85,
      ringSpeed: 1, ringScale: 1.15, textMotion: true, textMotionStyle: ['cloud', 'plush', 'wave'].includes(key) ? 'soft' : ['play', 'sticker'].includes(key) ? 'playful' : 'refined',
      textMotionAmount: 0.55, textMotionSpeed: 1, geometryStrength: 1, geometryOpacity: 1,
      geometryBySeries: { atelier: 'signature', fur: modern ? 'signature' : 'ribbon', mini: modern ? 'signature' : 'blocks' },
      grid: true, gridMoving: true, gridOpacity: modern ? 0.035 : 0.065, gridMotion: 0.14, modelScale: 1, parallax: true,
      ...v,
      accent: palettes[v.palette as PaletteKey],
      effects: { ...effectDefaults, ...v.effects },
      shadows: { ...shadowDefaults, ...v.shadows },
    } as VariantSettings;
  }
  // The overrides' nested objects (such as dual's geometryBySeries) must not be shared.
  return copy(variants);
}

/** A new project. `reducedMotion` starts it paused. */
export function createStudioState({ reducedMotion = false } = {}): StudioState {
  const narrative = studioNarrativeSettings({ introStyle: 'story' });
  return {
    version: 6, design: 'character-explorations', activeDesign: 'couture', ratio: 'landscape', frame: 'none', name: 'NOVA', series: 'atelier',
    seriesData: copy(seriesDefaults) as Record<SeriesKey, SeriesEntry>,
    brand: 'YOUR STUDIO', modelCredit: 'MODEL / YOUR NAME', designCredit: 'DESIGN / YOUR STUDIO', topText: 'ORIGINAL / CHARACTER ARCHIVE', bottomText: 'MAKE SOME NOISE. STAY CUTE.',
    formats: { fbx: true, vrchat: true, vrm: true, warudo: true }, badges: ['mmd', 'arkit', 'vrcft', 'mtoon', 'liltoon'], qrUrl: '',
    type: true, swapped: false, playing: !reducedMotion, time: 0, speed: 1,
    edges: { top: { direction: 'negative', duration: 32 }, bottom: { direction: 'positive', duration: 38 } },
    variants: createDefaultVariants(),
    typography: studioTypographySettings(),
    introDuration: studioStoryDuration(narrative),
    output: { resolution: '1080', obsLayers: 'combined', transparent: false, includeCharacters: false, start: 'intro', fit: 'contain', fps: 30, aeIntro: true },
    narrative,
  };
}

type Untrusted = { readonly [key: string]: unknown };
const fields = (value: unknown): Untrusted => value !== null && typeof value === 'object' ? value as Untrusted : {};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const finite = (value: unknown): value is number => Number.isFinite(value);
const hex = (value: unknown): value is string => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
const ownKey = <T extends object>(object: T, key: unknown): key is keyof T & string => typeof key === 'string' && Object.hasOwn(object, key);
function choose<T>(value: unknown, values: readonly T[], fallback: T): T {
  return (values as readonly unknown[]).includes(value) ? value as T : fallback;
}
/** Series serials keep only digits, and prefixes only uppercase letters and digits. */
export function cleanSeries(key: string, value: string): string {
  return key === 'serial' ? value.replace(/[^0-9]/g, '') : key === 'prefix' ? value.toUpperCase().replace(/[^A-Z0-9]/g, '') : value;
}

function restoreEffects(target: VariantEffects, raw: unknown) {
  if (!raw) return;
  const source = fields(raw), effects = target as unknown as Record<string, unknown>;
  for (const key of ['gradeEnabled', 'gradeModel', 'gradientMotion', 'titleGradient', 'shadowEnabled']) if (typeof source[key] === 'boolean') effects[key] = source[key];
  for (const [key, a, b] of [['gradeStrength', 0, 1], ['gradientStrength', 0, 0.6], ['grain', 0, 0.3], ['vignette', 0, 0.6], ['shadowStrength', 0, 1], ['shadowDepth', 0, 2]] as const) {
    const value = source[key];
    if (finite(value)) effects[key] = clamp(value, a, b);
  }
  for (const [key, list] of Object.entries({ grade: ['original', 'chrome', 'cold', 'warm', 'faded', 'vivid'], gradient: ['none', 'spotlight', 'diagonal', 'halo', 'aurora'], shadowStyle: ['cut', 'soft'] })) {
    if (list.includes(source[key] as string)) effects[key] = source[key];
  }
  for (const key of ['gradientColor', 'shadowColor']) if (hex(source[key])) effects[key] = source[key];
}

/**
 * Applies a saved widget state (`{privateContent}`) to `state`, in place, validating
 * every field. Accepts tuple-v1 and older object snapshots back to the early
 * exploration and Studio formats. Returns false, leaving `state` untouched, when the
 * snapshot is missing or of another kind.
 *
 * Fields the snapshot lacks keep their current value, except the intro, narrative
 * and typography settings, which are always replaced. A tuple-v1 snapshot is expanded
 * over the defaults first, so it never inherits edits from the current session.
 */
export function restoreStudioState(state: StudioState, saved: unknown, { reducedMotion = false } = {}): boolean {
  const source = fields(saved).privateContent as Untrusted | undefined;
  const p = source?.variantEncoding === 'tuple-v1' ? { ...source, variants: decodeStudioVariants(source.variants, createDefaultVariants()) } : source;
  if (!p) return false;
  const oldStudio = p.design === 'rebel-studio' && [11, 12, 13].includes(p.version as number);
  const oldExploration = p.design === 'character-explorations' && p.version === 1;
  const newVersion = p.design === state.design && [2, 3, 4, 5, 6].includes(p.version as number);
  if (!oldStudio && !oldExploration && !newVersion) return false;
  const shared = state as unknown as Record<string, unknown>;

  for (const [key, max] of Object.entries(maxLengths)) {
    const value = p[key];
    if (typeof value === 'string') shared[key] = value.slice(0, max);
  }
  if (ownKey(seriesDefaults, p.series)) state.series = p.series;
  if (ownKey(variantDefaults, p.activeDesign)) state.activeDesign = p.activeDesign;
  state.ratio = choose(p.ratio, ['landscape', 'portrait'] as const, state.ratio);
  state.frame = choose(p.frame, ['none', 'horizontal', 'vertical'] as const, state.frame);
  for (const side of ['top', 'bottom'] as const) {
    const raw = fields(p.edges)[side];
    if (!raw) continue;
    const edge = fields(raw);
    state.edges[side].direction = choose(edge.direction, ['negative', 'positive', 'still'] as const, state.edges[side].direction);
    if (finite(edge.duration)) state.edges[side].duration = clamp(edge.duration, 12, 90);
  }
  for (const key of ['swapped', 'type'] as const) {
    const value = p[key];
    if (typeof value === 'boolean') state[key] = value;
  }
  state.introDuration = finite(p.introDuration) ? studioIntroDuration(p.introDuration) : 4.5;
  state.narrative = studioNarrativeSettings(p.narrative && typeof p.narrative === 'object' ? p.narrative : {});
  state.typography = studioTypographySettings(p.typography);
  // A story intro's length comes from its shots; a stale saved introDuration never wins.
  if (state.narrative.introStyle === 'story') state.introDuration = studioStoryDuration(state.narrative);
  if (p.output && typeof p.output === 'object') {
    const output = fields(p.output);
    state.output.resolution = choose(output.resolution, ['1080', '2160'] as const, state.output.resolution);
    state.output.obsLayers = choose(output.obsLayers, ['combined', 'separate'] as const, 'combined');
    state.output.start = choose(output.start, ['intro', 'show'] as const, state.output.start);
    state.output.fit = choose(output.fit, ['contain', 'cover'] as const, state.output.fit);
    state.output.fps = choose(output.fps, [30, 60] as const, 30);
    for (const key of ['transparent', 'includeCharacters', 'aeIntro'] as const) {
      const value = output[key];
      if (typeof value === 'boolean') state.output[key] = value;
    }
  }
  if (finite(p.time)) state.time = clamp(p.time, 0, studioTotalDuration(state.introDuration, state.narrative));
  if (finite(p.speed)) state.speed = clamp(p.speed, 0.5, 1.8);
  if (typeof p.playing === 'boolean') state.playing = p.playing && !reducedMotion;
  const formats = fields(p.formats);
  for (const key of Object.keys(state.formats) as (keyof StudioState['formats'])[]) {
    const value = formats[key];
    if (typeof value === 'boolean') state.formats[key] = value;
  }
  if (Array.isArray(p.badges)) {
    const badges: unknown[] = p.badges;
    state.badges = badgeCatalog.filter(b => badges.includes(b.id)).map(b => b.id);
  }
  for (const series of Object.keys(seriesDefaults) as SeriesKey[]) {
    const entry = fields(fields(p.seriesData)[series]);
    for (const [key, max] of Object.entries(seriesLengths) as [keyof SeriesEntry, number][]) {
      const value = entry[key];
      if (typeof value === 'string') state.seriesData[series][key] = cleanSeries(key, value.slice(0, max));
    }
  }
  if (oldExploration) {
    for (const key of ['serial', 'caption', 'subtitle'] as const) {
      const value = p[key];
      if (typeof value === 'string') state.seriesData[state.series][key] = cleanSeries(key, value.slice(0, seriesLengths[key]));
    }
  }

  for (const name of designKeys) {
    const target = state.variants[name], raw = oldStudio ? p : fields(p.variants)[name];
    if (!raw) continue;
    const v = fields(raw), settings = target as unknown as Record<string, unknown>;
    if (hex(v.accent)) {
      const accent = v.accent;
      target.accent = accent;
      target.palette = (Object.keys(palettes) as PaletteKey[]).find(k => palettes[k].toLowerCase() === accent.toLowerCase()) || 'custom';
    }
    if (['light', 'dark'].includes(v.background as string)) settings.background = v.background;
    if (['mesh', 'dots', 'ripple', 'grid', 'none'].includes(v.pattern as string)) settings.pattern = v.pattern;
    for (const [key, list] of Object.entries({ typeface: ['editorial', 'grotesk', 'classic', 'serif', 'rounded'], badgePalette: ['soft', 'mono', 'custom'], badgeStyle: ['filled', 'outline', 'bare'], textMotionStyle: ['refined', 'soft', 'playful'] })) {
      if (list.includes(v[key] as string)) settings[key] = v[key];
    }
    for (const key of ['badgeColor', 'badgeInk']) if (hex(v[key])) settings[key] = v[key];
    for (const key of ['grid', 'gridMoving', 'parallax', 'textMotion', 'dualGuides']) if (typeof v[key] === 'boolean') settings[key] = v[key];
    for (const [key, a, b] of [['dualSplit', 0.35, 0.6], ['ringSpeed', 0, 3], ['ringScale', 0.6, 2.4], ['textMotionAmount', 0, 1], ['textMotionSpeed', 0.25, 2], ['geometryStrength', 0.5, 1.5], ['geometryOpacity', 0.3, 1], ['gridOpacity', 0.02, 0.15], ['gridMotion', 0, 0.5], ['modelScale', 0.75, 1.3], ['cutStrength', 0, 1], ['badgeOpacity', 0.2, 1]] as const) {
      const value = v[key];
      if (finite(value)) settings[key] = clamp(value, a, b);
    }
    const geometry = fields(v.geometryBySeries);
    for (const series of Object.keys(seriesDefaults) as SeriesKey[]) {
      const value = geometry[series];
      if (ownKey(geometryNames, value)) target.geometryBySeries[series] = value;
    }
    if (oldExploration) {
      if (ownKey(geometryNames, v.ringStyle)) target.geometryBySeries[state.series] = v.ringStyle === 'ribbon' ? 'flow' : v.ringStyle;
      if (typeof v.shadow === 'boolean') target.effects.shadowEnabled = v.shadow;
      if (finite(v.intensity)) target.gridOpacity = clamp(v.intensity * 0.1, 0.02, 0.15);
      if (['original', 'cold', 'warm', 'faded', 'vivid'].includes(v.grade as string)) target.effects.grade = v.grade as VariantEffects['grade'];
      if (finite(v.grain)) target.effects.grain = clamp(v.grain, 0, 0.3);
      target.effects.gradient = ({ edge: 'spotlight', duotone: 'diagonal', none: 'none' } as const)[v.gradient as 'edge'] || 'none';
    }
    restoreEffects(target.effects, v.effects);
    const shadows = fields(v.shadows);
    for (const key of Object.keys(shadowDefaults) as (keyof VariantShadows)[]) {
      const value = shadows[key];
      if (typeof value === 'boolean') target.shadows[key] = value;
    }
  }
  return true;
}

/** The private snapshot the editor saves: every setting, with variants tuple-encoded. */
export function studioSnapshot(state: StudioState): StudioSnapshot {
  const snapshot = copy(state) as unknown as StudioSnapshot;
  snapshot.variantEncoding = 'tuple-v1';
  snapshot.variants = encodeStudioVariants(state.variants);
  return snapshot;
}

/**
 * The public summary saved next to the snapshot. The private tuple snapshot retains
 * every design; public retrieval only needs the active one, leaving room for custom
 * copy within the 16 KiB state cap.
 */
export function studioModelContent(state: StudioState) {
  const series = state.seriesData[state.series];
  const variants = Object.fromEntries((Object.entries(state.variants) as [DesignKey, VariantSettings][]).filter(([key]) => key === state.activeDesign).map(([key, v]) => [key, {
    accent: v.accent, background: v.background, typeface: v.typeface, geometry: v.geometryBySeries[state.series], ringScale: v.ringScale, ringSpeed: v.ringSpeed,
    textMotion: v.textMotion, textMotionStyle: v.textMotionStyle, textMotionAmount: v.textMotionAmount, textMotionSpeed: v.textMotionSpeed, badgeStyle: v.badgeStyle,
  }]));
  return {
    design: '角色展示 · 时尚／毛绒／可爱／街头二游 · 十三种设计', characterName: state.name, series: series.label, seriesCode: series.prefix, serial: series.serial, caption: series.caption,
    frame: state.frame, sequence: state.narrative, borderMotion: state.edges,
    aspectRatio: state.ratio === 'portrait' ? '9:16' : '16:9',
    informationPosition: state.ratio === 'portrait' ? (state.swapped ? '下方' : '上方') : (state.swapped ? '右侧' : '左侧'),
    formats: Object.keys(state.formats).filter(k => state.formats[k as keyof StudioState['formats']]), badges: state.badges, variants,
  };
}

/** JSON with object keys sorted recursively, so a reordered echo of a snapshot has the same signature. */
export function stateSignature(value: unknown): string {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
