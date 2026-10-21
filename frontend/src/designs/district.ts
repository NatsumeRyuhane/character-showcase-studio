// District: a utility dial, with a condensed italic wordmark, a cut underline and a compact folio.
import { kit } from './kit.ts';
import { urbanDesign } from './urban.ts';

const { mix } = kit;

export const districtDesign = urbanDesign({
  key: 'district',
  palette: { light: ['#efefdf', '#20271e', '#8b947f'], dark: ['#191c19', '#f0f0df', '#8c9986'] },
  accent: '#d4fa32',
  note: 'OWN YOUR FREQUENCY',
  hello: 'CHARACTER / SELECT',
  signature({ ctx, dark, paper, ink, muted, accent, a, r, strength, cut, line, poly, ellipse, band, roundRect, cast }) {
    // Coarse, asymmetric dial sectors make a strong silhouette without a starburst.
    const sectors = [[-2.92, -2.05], [-1.92, -1.29], [-1.19, .32], [.43, 1.49], [1.65, 2.33], [2.45, 3.18]];
    ctx.save(); ctx.rotate(a - .24);
    cast(() => sectors.forEach(([from, to], i) => band(r * 1.035, r * 1.035, from, to, r * (i === 2 ? .112 : .066) * strength, i === 2 ? accent : mix(ink, paper, dark ? .08 : .05), i === 4 ? .35 : .88)));
    ellipse(r * .887, r * .887, 0, -2.89, 2.90, muted, r * .003, .34);
    ellipse(r * 1.088, r * 1.088, 0, -2.02, .37, accent, r * .006, .72);
    ellipse(r * 1.088, r * 1.088, 0, .57, 2.21, ink, r * .002, .22);
    for (let i = 0; i < 12; i++) {
      const b = -1.15 + i * .104, c = Math.cos(b), s = Math.sin(b), ri = r * 1.14, ro = r * (i % 3 === 0 ? 1.205 : 1.175);
      line([[c * ri, s * ri], [c * ro, s * ro]], i % 3 === 0 ? accent : ink, r * (i % 3 === 0 ? .007 : .003), i % 3 === 0 ? .9 : .38);
    }
    ctx.save(); ctx.rotate(-2.29);
    roundRect(r * .952, -r * .046, r * .208, r * .092, r * .012, ink, .91);
    line([[r * .995, -r * .014], [r * 1.11, -r * .014]], paper, r * .007, .85); line([[r * .995, r * .017], [r * 1.06, r * .017]], paper, r * .005, .5);
    ctx.restore();
    ctx.save(); ctx.rotate(.81); poly([[r * .99, -r * .051], [r * 1.145, -r * .051], [r * 1.18, 0], [r * 1.145, r * .051], [r * .99, r * .051]], accent, .95); ctx.restore();
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= cut;
    // These stationary brackets anchor the rotating mechanism, like a dial housing.
    line([[-r * 1.17, -r * .30], [-r * 1.17, -r * .50], [-r * 1.04, -r * .50]], ink, r * .007, .63);
    line([[r * 1.05, r * .73], [r * 1.19, r * .73], [r * 1.19, r * .53]], accent, r * .010, .91);
    for (let i = 0; i < 3; i++) poly([[r * (.84 + i * .062), -r * 1.10], [r * (.875 + i * .062), -r * 1.10], [r * (.84 + i * .062), -r * 1.03], [r * (.805 + i * .062), -r * 1.03]], ink, .36);
    ctx.restore();
  },
  crop({ w, h, ink, accent, unit, line, poly }) {
    poly([[w * .88, -h * .02], [w * 1.02, -h * .02], [w * 1.02, h * .095], [w * .96, h * .095]], accent, .88);
    line([[w * .89, h * .97], [w * 1.01, h * .85]], ink, unit * .014, .28);
    line([[w * .92, h * 1.01], [w * 1.03, h * .90]], accent, unit * .018, .80);
  },
});
