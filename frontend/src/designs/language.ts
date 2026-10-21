// Scaffold of the six language designs (couture, brutalist, cloud, plush, play, sticker): paper,
// background pattern, floor shadow and the intro transform around each design's own geometry.
// Every path is presentation geometry, kept away from the model's central silhouette.
import type { DesignKey } from '../studio-state.ts';
import { clamp, hexOr, num, paletteOf, rgba } from './kit.ts';
import { ringLayout, ringShapes } from './ring-scene.ts';
import type { Design, Fill, PaletteColors, Point, SceneSettings, StudioCanvas } from './types.ts';

/** What a language design's hooks draw with. `signature` runs centred on the ring, mirrored when swapped. */
export interface LanguageScene {
  ctx: StudioCanvas;
  w: number;
  h: number;
  input: SceneSettings;
  dark: boolean;
  portrait: boolean;
  swapped: boolean;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  /** Ring clock angle, with its sine, cosine and sin(2a). */
  a: number;
  sa: number;
  ca: number;
  s2: number;
  /** Intro progress, 0–1. */
  intro: number;
  cx: number;
  cy: number;
  r: number;
  /** The shorter side of the canvas. */
  unit: number;
  strength: number;
  opacity: number;
  /** Strength of the optional decoration, 0–1. */
  cut: number;
  line(points: Point[], color: Fill, width: number, alpha?: number, cap?: CanvasLineCap): void;
  poly(points: Point[], color: Fill, alpha?: number): void;
  disc(x: number, y: number, radius: number, color: Fill, alpha?: number): void;
  ell(rx: number, ry: number, rot: number, start: number, end: number, color: Fill, width: number, alpha?: number, x?: number, y?: number): void;
  ringBand(rx: number, ry: number, rot: number, start: number, end: number, thickness: number, color: Fill, alpha?: number): void;
  roundedPath(x: number, y: number, width: number, height: number, radius: number): void;
  roundRect(x: number, y: number, width: number, height: number, radius: number, color: Fill, alpha?: number, strokeWidth?: number): void;
  /** Draws with the design's drop shadow; `soft` always blurs it. */
  cast(draw: () => void, soft?: boolean): void;
  halo(x: number, y: number, radius: number, color: string, alpha: number, inner?: number): void;
}

export interface LanguageDesignSpec {
  key: DesignKey;
  palette: { light: PaletteColors; dark: PaletteColors };
  /** Accent when the settings have no valid one. */
  accent: string;
  note: string;
  /** Paints over the paper, before the pattern. Only on an opaque background. */
  backdrop?(scene: LanguageScene): void;
  /** The design's own geometry. */
  signature(scene: LanguageScene): void;
  /** Painted last, over the whole canvas. */
  accents?(scene: LanguageScene): void;
}

export function languageDesign(spec: LanguageDesignSpec): Design {
  return {
    key: spec.key,
    note: spec.note,
    palette: dark => paletteOf(dark ? spec.palette.dark : spec.palette.light),
    paint: (ctx, w, h, t, settings) => paintLanguage(spec, ctx, w, h, t, settings),
  };
}

function paintLanguage(spec: LanguageDesignSpec, ctx: StudioCanvas, w: number, h: number, t: number | undefined, settings: SceneSettings) {
  if (!ctx || !(w > 0) || !(h > 0)) return;
  const input = settings || {};
  const { dark, portrait, swapped, side, a, sa, ca, s2, ga, gm, intro, finalCx, finalCy, cx, cy, r, unit, strength, opacity, cut, shadowEnabled, shadowStrength, shadowDepth } = ringLayout(input, w, h, t);
  const [paper, ink, muted] = dark ? spec.palette.dark : spec.palette.light;
  const accent = hexOr(input.accent, spec.accent);
  const shadowColor = hexOr(input.shadowColor, '#282c31');
  const { poly, roundedPath } = ringShapes(ctx);

  function line(points: Point[], color: Fill, width: number, alpha = 1, cap: CanvasLineCap = 'round') {
    if (points.length < 2) return;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke(); ctx.restore();
  }
  function disc(x: number, y: number, radius: number, color: Fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(.01, radius), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function ell(rx: number, ry: number, rot: number, start: number, end: number, color: Fill, width: number, alpha = 1, x = 0, y = 0) {
    const points: Point[] = [], c = Math.cos(rot), s = Math.sin(rot), count = Math.max(28, Math.ceil(Math.abs(end - start) * 20 - 1e-9));
    for (let i = 0; i <= count; i++) {
      const b = start + (end - start) * i / count, u = Math.cos(b) * rx, v = Math.sin(b) * ry;
      points.push([x + u * c - v * s, y + u * s + v * c]);
    }
    line(points, color, width, alpha);
  }
  function ringBand(rx: number, ry: number, rot: number, start: number, end: number, thickness: number, color: Fill, alpha = 1) {
    ctx.save(); ctx.rotate(rot); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
    const count = 90;
    for (let i = 0; i <= count; i++) {
      const b = start + (end - start) * i / count, u = Math.cos(b) * rx, v = Math.sin(b) * ry;
      i ? ctx.lineTo(u, v) : ctx.moveTo(u, v);
    }
    for (let i = count; i >= 0; i--) {
      const b = start + (end - start) * i / count;
      ctx.lineTo(Math.cos(b) * (rx - thickness), Math.sin(b) * (ry - thickness));
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function roundRect(x: number, y: number, width: number, height: number, radius: number, color: Fill, alpha = 1, strokeWidth = 0) {
    ctx.save(); ctx.globalAlpha *= alpha; roundedPath(x, y, width, height, radius);
    if (strokeWidth) { ctx.lineWidth = strokeWidth; ctx.strokeStyle = color; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
    ctx.restore();
  }
  function cast(draw: () => void, soft = false) {
    ctx.save();
    if (shadowEnabled) {
      const tr = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null, dpr = tr ? Math.hypot(tr.a, tr.b) || 1 : 1;
      ctx.shadowColor = rgba(shadowColor, shadowStrength * (soft ? .25 : .33));
      ctx.shadowBlur = (soft || input.shadowStyle === 'soft' ? unit * .024 : 0) * shadowDepth * dpr;
      ctx.shadowOffsetX = unit * .009 * shadowDepth * dpr; ctx.shadowOffsetY = unit * .014 * shadowDepth * dpr;
    }
    draw(); ctx.restore();
  }
  function halo(x: number, y: number, radius: number, color: string, alpha: number, inner = .03) {
    const g = ctx.createRadialGradient(x, y, radius * inner, x, y, radius);
    g.addColorStop(0, rgba(color, alpha)); g.addColorStop(.48, rgba(color, alpha * .36)); g.addColorStop(1, rgba(color, 0));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
  }
  function gridAlpha(x: number, y: number) {
    const dx = (x - cx) / (w * (portrait ? .7 : .65)), dy = (y - cy) / (h * .8);
    return clamp(1 - Math.sqrt(dx * dx + dy * dy), .07, 1) * (portrait ? 1 : clamp((side * (x - cx) / w + .45) * 2, .15, 1));
  }
  function pattern() {
    if (input.grid === false || input.pattern === 'none') return;
    const kind = input.pattern || 'dots', density = clamp(num(input.gridOpacity, .065), .02, .15), step = Math.max(19, unit * .046);
    const alpha = density * (dark ? 1.1 : 1.45);
    if (kind === 'ripple') {
      for (let j = 0; j < 16; j++) {
        const rx = unit * (.08 + j * .063), points: Point[] = [];
        for (let i = 0; i <= 112; i++) { const b = i * Math.PI / 56; points.push([cx + Math.cos(b) * rx, cy + r * .55 + Math.sin(b) * rx * .24 + Math.sin(b * 3 - j * .4 + ga) * unit * .025 * gm]); }
        line(points, ink, unit * .0008, alpha * (1 - j / 18));
      }
      return;
    }
    if (kind === 'mesh') {
      for (let j = 0; j < 20; j++) {
        const depth = j / 19, z = 1 / (.9 + depth * 4.4), points: Point[] = [];
        for (let i = 0; i <= 70; i++) { const u = (i / 70 - .5) * 5.4, x = cx + u * w * .42 * z, y = h * .25 + h * .60 * z + Math.sin(u * 1.1 - depth * 4 + ga) * unit * .05 * gm * z; points.push([x, y]); }
        line(points, ink, unit * .0008, alpha * (1 - depth) * .75);
      }
      for (let i = 0; i <= 32; i++) {
        const u = (i / 32 - .5) * 5.4, points: Point[] = [];
        for (let j = 0; j <= 50; j++) { const depth = j / 50, z = 1 / (.9 + depth * 4.4); points.push([cx + u * w * .42 * z, h * .25 + h * .60 * z + Math.sin(u * 1.1 - depth * 4 + ga) * unit * .05 * gm * z]); }
        line(points, ink, unit * .00065, alpha * .6);
      }
      return;
    }
    if (kind === 'grid') {
      for (let x = -step; x < w + step; x += step) {
        const points: Point[] = [];
        for (let y = 0; y <= h + 8; y += 16) points.push([x + Math.sin(ga + y / h * 4) * unit * .018 * gm, y]);
        line(points, ink, unit * .00065, alpha * .68);
      }
      for (let y = -step; y < h + step; y += step) {
        const points: Point[] = [];
        for (let x = 0; x <= w + 8; x += 16) points.push([x, y + Math.sin(ga + x / w * 5) * unit * .015 * gm]);
        line(points, ink, unit * .00065, alpha * .68);
      }
      return;
    }
    for (let row = 0, y = step * .5; y < h; y += step, row++) for (let col = 0, x = step * .5; x < w; x += step, col++) {
      const wave = Math.sin(col * .42 + row * .29 + ga), xx = x + Math.sin(ga + row * .3) * unit * .015 * gm, yy = y + wave * unit * .027 * gm, fade = gridAlpha(xx, yy);
      disc(xx, yy, unit * .00115 * (.75 + wave * .13), ink, alpha * fade * 1.5);
    }
  }
  function floor() {
    if (!input.floor || shadowStrength <= 0 || shadowDepth <= 0) return;
    const yy = Math.min(h * .89, cy + r * .88), rr = Math.min(r * .65, w * .30);
    ctx.save(); ctx.translate(cx, yy); ctx.scale(1, .075);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    g.addColorStop(0, rgba(shadowColor, shadowStrength * (dark ? .36 : .13))); g.addColorStop(1, rgba(shadowColor, 0));
    ctx.fillStyle = g; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
  }

  const scene: LanguageScene = {
    ctx, w, h, input, dark, portrait, swapped, paper, ink, muted, accent, a, sa, ca, s2, intro, cx, cy, r, unit, strength, opacity, cut,
    line, poly, disc, ell, ringBand, roundedPath, roundRect, cast, halo,
  };
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
  ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.clearRect(0, 0, w, h);
  if (!input.transparent) {
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
    spec.backdrop?.(scene);
  }
  pattern(); floor();
  ctx.save(); ctx.studioIntroTransform?.({ fromX: w * .5, fromY: h * .48, toX: finalCx, toY: finalCy, scale: 1.44 });
  ctx.globalAlpha *= opacity; ctx.translate(cx, cy); ctx.scale(portrait ? 1 : side, 1);
  spec.signature(scene); ctx.restore();
  spec.accents?.(scene);
  ctx.restore();
}
