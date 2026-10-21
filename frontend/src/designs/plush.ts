// Plush: a quiet craft label and a bouclé cord cushion outline, densely textured at its edge.
import { kit } from './kit.ts';
import { languageDesign } from './language.ts';
import type { Point } from './types.ts';

const { mix } = kit;

function squirclePoint(b: number, radius: number, power = 3.8): Point {
  const c = Math.cos(b), s = Math.sin(b);
  return [Math.sign(c) * Math.pow(Math.abs(c), 2 / power) * radius, Math.sign(s) * Math.pow(Math.abs(s), 2 / power) * radius];
}

export const plushDesign = languageDesign({
  key: 'plush',
  palette: { light: ['#f1e9dc', '#514a40', '#9c8f7d'], dark: ['#302b29', '#eee4d3', '#b5a593'] },
  accent: '#d8a183',
  backdrop({ w, h, dark, accent, cx, cy, halo }) {
    halo(cx, cy, Math.max(w, h) * .65, accent, dark ? .045 : .06);
  },
  signature({ ctx, dark, paper, ink, accent, sa, ca, r, strength, opacity, cut, line, roundRect, cast }) {
    // A bouclé cord cushion outline: densely textured at its edge, empty inside.
    const thread = mix(accent, paper, dark ? .25 : .15), light = mix(thread, '#fff8e6', .55), deep = mix(thread, ink, .27), angle = -.095 + sa * .017;
    const path: Point[] = [], radius = r * .89;
    for (let i = 0; i <= 180; i++) { const p = squirclePoint(i * Math.PI / 90, radius); path.push([p[0], p[1] * 1.09]); }
    ctx.save(); ctx.rotate(angle);
    cast(() => line(path, deep, r * .110 * strength, .87), true);
    line(path, thread, r * .092 * strength, .98); line(path, light, r * .050 * strength, .17);
    // Bouclé is the material itself, so it remains when optional decoration is zero.
    // Arc-length spacing avoids bald areas on the squircle's almost-flat sides.
    const lengths = [0];
    for (let i = 1; i < path.length; i++) lengths.push(lengths[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    const perimeter = lengths[lengths.length - 1], count = Math.max(230, Math.min(390, Math.round(perimeter / (r * .021))));
    ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = Math.max(.42, r * .0032);
    for (let row = 0; row < 4; row++) {
      let segment = 1;
      for (let i = 0; i < count; i++) {
        const distance = ((i + (row % 2) * .5) / count) * perimeter;
        while (segment < lengths.length - 1 && lengths[segment] < distance) segment++;
        const first = path[segment - 1], second = path[segment], span = lengths[segment] - lengths[segment - 1], u = span ? (distance - lengths[segment - 1]) / span : 0;
        const tx = (second[0] - first[0]) / span, ty = (second[1] - first[1]) / span, nx = -ty, ny = tx;
        const seed = i * 2.399 + row * 1.731, jitter = Math.sin(seed) * r * .0035, offset = ((row - 1.5) * .0265 * strength) * r + jitter;
        const xx = first[0] + (second[0] - first[0]) * u + nx * offset + tx * Math.cos(seed * 1.3) * r * .003;
        const yy = first[1] + (second[1] - first[1]) * u + ny * offset + ty * Math.cos(seed * 1.3) * r * .003;
        const rotation = Math.atan2(ty, tx) + Math.sin(seed) * .65;
        const coil = r * (.0092 + .0025 * Math.sin(seed * .7));
        ctx.beginPath(); ctx.ellipse(xx, yy, coil, coil * (.53 + .12 * Math.cos(seed)), rotation, .15, Math.PI * 1.88);
        ctx.strokeStyle = i % 4 === 0 ? mix(deep, thread, .18) : i % 3 === 0 ? mix(light, thread, .20) : mix(light, deep, .43);
        ctx.globalAlpha = opacity * (i % 4 === 0 ? .57 : .78); ctx.stroke();
        // Short edge flyaways break the silicone-like contour, staying on the cord.
        if ((row === 0 || row === 3) && i % 2 === 0) {
          const direction = row === 0 ? -1 : 1, edge = direction * r * .049 * strength;
          const ex = first[0] + (second[0] - first[0]) * u + nx * edge, ey = first[1] + (second[1] - first[1]) * u + ny * edge;
          ctx.beginPath(); ctx.moveTo(ex - tx * r * .004, ey - ty * r * .004);
          ctx.quadraticCurveTo(ex + nx * direction * r * .008, ey + ny * direction * r * .008, ex + tx * r * .006 + nx * direction * r * .005, ey + ty * r * .006 + ny * direction * r * .005);
          ctx.strokeStyle = i % 3 === 0 ? light : thread; ctx.globalAlpha = opacity * .70; ctx.lineWidth = Math.max(.35, r * .0026); ctx.stroke(); ctx.lineWidth = Math.max(.42, r * .0032);
        }
      }
    }
    ctx.restore();
    // One stitched seam on one side, not a symmetrical upholstered frame.
    ctx.save(); ctx.globalAlpha *= cut;
    const seam: Point[] = [];
    for (let i = 0; i <= 55; i++) { const b = -1.43 + i / 55 * 1.35, p = squirclePoint(b, radius - r * .032); seam.push([p[0], p[1] * 1.09]); }
    ctx.save(); ctx.setLineDash([r * .017, r * .022]); line(seam, ink, r * .0028, .18); ctx.restore();
    ctx.restore(); ctx.restore();
    // The loose yarn makes this language more tactile than the airy Cloud set.
    ctx.save(); ctx.globalAlpha *= cut;
    ctx.save(); ctx.strokeStyle = deep; ctx.lineWidth = r * .006; ctx.globalAlpha *= .62; ctx.lineCap = 'round'; ctx.beginPath();
    ctx.moveTo(-r * .87, r * .51); ctx.bezierCurveTo(-r * 1.27, r * .55, -r * 1.30, r * .97, -r * .96, r * 1.02);
    ctx.bezierCurveTo(-r * .66, r * 1.07, -r * .55, r * 1.24, -r * .82, r * 1.22);
    ctx.bezierCurveTo(-r * 1.06, r * 1.22, -r * 1.06, r * 1.06, -r * .94, r * 1.11 + sa * r * .016); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(r * .93, -r * .83 + ca * r * .015); ctx.rotate(.24);
    cast(() => roundRect(-r * .13, -r * .09, r * .26, r * .18, r * .075, mix(thread, paper, .12)), true);
    line([[-r * .065, -r * .027], [r * .065, -r * .027]], ink, r * .003, .22); line([[-r * .065, r * .021], [r * .025, r * .021]], ink, r * .003, .22); ctx.restore();
    ctx.restore();
  },
});
