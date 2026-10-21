// Cloud: rounded, low-pressure breathing space, with soft cloud banks at opposite edges.
import { kit } from './kit.ts';
import { languageDesign } from './language.ts';
import type { Point } from './types.ts';

const { mix } = kit;

export const cloudDesign = languageDesign({
  key: 'cloud',
  palette: { light: ['#f5f0ee', '#4b4b59', '#96909d'], dark: ['#292c36', '#f1e7ed', '#a7a3b4'] },
  accent: '#c3a7e5',
  note: 'SOFT OBJECTS, SLOW DAYS',
  backdrop({ w, h, dark, accent, cx, cy, unit, halo }) {
    halo(cx + w * .12, cy - h * .10, Math.max(w, h) * .70, accent, dark ? .065 : .09);
    halo(w * .12, h * .08, unit * .72, dark ? '#d9c5df' : '#ffffff', dark ? .016 : .43);
  },
  signature({ ctx, dark, paper, ink, muted, accent, a, sa, r, strength, cut, line, disc, ell, cast, halo }) {
    function puffy(x: number, y: number, rx: number, ry: number, color: string, alpha = 1, rot = 0) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(-rx * .28, -rx * .34, rx * .06, 0, 0, rx);
      g.addColorStop(0, mix(color, '#ffffff', dark ? .22 : .65)); g.addColorStop(.42, mix(color, paper, .18)); g.addColorStop(.83, color); g.addColorStop(1, mix(color, ink, dark ? .09 : .10));
      ctx.globalAlpha *= alpha; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); ctx.restore();
    }
    // Soft floating cloud banks inhabit opposite edges. The middle stays airy.
    const airy = mix(accent, paper, dark ? .55 : .72), cream = mix(paper, '#ffffff', dark ? .09 : .64);
    halo(0, r * .02, r * 1.30, accent, dark ? .08 : .11);
    ctx.save(); ctx.rotate(-.22 + sa * .023);
    cast(() => {
      puffy(r * .79, -r * .70, r * .44, r * .25, airy, .92, -.24);
      puffy(r * .54, -r * .93, r * .30, r * .25, cream, .96, .21);
      puffy(r * 1.02, -r * .88, r * .29, r * .23, mix(airy, cream, .45), .95, -.18);
      puffy(r * .82, -r * 1.02, r * .31, r * .27, airy, .98, .13);
    }, true);
    ctx.restore();
    ctx.save(); ctx.translate(0, sa * r * .022);
    cast(() => {
      puffy(-r * .70, r * .80, r * .45, r * .22, airy, .82, .16);
      puffy(-r * .97, r * .76, r * .25, r * .20, cream, .91, -.18);
      puffy(-r * .65, r * .63, r * .30, r * .26, mix(airy, cream, .55), .95, .20);
      puffy(-r * .40, r * .85, r * .25, r * .18, cream, .89, -.1);
    }, true);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= cut;
    ell(r * .99, r * .90, -.14, -.90, 2.30, muted, r * .0032, .22);
    ell(r * .99, r * .90, -.14, 2.65, 3.80, accent, r * .014 * strength, .32);
    // A thin drifting mist filament is less literal than another ring.
    const points: Point[] = [];
    for (let i = 0; i <= 70; i++) { const u = i / 70; points.push([r * (.52 + u * .70), r * (.32 + .055 * Math.sin(u * 7 + a))]); }
    line(points, mix(accent, ink, .1), r * .004, .34);
    puffy(r * 1.08, r * .56, r * .065, r * .052, mix(accent, cream, .36), .8, sa * .2);
    disc(-r * .97, -r * .32, r * .018, mix(accent, ink, .20), .6);
    ctx.restore();
  },
});
