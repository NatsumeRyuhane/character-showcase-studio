// Tuner: an after-hours signal orbit, with a horizontal, tactile typographic hierarchy.
import { kit } from './kit.ts';
import { urbanDesign } from './urban.ts';

const { mix } = kit;

export const tunerDesign = urbanDesign({
  key: 'tuner',
  palette: { light: ['#f2eadc', '#292722', '#a69b86'], dark: ['#1a1918', '#f6e8cf', '#a49a87'] },
  accent: '#ff7a3d',
  signature({ ctx, dark, paper, ink, muted, accent, a, r, strength, cut, line, disc, ellipse, band, roundRect, cast }) {
    // A wide tape orbit, with narrow rail lines instead of a heavy round dial.
    const tilt = -.34, cream = mix(ink, paper, dark ? .06 : .02);
    ctx.save(); ctx.rotate(tilt);
    cast(() => band(r * 1.22, r * .79, -2.99, 2.61, r * .040 * strength, cream, .86));
    ellipse(r * 1.27, r * .835, 0, -2.99, 2.61, muted, r * .0025, .40);
    ellipse(r * 1.155, r * .724, 0, -2.95, 2.56, ink, r * .0023, .38);
    // The accent is a short signal sweep moving steadily along the fixed rails.
    ctx.save(); ctx.scale(1, .79 / 1.22); ctx.rotate(a); band(r * 1.22, r * 1.22, -.58, .12, r * .052 * strength, accent, .98); ctx.restore();
    ctx.save(); ctx.scale(1, .79 / 1.22); ctx.rotate(-a); ellipse(r * 1.28, r * 1.28, 0, 1.84, 2.18, accent, r * .008, .72); ctx.restore();
    ctx.save(); ctx.translate(-r * 1.123, -r * .258); ctx.rotate(-.96);
    cast(() => roundRect(-r * .153, -r * .065, r * .306, r * .13, r * .025, accent));
    for (let i = 0; i < 4; i++) line([[-r * .104 + i * r * .063, -r * .028], [-r * .104 + i * r * .063, r * .028]], paper, r * .010, .8);
    ctx.restore();
    ctx.save(); ctx.translate(r * .927, r * .532); ctx.rotate(-.78);
    roundRect(-r * .129, -r * .045, r * .258, r * .09, r * .012, cream, .9); line([[-r * .079, 0], [r * .079, 0]], paper, r * .009, .84);
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= cut;
    // An offset fine orbit makes a second unmistakable ellipse, never a frame box.
    ellipse(r * 1.02, r * .94, .40, -1.19, 2.04, muted, r * .0028, .37, r * .052, -r * .045);
    ellipse(r * 1.02, r * .94, .40, 2.20, 3.59, accent, r * .004, .48, r * .052, -r * .045);
    const bx = r * .052, by = -r * .045, b = a + .38, cc = Math.cos(.40), ss = Math.sin(.40), xx = Math.cos(b) * r * 1.02, yy = Math.sin(b) * r * .94;
    disc(bx + xx * cc - yy * ss, by + xx * ss + yy * cc, r * .018, accent, .95);
    for (let i = 0; i < 5; i++) line([[r * (.80 + i * .062), -r * .93], [r * (.83 + i * .062), -r * .985]], i === 0 ? accent : ink, r * .005, i === 0 ? .95 : .40);
    line([[-r * 1.22, r * .68], [-r * .91, r * .68]], ink, r * .004, .34);
    disc(-r * 1.28, r * .68, r * .015, accent, .83);
    ctx.restore();
  },
  crop({ w, h, ink, accent, unit, line, poly }) {
    for (let i = 0; i < 4; i++) line([[w * (.88 + i * .033), -h * .01], [w * (.93 + i * .033), h * .06]], i === 0 ? accent : ink, unit * .012, i === 0 ? .72 : .16);
    poly([[w * .84, h * 1.01], [w * 1.01, h * .90], [w * 1.01, h * 1.01]], accent, .15);
  },
});
