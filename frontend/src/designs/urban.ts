// Scaffold of the three urban designs (district, tuner, arcade): original urban graphic systems,
// with no third-party logos, character art or type assets. Paper, background pattern, floor
// shadow and the intro transform around each design's own geometry, then its crop accents.
import type { DesignKey } from '../studio-state.ts';
import { kit, paletteOf } from './kit.ts';
import type { Design, Fill, PaletteColors, Point, SceneSettings, StudioCanvas } from './types.ts';

const { clamp, num, rgba } = kit;

/** What an urban design's hooks draw with. `signature` runs centred on the ring, mirrored when swapped. */
export interface UrbanScene {
  ctx: StudioCanvas;
  w: number;
  h: number;
  dark: boolean;
  paper: string;
  ink: string;
  muted: string;
  accent: string;
  /** Ring clock angle. */
  a: number;
  r: number;
  /** The shorter side of the canvas. */
  unit: number;
  strength: number;
  /** Strength of the optional decoration, 0–1. */
  cut: number;
  line(points: Point[], color: Fill, width: number, alpha?: number, cap?: CanvasLineCap, closed?: boolean): void;
  poly(points: Point[], color: Fill, alpha?: number): void;
  disc(x: number, y: number, radius: number, color: Fill, alpha?: number): void;
  ellipse(rx: number, ry: number, rot: number, start: number, end: number, color: Fill, width: number, alpha?: number, x?: number, y?: number): void;
  band(rx: number, ry: number, start: number, end: number, thickness: number, color: Fill, alpha?: number): void;
  roundRect(x: number, y: number, width: number, height: number, radius: number, color: Fill, alpha?: number): void;
  cast(draw: () => void): void;
  star(x: number, y: number, size: number, rotation: number, color: Fill, alpha?: number): void;
}

export interface UrbanDesignSpec {
  key: DesignKey;
  palette: { light: PaletteColors; dark: PaletteColors };
  /** Accent when the settings have no valid one. */
  accent: string;
  note: string;
  hello: string;
  /** The design's own geometry. */
  signature(scene: UrbanScene): void;
  /** Accents at the far display-side corners, keeping the information third clear. Faded by the decoration strength. */
  crop(scene: UrbanScene): void;
}

export function urbanDesign(spec: UrbanDesignSpec): Design {
  return {
    key: spec.key,
    note: spec.note,
    hello: spec.hello,
    copyBelowTitle: true,
    palette: dark => paletteOf(dark ? spec.palette.dark : spec.palette.light),
    paint: (ctx, w, h, t, settings) => paintUrban(spec, ctx, w, h, t, settings),
  };
}

function paintUrban(spec: UrbanDesignSpec, ctx: StudioCanvas, w: number, h: number, t: number | undefined, settings: SceneSettings) {
  if (!ctx || !(w > 0) || !(h > 0)) return;
  const input = settings || {};
  const portrait = !!input.portrait, swapped = !!input.swapped, dark = input.background === 'dark', side = swapped ? -1 : 1;
  const [paper, ink, muted] = dark ? spec.palette.dark : spec.palette.light;
  const accent = kit.hex(input.accent, spec.accent);
  const shadowColor = kit.hex(input.shadowColor, '#101c20');
  const unit = Math.min(w, h), strength = clamp(num(input.geometryStrength, 1), .5, 1.5), opacity = clamp(num(input.geometryOpacity, 1), .3, 1), cut = clamp(num(input.cutStrength, .75));
  const a = input.motion === false ? 0 : Math.PI * 2 * num(input.ringTime, num(t, 0)) / 12;
  const ga = input.motion === false || input.gridMoving === false ? 0 : Math.PI * 2 * num(t, 0) / 12, gm = clamp(num(input.gridMotion, .14), 0, .5);
  const intro = clamp(num(input.introProgress, 1)), introScale = 1 + .44 * (1 - intro);
  const finalCx = w * (portrait ? .52 : swapped ? .285 : .715) + num(input.px, 0) * w * .007;
  const finalCy = h * (portrait ? (swapped ? .34 : .56) : .49) + num(input.py, 0) * h * .005;
  const cx = w * .5 + (finalCx - w * .5) * intro, cy = h * .48 + (finalCy - h * .48) * intro;
  const baseR = (portrait ? Math.min(w * .35, h * .26) : h * .38) * clamp(num(input.ringScale, 1.15), .6, 2.4), r = baseR * introScale;
  const shadowStrength = clamp(num(input.shadowStrength, .8), 0, 1.5), shadowDepth = clamp(num(input.shadowDepth, 1), 0, 2);
  const shadowEnabled = input.shadow !== false && shadowStrength > 0 && shadowDepth > 0;

  function line(points: Point[], color: Fill, width: number, alpha = 1, cap: CanvasLineCap = 'butt', closed = false) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    if (closed) ctx.closePath();
    ctx.stroke(); ctx.restore();
  }
  function poly(points: Point[], color: Fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function disc(x: number, y: number, radius: number, color: Fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function ellipse(rx: number, ry: number, rot: number, start: number, end: number, color: Fill, width: number, alpha = 1, x = 0, y = 0) {
    const c = Math.cos(rot), s = Math.sin(rot), points: Point[] = [], count = Math.max(24, Math.ceil(Math.abs(end - start) * 14 - 1e-9));
    for (let i = 0; i <= count; i++) {
      const b = start + (end - start) * i / count, u = Math.cos(b) * rx, v = Math.sin(b) * ry;
      points.push([x + u * c - v * s, y + u * s + v * c]);
    }
    line(points, color, width, alpha);
  }
  function band(rx: number, ry: number, start: number, end: number, thickness: number, color: Fill, alpha = 1) {
    const points: Point[] = [], count = Math.max(12, Math.ceil(Math.abs(end - start) * 16 - 1e-9));
    for (let i = 0; i <= count; i++) { const b = start + (end - start) * i / count; points.push([Math.cos(b) * rx, Math.sin(b) * ry]); }
    for (let i = count; i >= 0; i--) { const b = start + (end - start) * i / count; points.push([Math.cos(b) * (rx - thickness), Math.sin(b) * (ry - thickness)]); }
    poly(points, color, alpha);
  }
  function roundRect(x: number, y: number, width: number, height: number, radius: number, color: Fill, alpha = 1) {
    const rr = Math.min(radius, width * .5, height * .5);
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x + rr, y); ctx.lineTo(x + width - rr, y); ctx.quadraticCurveTo(x + width, y, x + width, y + rr);
    ctx.lineTo(x + width, y + height - rr); ctx.quadraticCurveTo(x + width, y + height, x + width - rr, y + height);
    ctx.lineTo(x + rr, y + height); ctx.quadraticCurveTo(x, y + height, x, y + height - rr);
    ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function cast(draw: () => void) {
    ctx.save();
    if (shadowEnabled) {
      const tr = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null, dpr = tr ? Math.hypot(tr.a, tr.b) || 1 : 1;
      ctx.shadowColor = rgba(shadowColor, shadowStrength * .31);
      ctx.shadowBlur = (input.shadowStyle === 'soft' ? unit * .018 : 0) * shadowDepth * dpr;
      ctx.shadowOffsetX = unit * .007 * shadowDepth * dpr; ctx.shadowOffsetY = unit * .012 * shadowDepth * dpr;
    }
    draw(); ctx.restore();
  }
  function star(x: number, y: number, size: number, rotation: number, color: Fill, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
    poly([[0, -size], [size * .24, -size * .24], [size, 0], [size * .24, size * .24], [0, size], [-size * .24, size * .24], [-size, 0], [-size * .24, -size * .24]], color, alpha);
    ctx.restore();
  }
  function pattern() {
    if (input.grid === false || input.pattern === 'none') return;
    const kind = input.pattern || 'dots', alpha = clamp(num(input.gridOpacity, .065), .02, .15) * (dark ? 1 : 1.2);
    if (kind === 'ripple') {
      for (let j = 0; j < 12; j++) {
        const radius = unit * (.12 + j * .073), points: Point[] = [];
        for (let i = 0; i <= 88; i++) { const b = i * Math.PI / 44; points.push([cx + Math.cos(b) * radius, cy + baseR * .53 + Math.sin(b) * radius * .31 + Math.sin(b * 3 - j * .42 + ga) * unit * .028 * gm]); }
        line(points, ink, unit * .0008, alpha * (1 - j / 14));
      }
      return;
    }
    if (kind === 'mesh') {
      for (let j = 0; j < 19; j++) {
        const d = j / 18, z = 1 / (.9 + d * 4.3), points: Point[] = [];
        for (let i = 0; i <= 58; i++) { const u = (i / 58 - .5) * 5.6; points.push([cx + u * w * .40 * z, h * .22 + h * .64 * z + Math.sin(u * 1.3 - d * 3.5 + ga) * unit * .045 * gm * z]); }
        line(points, ink, unit * .00085, alpha * (1 - d) * .85);
      }
      for (let i = 0; i < 25; i++) {
        const u = (i / 24 - .5) * 5.6, points: Point[] = [];
        for (let j = 0; j <= 36; j++) { const d = j / 36, z = 1 / (.9 + d * 4.3); points.push([cx + u * w * .40 * z, h * .22 + h * .64 * z + Math.sin(u * 1.3 - d * 3.5 + ga) * unit * .045 * gm * z]); }
        line(points, ink, unit * .0007, alpha * .5);
      }
      return;
    }
    if (kind === 'grid') {
      const cols = portrait ? 16 : 26, rows = portrait ? 25 : 16;
      for (let j = 0; j <= rows; j++) {
        const y = h * j / rows, points: Point[] = [];
        for (let i = 0; i <= 46; i++) { const x = w * i / 46; points.push([x, y + Math.sin(x / w * 5 + ga + j * .12) * unit * .022 * gm]); }
        line(points, ink, unit * .0007, alpha * .65);
      }
      for (let j = 0; j <= cols; j++) {
        const x = w * j / cols, points: Point[] = [];
        for (let i = 0; i <= 40; i++) { const y = h * i / 40; points.push([x + Math.sin(y / h * 4 + ga + j * .14) * unit * .020 * gm, y]); }
        line(points, ink, unit * .0007, alpha * .55);
      }
      return;
    }
    // One compound path per row keeps the dot field economical when recording.
    const cols = portrait ? 14 : 25, rows = portrait ? 25 : 15, stepX = w / cols, stepY = h / rows;
    for (let row = 0; row < rows; row++) {
      ctx.save(); ctx.fillStyle = ink; ctx.globalAlpha *= alpha * (.30 + .50 * Math.sin((row + .5) / rows * Math.PI)); ctx.beginPath();
      for (let col = 0; col < cols; col++) {
        const x = (col + .5) * stepX + Math.sin(ga + row * .34) * unit * .014 * gm, y = (row + .5) * stepY + Math.sin(ga + col * .34 + row * .23) * unit * .025 * gm;
        const fade = clamp(1 - Math.abs(x - cx) / (w * .85), .18, 1), radius = unit * .0012 * fade;
        ctx.moveTo(x + radius, y); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.closePath();
      }
      ctx.fill(); ctx.restore();
    }
  }
  function floor() {
    if (!input.floor || shadowStrength <= 0 || shadowDepth <= 0) return;
    const yy = Math.min(h * .9, cy + baseR * .88), rr = Math.min(baseR * .68, w * .31);
    ctx.save(); ctx.translate(cx, yy); ctx.scale(1, .07);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    g.addColorStop(0, rgba(shadowColor, shadowStrength * (dark ? .34 : .13))); g.addColorStop(1, rgba(shadowColor, 0));
    ctx.fillStyle = g; ctx.fillRect(-rr, -rr, rr * 2, rr * 2); ctx.restore();
  }

  const scene: UrbanScene = { ctx, w, h, dark, paper, ink, muted, accent, a, r, unit, strength, cut, line, poly, disc, ellipse, band, roundRect, cast, star };
  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
  ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.clearRect(0, 0, w, h);
  if (!input.transparent) { ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h); }
  pattern(); floor();
  ctx.save(); ctx.studioIntroTransform?.({ fromX: w * .5, fromY: h * .48, toX: finalCx, toY: finalCy, scale: 1.44 });
  ctx.globalAlpha *= opacity; ctx.translate(cx, cy); ctx.scale(portrait ? 1 : side, 1);
  spec.signature(scene); ctx.restore();
  if (cut > 0) {
    ctx.save(); ctx.globalAlpha *= cut * opacity;
    if (swapped && !portrait) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    spec.crop(scene);
    ctx.restore();
  }
  ctx.restore();
}
