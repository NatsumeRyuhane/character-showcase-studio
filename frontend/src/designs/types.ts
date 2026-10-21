// Types shared by the design modules in this folder.
import type { DesignKey } from '../studio-state.ts';
import type { SharedLook } from './shared-scene.ts';

export type Point = [number, number];
export type Fill = string | CanvasGradient;

/** Paper (background), ink (text and lines) and a muted secondary colour. */
export interface Palette {
  paper: string;
  ink: string;
  muted: string;
}
export type PaletteColors = readonly [paper: string, ink: string, muted: string];
/** The artwork's CSS colours, `--paper` and `--ink`. */
export interface ArtColors {
  paper: string;
  ink: string;
}

/**
 * What the painters draw on: the editor's canvas context, or the AE export's recorder
 * (ae-canvas-recorder.js). Only the recorder has the hooks. They mark the intro transform,
 * so the AE export can keep it apart from the continuous motion.
 */
export type StudioCanvas = CanvasRenderingContext2D & {
  studioIntroTransform?(transform: { fromX: number; fromY: number; toX: number; toY: number; scale: number }): void;
  studioIntroRotation?(radians: number): void;
  studioIntroOpacity?(opacity: number): void;
};

/**
 * What the paint loop passes to a painter: the design's settings, plus the frame's clocks and layout.
 * Every field is optional, and the painters fall back to a default for missing or invalid values.
 */
export interface SceneSettings {
  /** Geometry style; `signature` is the design's own. `geometry` is an older name for it. */
  ringStyle?: string;
  geometry?: string;
  pattern?: string;
  grid?: boolean;
  background?: string;
  accent?: string;
  /** Ring clock in seconds. Falls back to the frame time. */
  ringTime?: number;
  /** 0 at the start of the intro, 1 once the geometry has settled. */
  introProgress?: number;
  portrait?: boolean;
  swapped?: boolean;
  transparent?: boolean;
  /** `false` freezes every motion; `gridMoving: false` freezes the background pattern only. */
  motion?: boolean;
  gridMoving?: boolean;
  gridMotion?: number;
  gridOpacity?: number;
  intensity?: number;
  geometryStrength?: number;
  geometryOpacity?: number;
  ringScale?: number;
  cutStrength?: number;
  shadow?: boolean;
  shadowStyle?: string;
  shadowStrength?: number;
  shadowDepth?: number;
  shadowColor?: string;
  floor?: boolean;
  /** Pointer parallax, -0.5 to 0.5. */
  px?: number;
  py?: number;
  dualSplit?: number;
  dualGuides?: boolean;
}

export type Painter = (ctx: StudioCanvas, w: number, h: number, t: number | undefined, settings: SceneSettings) => void;

/** One of the 13 designs. Its CSS and its section in the template are separate (see docs/dev/architecture.md). */
export interface Design {
  readonly key: DesignKey;
  /** Colours of the language and urban designs. The others use the shared scene's colours and have none. */
  palette?(dark: boolean): Palette;
  /** CSS colours of a design without a palette; the shared scene's by default (designArtColors in index.ts). */
  artColors?(dark: boolean): ArtColors;
  /** The design's own artwork, for the `signature` geometry, or for every geometry if `ownsEveryGeometry`. */
  readonly paint?: Painter;
  readonly ownsEveryGeometry?: boolean;
  /** How the shared scene draws the design whenever its own painter does not. */
  readonly shared?: SharedLook;
  /** Small caption in the artwork (`.language-note`). */
  readonly note?: string;
  /** Replaces the greeting in the artwork (`.hello`). */
  readonly hello?: string;
  /** Push the caption and subtitle below the name block, which this design skews or enlarges (fitPosterCopy in studio-views.js). */
  readonly copyBelowTitle?: boolean;
}
