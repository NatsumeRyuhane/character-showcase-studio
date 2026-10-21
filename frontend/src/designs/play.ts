// Play: a small friendly identity around an oversized, cropped toy arc.
import { kit } from './kit.ts';
import { languageDesign } from './language.ts';

const { mix } = kit;

export const playDesign = languageDesign({
  key: 'play',
  palette: { light: ['#f4f3e8', '#263c3c', '#819b91'], dark: ['#202c32', '#f5f0dd', '#98b0ac'] },
  accent: '#8bc9a4',
  note: 'SMALL SHAPE, BIG JOY',
  signature({ ctx, dark, paper, ink, accent, a, sa, r, strength, cut, disc, ell, ringBand, roundRect, cast }) {
    // An oversized cropped toy arc is distinct from Plush's cushion and Sticker's paper loop.
    const mint = mix(accent, paper, dark ? .06 : .08), peach = dark ? '#d6a590' : '#e6bda5', cream = dark ? '#e4e0c8' : '#fffdf0';
    const tilt = -.12 + sa * .025;
    ctx.save(); ctx.translate(r * .20, -r * .06); ctx.rotate(tilt);
    cast(() => ringBand(r * 1.06, r * 1.06, 0, -2.80, 1.84, r * .145 * strength, mint, .91));
    ell(r * 1.055, r * 1.055, 0, -2.76, -.34, mix(mint, cream, .30), r * .008, .6);
    // A subtly darker rim supplies puck-like thickness while its centre remains open.
    ell(r * (1.06 - .145 * strength), r * (1.06 - .145 * strength), 0, -.28, 1.82, mix(mint, ink, .14), r * .012, .46);
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= cut;
    ctx.save(); ctx.translate(r * .87, r * .78 + Math.sin(a) * r * .04); ctx.rotate(-.28 + sa * .04);
    cast(() => {
      roundRect(-r * .22, -r * .18, r * .44, r * .36, r * .13, peach);
      roundRect(-r * .22, -r * .18, r * .44, r * .26, r * .115, mix(peach, cream, .27));
    });
    ctx.restore();
    cast(() => disc(-r * .94, -r * .69, r * .133, cream));
    disc(-r * .94, -r * .69, r * .060, accent, .83);
    disc(r * .98, -r * .96, r * .041, peach, .95); disc(r * 1.12, -r * .78, r * .023, ink, .7);
    ctx.save(); ctx.translate(-r * .88, r * .85); ctx.rotate(.18); roundRect(-r * .14, -r * .027, r * .28, r * .054, r * .025, ink, .75); ctx.restore();
    ell(r * .14, r * .055, -.2, 0, Math.PI * 2, ink, r * .005, .18, r * .86, r * 1.10);
    ctx.restore();
  },
});
