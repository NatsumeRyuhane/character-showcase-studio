// The 13 designs, one module each, and the entry points the paint loop and the AE export use.
import type { DesignKey } from '../studio-state.ts';
import { arcadeDesign } from './arcade.ts';
import { brutalistDesign } from './brutalist.ts';
import { cloudDesign } from './cloud.ts';
import { coutureDesign } from './couture.ts';
import { districtDesign } from './district.ts';
import { dualDesign } from './dual.ts';
import { orbitDesign } from './orbit.ts';
import { playDesign } from './play.ts';
import { plushDesign } from './plush.ts';
import { posterDesign } from './poster.ts';
import { paintSharedScene, sharedArtColors } from './shared-scene.ts';
import { stickerDesign } from './sticker.ts';
import { tunerDesign } from './tuner.ts';
import type { ArtColors, Design, Palette, SceneSettings, StudioCanvas } from './types.ts';
import { waveDesign } from './wave.ts';

export const designs: Readonly<Record<DesignKey, Design>> = {
  couture: coutureDesign,
  brutalist: brutalistDesign,
  cloud: cloudDesign,
  orbit: orbitDesign,
  play: playDesign,
  plush: plushDesign,
  poster: posterDesign,
  sticker: stickerDesign,
  wave: waveDesign,
  dual: dualDesign,
  district: districtDesign,
  tuner: tunerDesign,
  arcade: arcadeDesign,
};

function designOf(key: string): Design | undefined {
  return Object.hasOwn(designs, key) ? designs[key as DesignKey] : undefined;
}

/** A language or urban design's colours, or null for the designs that use the shared scene's colours. */
export function designPalette(key: string, dark: boolean): Palette | null {
  return designOf(key)?.palette?.(dark) || null;
}

/** The artwork's CSS colours: the design's palette, its own art colours, or the shared scene's. */
export function designArtColors(key: string, dark: boolean): ArtColors {
  return designPalette(key, dark) || designOf(key)?.artColors?.(dark) || sharedArtColors(dark);
}

/** Paints a design's canvas artwork for one frame. The result depends only on the arguments. */
export function paintExploration(ctx: StudioCanvas, w: number, h: number, t: number | undefined, key: string, settings?: SceneSettings) {
  const design = designOf(key), input = settings || {};
  if (design?.paint && (design.ownsEveryGeometry || (input.ringStyle || 'signature') === 'signature')) {
    design.paint(ctx, w, h, t, input);
    return;
  }
  paintSharedScene(ctx, w, h, t, input, design?.shared || {}, designPalette(key, input.background === 'dark'));
}
