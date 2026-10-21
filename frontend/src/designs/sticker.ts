// Sticker: paper tabs, paper-cut modules and torn strips, deliberately graphic.
import { mix } from './kit.ts';
import { languageDesign } from './language.ts';

export const stickerDesign = languageDesign({
  key: 'sticker',
  palette: { light: ['#f2efdf', '#353936', '#8c9182'], dark: ['#25282d', '#f8efdb', '#b4ae9e'] },
  accent: '#f7bf4f',
  note: 'HELLO, LITTLE ORIGINAL',
  signature({ ctx, dark, paper, ink, accent, a, sa, r, strength, cut, line, poly, disc, ell, ringBand, roundedPath, cast }) {
    function paperLoop(x: number, y: number, rx: number, ry: number, thickness: number, rotation: number, color: string) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(rotation);
      cast(() => ringBand(rx, ry, 0, 0, Math.PI * 2, thickness, color));
      ell(rx - thickness * .08, ry - thickness * .08, 0, -2.75, -.68, mix(color, '#ffffff', .45), r * .003, .80);
      ctx.restore();
    }
    // Paper-cut modules and torn strips: compact clusters, broad intervening space.
    const warm = dark ? '#f1e7cc' : '#fffced', contrast = mix(ink, paper, dark ? .05 : .12), second = dark ? '#a8c8be' : '#b4cec2';
    const elastic = Math.sin(a) * .026 + Math.sin(2 * a) * .006;
    paperLoop(r * .16, r * .18, r * 1.03, r * .89, r * .053 * strength, -.30 + elastic, accent);
    ctx.save(); ctx.globalAlpha *= cut;
    ctx.save(); ctx.translate(r * .94, -r * .78); ctx.rotate(.28 + elastic);
    cast(() => {
      poly([[-r * .26, -r * .13], [r * .24, -r * .17], [r * .28, r * .10], [-r * .27, r * .16]], warm);
      poly([[-r * .23, -r * .13], [r * .16, -r * .15], [r * .12, -r * .09], [-r * .22, -r * .06]], mix(accent, warm, .37), .9);
    });
    line([[-r * .17, r * .01], [r * .12, -r * .025]], contrast, r * .015, .7, 'butt'); ctx.restore();
    ctx.save(); ctx.translate(-r * .82, r * .69 + sa * r * .018); ctx.rotate(-.24);
    cast(() => {
      roundedPath(-r * .21, -r * .17, r * .42, r * .34, r * .075); ctx.fillStyle = second; ctx.fill();
      // A bite-shaped cutout is material geometry, not a pictogram.
      disc(r * .21, -r * .17, r * .072, paper);
    });
    ctx.restore();
    paperLoop(-r * .97, -r * .51, r * .102, r * .102, r * .029, .20, warm);
    ctx.save(); ctx.translate(r * 1.02, r * .87); ctx.rotate(-.37 + sa * .04);
    cast(() => poly([[-r * .16, -r * .06], [r * .15, -r * .06], [r * .11, r * .09], [r * .055, r * .07], [r * .02, r * .10], [-r * .035, r * .072], [-r * .075, r * .10], [-r * .14, r * .07]], contrast));
    ctx.restore();
    poly([[r * .61, -r * 1.11], [r * .66, -r * .99], [r * .78, -r * 1.02], [r * .70, -r * .92], [r * .75, -r * .81], [r * .62, -r * .85], [r * .54, -r * .75], [r * .53, -r * .89], [r * .40, -r * .93], [r * .53, -r * .99]], accent, .82);
    for (let i = 0; i < 3; i++) disc(-r * .67 + i * r * .054, r * 1.04, r * .012, contrast, .55);
    ctx.restore();
  },
});
