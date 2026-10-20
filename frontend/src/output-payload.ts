// What the editor sends to the shell for an HTML or OBS export: the state in its compact
// form, the images the export may carry, and the output page's configuration.
// The shell validates all of it again (runtime/export-packages.ts); this is the sandbox side.
import type { StudioState } from './studio-state.ts';
import { encodeStudioVariants, type EncodedVariants } from './variant-codec.ts';

export type ImageKey = 'qr' | 'barcode' | 'logo' | 'model' | 'portrait' | 'introCharacter' | 'introAuthor';
export type StudioImages = Record<ImageKey, string>;
export type OutputKind = 'html' | 'obs';

export interface OutputConfig {
  enabled: true;
  width: number;
  height: number;
  transparent: boolean;
  includeCharacters: boolean;
  start: 'intro' | 'show';
  fit: 'contain' | 'cover';
  obsLayers: 'combined' | 'separate';
  /** Standalone HTML always plays the whole sequence. */
  playback?: 'complete';
}

export type OutputState = Omit<StudioState, 'variants'> & { variantEncoding: 'tuple-v1'; variants: EncodedVariants };

export interface OutputPayload {
  kind: OutputKind;
  state: OutputState;
  images: Partial<StudioImages>;
  config: OutputConfig;
}

const characterImages: readonly ImageKey[] = ['model', 'portrait', 'introCharacter', 'introAuthor'];
const storyImages: readonly ImageKey[] = ['introCharacter', 'introAuthor'];

/** Output size in pixels. 4K doubles the logical 1920×1080 / 1080×1920 layout. */
export function studioOutputDimensions(state: StudioState): [number, number] {
  const scale = state.output.resolution === '2160' ? 2 : 1;
  return state.ratio === 'portrait' ? [1080 * scale, 1920 * scale] : [1920 * scale, 1080 * scale];
}

export function studioOutputConfig(state: StudioState, kind: OutputKind | 'ae' = 'obs'): OutputConfig {
  const [width, height] = studioOutputDimensions(state);
  return {
    enabled: true,
    width,
    height,
    transparent: state.output.transparent,
    includeCharacters: state.output.includeCharacters,
    start: kind === 'html' ? 'intro' : state.output.start,
    fit: state.output.fit,
    obsLayers: kind === 'html' ? 'combined' : state.output.obsLayers,
    ...(kind === 'html' ? { playback: 'complete' as const } : {}),
  };
}

/** Character pictures stay out unless the user opted in; packaging-only previews drop the two poster shots. */
export function studioOutputPayload(state: StudioState, images: StudioImages, kind: OutputKind): OutputPayload {
  const packed = Object.fromEntries(Object.entries(images).filter(([key, value]) => value
    && (state.output.includeCharacters || !characterImages.includes(key as ImageKey))
    && (!state.narrative.storyPackagingOnly || !storyImages.includes(key as ImageKey)))) as Partial<StudioImages>;
  const snapshot = JSON.parse(JSON.stringify(state)) as OutputState;
  if (kind === 'html') snapshot.output.obsLayers = 'combined';
  snapshot.variantEncoding = 'tuple-v1';
  snapshot.variants = encodeStudioVariants(state.variants);
  return { kind, state: snapshot, images: packed, config: studioOutputConfig(state, kind) };
}
