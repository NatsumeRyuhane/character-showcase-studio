// The ring layout, clocks and two shape helpers shared by the language and urban scaffolds.
// Their other helpers (line, disc, ellipse, cast, pattern, floor) differ between the two
// families on purpose, so each scaffold keeps its own.
import { clamp, num } from './kit.ts';
import type { Fill, Point, SceneSettings, StudioCanvas } from './types.ts';

export interface RingLayout {
  dark: boolean;
  portrait: boolean;
  swapped: boolean;
  /** -1 when swapped, which mirrors the geometry in landscape. */
  side: number;
  /** Ring clock angle, with its sine, cosine and sin(2a). */
  a: number;
  sa: number;
  ca: number;
  s2: number;
  /** Background clock angle and pattern motion amount. */
  ga: number;
  gm: number;
  /** Intro progress, 0–1. */
  intro: number;
  /** Where the ring settles, and where it is during the intro. */
  finalCx: number;
  finalCy: number;
  cx: number;
  cy: number;
  /** Ring radius without and with the intro's enlargement. */
  baseR: number;
  r: number;
  /** The shorter side of the canvas. */
  unit: number;
  strength: number;
  opacity: number;
  /** Strength of the optional decoration, 0–1. */
  cut: number;
  shadowEnabled: boolean;
  shadowStrength: number;
  shadowDepth: number;
}

export function ringLayout(input: SceneSettings, w: number, h: number, t: number | undefined): RingLayout {
  const dark = input.background === 'dark', portrait = !!input.portrait, swapped = !!input.swapped, side = swapped ? -1 : 1;
  // Background and geometry receive independent continuous clocks. A paused ring
  // must not stop the ambient grid, and neither clock resets at the intro boundary.
  const a = input.motion === false ? 0 : Math.PI * 2 * num(input.ringTime, num(t, 0)) / 12, sa = Math.sin(a), ca = Math.cos(a), s2 = Math.sin(2 * a);
  const ga = input.motion === false || input.gridMoving === false ? 0 : Math.PI * 2 * num(t, 0) / 12, gm = clamp(num(input.gridMotion, .14), 0, .5);
  const intro = clamp(num(input.introProgress, 1));
  const finalCx = w * (portrait ? .52 : swapped ? .285 : .715) + num(input.px, 0) * w * .007;
  const finalCy = h * (portrait ? (swapped ? .34 : .56) : .49) + num(input.py, 0) * h * .005;
  const cx = w * .5 + (finalCx - w * .5) * intro, cy = h * .48 + (finalCy - h * .48) * intro;
  const baseR = (portrait ? Math.min(w * .35, h * .26) : h * .38) * clamp(num(input.ringScale, 1.15), .6, 2.4), r = baseR * (1 + .44 * (1 - intro));
  const unit = Math.min(w, h), strength = clamp(num(input.geometryStrength, 1), .5, 1.5);
  const opacity = clamp(num(input.geometryOpacity, 1), .3, 1), cut = clamp(num(input.cutStrength, .75));
  const shadowStrength = clamp(num(input.shadowStrength, .8), 0, 1.5), shadowDepth = clamp(num(input.shadowDepth, 1), 0, 2);
  const shadowEnabled = input.shadow !== false && shadowStrength > 0 && shadowDepth > 0;
  return { dark, portrait, swapped, side, a, sa, ca, s2, ga, gm, intro, finalCx, finalCy, cx, cy, baseR, r, unit, strength, opacity, cut, shadowEnabled, shadowStrength, shadowDepth };
}

export function ringShapes(ctx: StudioCanvas) {
  /** A filled polygon. */
  function poly(points: Point[], color: Fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  /** Starts a new path with a rounded rectangle; the caller fills or strokes it. */
  function roundedPath(x: number, y: number, width: number, height: number, radius: number) {
    const rr = Math.min(radius, width * .5, height * .5);
    ctx.beginPath(); ctx.moveTo(x + rr, y); ctx.lineTo(x + width - rr, y); ctx.quadraticCurveTo(x + width, y, x + width, y + rr);
    ctx.lineTo(x + width, y + height - rr); ctx.quadraticCurveTo(x + width, y + height, x + width - rr, y + height);
    ctx.lineTo(x + rr, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - rr);
    ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
  }
  return { poly, roundedPath };
}
