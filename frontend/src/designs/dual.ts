// Dual: the archived acid-sticker spread as two panels, rebuilt on the shared continuous clock.
// It owns only the background, for every geometry style; uploaded characters and editable copy
// remain DOM (see the dual markup and styles).
import { clamp, hexOr, num, rgba } from './kit.ts';
import type { Design, Fill, Point, SceneSettings, StudioCanvas } from './types.ts';

function paintDual(ctx: StudioCanvas, w: number, h: number, t: number | undefined, settings: SceneSettings) {
  if (!ctx || !(w > 0) || !(h > 0)) return;
  const input = settings || {};
  const dark = input.background === 'dark', portrait = !!input.portrait, swapped = !!input.swapped;
  const paper = dark ? '#171e1b' : '#eeefdf', ink = dark ? '#eef0df' : '#232b24', muted = dark ? '#9ba995' : '#78816a';
  const accent = hexOr(input.accent, '#bceb45');
  const shadowColor = hexOr(input.shadowColor, '#24302c');
  const a = input.motion === false ? 0 : Math.PI * 2 * num(input.ringTime, num(t, 0)) / 12;
  const ga = input.motion === false || input.gridMoving === false ? 0 : Math.PI * 2 * num(t, 0) / 12;
  const intro = clamp(num(input.introProgress, 1)), split = clamp(num(input.dualSplit, .47), .35, .60), closeStart = swapped ? 1 - split : 0, modelStart = swapped ? 0 : split, modelSize = 1 - split;
  const unit = Math.min(w, h), gm = clamp(num(input.gridMotion, .14), 0, .5), grid = clamp(num(input.gridOpacity, .065), .02, .15);
  const strength = clamp(num(input.geometryStrength, 1), .5, 1.5), detail = clamp(num(input.cutStrength, .75));
  const finalCx = portrait ? w * .53 : w * (modelStart + modelSize * .52), finalCy = portrait ? h * (modelStart + modelSize * .43) : h * .445;
  const cx = w * .5 + (finalCx - w * .5) * intro + num(input.px, 0) * w * .006, cy = h * .48 + (finalCy - h * .48) * intro + num(input.py, 0) * h * .004;
  const baseRadius = portrait ? Math.min(w * .35, h * modelSize * .30) : Math.min(w * modelSize * .34, h * .22), r = baseRadius * clamp(num(input.ringScale, 1.15), .6, 2.4) * (1 + .44 * (1 - intro));

  function line(points: Point[], color: Fill, width = 1, alpha = 1, cap: CanvasLineCap = 'butt') {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = cap; ctx.lineJoin = 'round'; ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke(); ctx.restore();
  }
  function disc(x: number, y: number, rr: number, color: Fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, Math.max(.1, rr), 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function poly(points: Point[], color: Fill, alpha = 1) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function ellipse(rx: number, ry: number, rotation: number, start: number, end: number, color: Fill, width: number, alpha = 1) {
    ctx.save(); ctx.rotate(rotation); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = width;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, start, end); ctx.stroke(); ctx.restore();
  }
  function star(x: number, y: number, rr: number, color: Fill, angle = 0, alpha = 1) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    const pts: Point[] = [];
    for (let i = 0; i < 8; i++) { const b = i * Math.PI / 4, z = i % 2 ? rr * .16 : rr; pts.push([Math.cos(b) * z, Math.sin(b) * z]); }
    poly(pts, color, alpha); ctx.restore();
  }
  function cast(draw: () => void) {
    ctx.save();
    if (input.shadow !== false && num(input.shadowStrength, .8) > 0 && num(input.shadowDepth, 1) > 0) {
      const tr = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null, dpr = tr ? Math.hypot(tr.a, tr.b) || 1 : 1, depth = num(input.shadowDepth, 1);
      ctx.shadowColor = rgba(shadowColor, num(input.shadowStrength, .8) * .3);
      ctx.shadowOffsetX = unit * .009 * depth * dpr; ctx.shadowOffsetY = unit * .014 * depth * dpr;
      ctx.shadowBlur = (input.shadowStyle === 'soft' ? unit * .02 : 0) * depth * dpr;
    }
    draw(); ctx.restore();
  }
  function field() {
    if (input.grid === false || input.pattern === 'none') return;
    const kind = input.pattern || 'grid', step = Math.max(18, portrait ? w * .095 : w * .043), amp = unit * .017 * gm;
    const drift = Math.sin(ga * .55) * step * .045 * gm;
    function fade(x: number, y: number) { const dx = (x - w * .5) / w, dy = (y - h * .5) / h; return clamp(1 - Math.sqrt(dx * dx + dy * dy) * .45, .45, 1); }
    if (kind === 'ripple') {
      for (let j = 0; j < 17; j++) {
        const rr = unit * (.08 + j * .08), pts: Point[] = [];
        for (let i = 0; i <= 110; i++) { const b = i * Math.PI / 55; pts.push([cx + Math.cos(b) * rr, cy + Math.sin(b) * rr * .42 + Math.sin(b * 3 - j * .35 + ga) * amp]); }
        line(pts, ink, unit * .00075, grid * (1 - j / 19) * 1.2);
      }
      return;
    }
    if (kind === 'dots') {
      for (let j = 0, y = step * .5; y < h; y += step, j++) for (let i = 0, x = step * .5; x < w; x += step, i++) {
        const xx = x + Math.sin(j * .36 + ga) * amp * .4, yy = y + Math.sin(i * .28 + j * .31 + ga) * amp;
        disc(xx, yy, unit * .00105, ink, grid * fade(xx, yy) * (1.1 + .3 * Math.sin(i * .2 + j * .3 + ga)));
      }
      return;
    }
    const perspective = kind === 'mesh';
    for (let x = -step; x < w + step; x += step) {
      const pts: Point[] = [];
      for (let y = -step; y < h + step; y += 14) { const xx = x + Math.sin(y / h * 4 + ga) * amp + (perspective ? (x - w * .5) * Math.sin(y / h * Math.PI) * .016 : 0); pts.push([xx + drift, y]); }
      line(pts, ink, unit * .00065, grid * .68);
    }
    for (let y = -step; y < h + step; y += step) {
      const pts: Point[] = [];
      for (let x = -step; x < w + step; x += 14) pts.push([x, y + Math.sin(x / w * 4.5 + ga + .8) * amp * .75 + drift]);
      line(pts, ink, unit * .00065, grid * .68);
    }
    for (let y = 0; y < h; y += step * 2) for (let x = 0; x < w; x += step * 2) {
      const xx = x + drift + Math.sin(y / h * 4 + ga) * amp, yy = y + drift + Math.sin(x / w * 4.5 + ga + .8) * amp * .75, rr = unit * .0026;
      line([[xx - rr, yy], [xx + rr, yy]], muted, unit * .0009, grid * 1.7 * fade(x, y));
      line([[xx, yy - rr], [xx, yy + rr]], muted, unit * .0009, grid * 1.7 * fade(x, y));
    }
  }
  function rays() {
    ellipse(r * .76, r * .76, 0, 0, Math.PI * 2, accent, r * .13 * strength, dark ? .19 : .25);
    ctx.save(); ctx.rotate(a * .24);
    for (let i = 0; i < 28; i++) {
      const b = i * Math.PI / 14, major = i % 4 === 0, inner = r * (major ? .90 : 1.0), outer = r * (major ? 1.40 : 1.20);
      line([[Math.cos(b) * inner, Math.sin(b) * inner], [Math.cos(b) * outer, Math.sin(b) * outer]], major ? accent : ink, major ? r * .035 * strength : r * .008, major ? .95 : .8);
    }
    ctx.restore();
  }
  // Dual draws every geometry style itself; its signature is the ray burst.
  function geometry() {
    const kind = input.ringStyle || input.geometry || 'signature'; if (kind === 'none') return;
    if (kind === 'signature' || kind === 'rays') { rays(); return; }
    if (kind === 'orbit') {
      ellipse(r * .79, r * .79, 0, 0, Math.PI * 2, accent, r * .15, dark ? .2 : .24);
      ellipse(r * 1.22, r * .46, -.57 + Math.sin(a) * .06, 0, Math.PI * 2, ink, r * .009, .9);
      ellipse(r * 1.16, r * .49, .68 + Math.sin(a) * .05, 0, Math.PI * 2, accent, r * .037 * strength, .95);
      ctx.save(); ctx.rotate(-.57 + Math.sin(a) * .06); disc(Math.cos(a) * r * 1.22, Math.sin(a) * r * .46, r * .027, ink); ctx.restore(); return;
    }
    if (kind === 'ring') {
      ellipse(r, r, 0, 0, Math.PI * 2, accent, r * .14 * strength, .22); ellipse(r, r, 0, a - .7, a + 3.7, accent, r * .14 * strength, .97);
      ellipse(r * 1.16, r * 1.16, 0, -a + .2, -a + 2.4, ink, r * .008, .8); disc(Math.cos(-a + 2.4) * r * 1.16, Math.sin(-a + 2.4) * r * 1.16, r * .025, ink); return;
    }
    if (kind === 'slices') {
      ctx.save(); ctx.rotate(-.3 + Math.sin(a) * .12);
      for (let i = 0; i < 3; i++) ellipse(r * (1 + i * .08), r * (.70 + i * .07), 0, a * .23 + i * 2.08, a * .23 + i * 2.08 + 1.58, i === 1 ? ink : accent, r * (i === 1 ? .03 : .075) * strength, i === 2 ? .38 : .85);
      ctx.restore(); return;
    }
    if (kind === 'wave') {
      for (let i = 0; i < 5; i++) {
        const rr = r * (.69 + i * .13 + .014 * Math.sin(a + i));
        ellipse(rr, rr * (.93 + .03 * Math.sin(a + i)), Math.sin(a) * .06, a * .15 + i * .2, a * .15 + i * .2 + Math.PI * 1.75, i % 2 ? ink : accent, r * (i === 0 ? .08 : .008) * strength, i === 0 ? .28 : .43);
      }
      return;
    }
    if (kind === 'flow' || kind === 'ribbon') {
      for (let j = 0; j < 3; j++) {
        const pts: Point[] = [];
        for (let i = 0; i <= 110; i++) { const b = i * Math.PI / 55; pts.push([Math.cos(b) * r * (1.13 + .12 * Math.sin(b * 2 + a + j * .3)), Math.sin(b) * r * (.48 + .025 * j) + Math.sin(b * 3 + a) * r * .07]); }
        line(pts, j === 1 ? ink : accent, r * (j === 0 ? .045 : .009) * strength, j === 2 ? .4 : .9);
      }
      return;
    }
    if (kind === 'blocks') {
      ctx.save(); ctx.rotate(a * .12);
      for (let i = 0; i < 10; i++) {
        const b = i * Math.PI / 5;
        ctx.save(); ctx.translate(Math.cos(b) * r, Math.sin(b) * r); ctx.rotate(b + a * .08);
        const sz = r * (i % 3 === 0 ? .19 : .12) * strength;
        ctx.fillStyle = i % 3 === 0 ? accent : rgba(ink, .6); ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-sz * .5, -sz * .5, sz, sz, sz * .22); else ctx.rect(-sz * .5, -sz * .5, sz, sz);
        ctx.fill(); ctx.restore();
      }
      ctx.restore(); ellipse(r * .77, r * .77, 0, 0, Math.PI * 2, accent, r * .055, .25); return;
    }
    if (kind === 'facet' || kind === 'cut') {
      const count = kind === 'facet' ? 6 : 8;
      ctx.save(); ctx.rotate(-.24 + Math.sin(a) * .07);
      for (let i = 0; i < count; i++) {
        if (kind === 'cut' && (i === 1 || i === 5)) continue;
        const b = i * Math.PI * 2 / count, c = (i + .88) * Math.PI * 2 / count;
        line([[Math.cos(b) * r, Math.sin(b) * r], [Math.cos(c) * r, Math.sin(c) * r]], i % 3 === 0 ? ink : accent, r * (i % 3 === 0 ? .024 : .09) * strength, .9);
      }
      ctx.restore(); return;
    }
    if (kind === 'burst') {
      ctx.save(); ctx.rotate(a * .28);
      for (let i = 0; i < 17; i++) {
        const b = i * Math.PI * 2 / 17, rr = r * (i % 3 === 0 ? 1.3 : 1.12);
        poly([[Math.cos(b) * r * .91, Math.sin(b) * r * .91], [Math.cos(b + .023) * rr, Math.sin(b + .023) * rr], [Math.cos(b + .075) * r * .94, Math.sin(b + .075) * r * .94]], i % 3 === 0 ? ink : accent, i % 3 === 0 ? .8 : .92);
      }
      ctx.restore(); ellipse(r * .74, r * .74, 0, 0, Math.PI * 2, accent, r * .04, .3); return;
    }
    rays();
  }

  ctx.save(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.setLineDash([]);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
  ctx.clearRect(0, 0, w, h);
  if (!input.transparent) {
    ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
    // The close-up panel is shaded slightly, so the two panels read as a spread.
    const shade = portrait ? ctx.createLinearGradient(0, h * closeStart, 0, h * (closeStart + split)) : ctx.createLinearGradient(w * closeStart, 0, w * (closeStart + split), 0);
    shade.addColorStop(0, rgba(ink, dark ? .055 : .035)); shade.addColorStop(.30, rgba(ink, .006)); shade.addColorStop(.72, rgba(ink, 0)); shade.addColorStop(1, rgba(ink, dark ? .08 : .05));
    ctx.fillStyle = shade; ctx.fillRect(portrait ? 0 : w * closeStart, portrait ? h * closeStart : 0, portrait ? w : w * split, portrait ? h * split : h);
  }
  field();
  if (input.floor && num(input.shadowStrength, .8) > 0 && num(input.shadowDepth, 1) > 0) {
    const yy = portrait ? h * (modelStart + modelSize * .79) : h * .72, rr = Math.min(r * .83, w * .24), g = ctx.createRadialGradient(cx, yy, 0, cx, yy, rr);
    g.addColorStop(0, rgba(shadowColor, num(input.shadowStrength, .8) * (dark ? .24 : .11))); g.addColorStop(1, rgba(shadowColor, 0));
    ctx.save(); ctx.translate(0, yy); ctx.scale(1, .06); ctx.translate(0, -yy); ctx.fillStyle = g; ctx.fillRect(cx - rr, yy - rr, rr * 2, rr * 2); ctx.restore();
  }
  ctx.save(); ctx.studioIntroTransform?.({ fromX: w * .5, fromY: h * .48, toX: finalCx, toY: finalCy, scale: 1.44 });
  ctx.translate(cx, cy); ctx.globalAlpha *= clamp(num(input.geometryOpacity, 1), .3, 1); cast(geometry); ctx.restore();
  // The panel boundary, its accent stub and the optional placement guides fade in with the intro.
  const boundary = swapped ? 1 - split : split;
  ctx.save(); ctx.studioIntroOpacity?.(.24); ctx.globalAlpha *= .24 + .76 * intro;
  if (portrait) {
    line([[0, h * boundary], [w, h * boundary]], muted, unit * .0011, .47); line([[w * .44, h * boundary], [w * .57, h * boundary]], accent, unit * .007, .95);
  } else {
    line([[w * boundary, 0], [w * boundary, h]], muted, unit * .0011, .47); line([[w * boundary, h * .43], [w * boundary, h * .55]], accent, unit * .006, .95);
    line([[w * (modelStart + modelSize * .08), h * .74], [w * (modelStart + modelSize * .93), h * .74]], muted, unit * .0009, .36);
  }
  if (detail > 0) {
    const stubX = portrait ? w * .11 : w * (closeStart + split * .11), stubY = portrait ? h * (closeStart + .09) : h * .15;
    ctx.save(); ctx.translate(stubX, stubY); ctx.rotate(-.23 + Math.sin(ga) * .025); line([[-unit * .035, 0], [unit * .035, 0]], accent, unit * .018, .95, 'round'); ctx.restore();
    if (!portrait) star(w * (modelStart + modelSize * .92), h * .63, unit * .015, ink, -.2 + a * .07, detail * .9);
  }
  if (input.dualGuides) {
    const box = portrait ? [w * .07, h * (closeStart + split * .15), w * .86, h * split * .57] : [w * (closeStart + split * .08), h * .18, w * split * .84, h * .49], len = unit * .024;
    for (const [x, y, sx, sy] of [[box[0], box[1], 1, 1], [box[0] + box[2], box[1], -1, 1], [box[0], box[1] + box[3], 1, -1], [box[0] + box[2], box[1] + box[3], -1, -1]]) line([[x + sx * len, y], [x, y], [x, y + sy * len]], muted, unit * .0014, .58);
  }
  ctx.restore(); ctx.restore();
}

export const dualDesign: Design = { key: 'dual', paint: paintDual, ownsEveryGeometry: true };
