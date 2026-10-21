// Brutalist: architectural cuts, a broken angular frame and a single tall condensed shout.
import { mix } from './kit.ts';
import { languageDesign } from './language.ts';
import type { Point } from './types.ts';

export const brutalistDesign = languageDesign({
  key: 'brutalist',
  palette: { light: ['#e9eae3', '#20241f', '#767d72'], dark: ['#151719', '#f1f0e7', '#969b95'] },
  accent: '#ddfb4b',
  note: 'OBJECT IN MOTION',
  signature({ ctx, dark, paper, ink, accent, sa, r, strength, cut, line, poly, cast }) {
    // A genuinely angular, broken architectural frame with a generous void.
    const lean = .08 + cut * .14 + sa * .012;
    const vertices: Point[] = [[-r * .91, -r * .95], [r * .83, -r * 1.18], [r * 1.23, r * .67], [r * .22, r * 1.15], [-r * .96, r * .69]];
    const inner: Point[] = [[-r * .77, -r * .81], [r * .67, -r * .99], [r * 1.02, r * .56], [r * .18, r * .94], [-r * .76, r * .58]];
    ctx.save(); ctx.transform(1, 0, -lean, 1, 0, 0);
    cast(() => {
      ctx.beginPath(); vertices.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath();
      inner.slice().reverse().forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p))); ctx.closePath();
      ctx.fillStyle = mix(ink, paper, dark ? .09 : .20); ctx.fill('evenodd');
    });
    poly([[r * .68, -r * 1.00], [r * .83, -r * 1.18], [r * 1.23, r * .67], [r * 1.025, r * .56]], accent, .97);
    poly([[-r * .91, -r * .95], [-r * .77, -r * .81], [r * .67, -r * .99], [r * .83, -r * 1.18]], mix(accent, paper, .40), .88);
    // Missing corners and a transverse slice create rhythm without filling the centre.
    poly([[-r * 1.08, -r * .36], [-r * .73, -r * .47], [-r * .68, -r * .28], [-r * 1.02, -r * .16]], paper);
    poly([[r * .14, r * .96], [r * .42, r * .87], [r * .47, r * 1.20], [r * .19, r * 1.28]], paper);
    line([[-r * 1.10, r * .86], [-r * .77, r * .75]], accent, r * .049 * strength, .95, 'butt');
    line([[r * .77, -r * 1.28], [r * 1.02, -r * 1.31]], ink, r * .008, .45, 'butt'); ctx.restore();
    for (let i = 0; i < 7; i++) line([[r * (1.10 + i * .035), -r * .30], [r * (1.15 + i * .035), -r * .20]], ink, r * .007, .14, 'butt');
    poly([[-r * 1.13, r * .34], [-r * .96, r * .29], [-r * 1.06, r * .49]], accent, .9);
  },
  // Two assertive edge accents belong to the fashion print, never the model.
  accents({ ctx, w, h, portrait, swapped, ink, accent, sa, unit, opacity, cut, poly, cast }) {
    if (!(cut > .05)) return;
    ctx.save();
    if (swapped && !portrait) { ctx.translate(w, 0); ctx.scale(-1, 1); }
    const offset = sa * unit * .003;
    cast(() => poly([[w * .92, h * 1.01], [w * 1.01, h * (.75 - .10 * cut) + offset], [w * 1.01, h * 1.01]], accent, .74 * opacity));
    poly([[w * .54, -h * .01], [w * (.64 + .05 * cut), -h * .01], [w * .60, h * .045]], ink, .22 * opacity);
    ctx.restore();
  },
});
