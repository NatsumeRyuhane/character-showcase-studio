// Arcade: a soft arcade loop, rounded heavy lettering and one eccentric label.
import { kit } from './kit.ts';
import { urbanDesign } from './urban.ts';
import type { Point } from './types.ts';

const { mix } = kit;

export const arcadeDesign = urbanDesign({
  key: 'arcade',
  palette: { light: ['#e6f1e3', '#1b3533', '#8baa9f'], dark: ['#172a32', '#eaf3de', '#7baba5'] },
  accent: '#b8ed66',
  note: 'LITTLE REBEL. BIG PERSONALITY.',
  hello: 'HEY, ORIGINAL!',
  signature({ ctx, dark, paper, ink, accent, a, r, strength, cut, line, disc, ellipse, roundRect, cast, star }) {
    // A deliberately uneven soft-rectangle is more playful than another circle.
    const loop: Point[] = [];
    for (let i = 0; i <= 128; i++) {
      const b = i * Math.PI / 64, c = Math.cos(b), s = Math.sin(b), corner = 3.3;
      const x = Math.sign(c) * Math.pow(Math.abs(c), 2 / corner) * r * (1 + .045 * Math.sin(b * 3 + .3));
      const y = Math.sign(s) * Math.pow(Math.abs(s), 2 / corner) * r * (.94 + .035 * Math.cos(b * 3 - .7)); loop.push([x, y]);
    }
    ctx.save(); ctx.rotate(-.19 + Math.sin(a) * .045);
    cast(() => line(loop, mix(accent, ink, dark ? .04 : .13), r * .102 * strength, .94, 'round', true));
    line(loop, mix(accent, paper, .30), r * .073 * strength, .98, 'round', true);
    // A single inset pen line keeps it graphic, with no shiny plastic gradient.
    ctx.save(); ctx.scale(.933, .933); line(loop, ink, r * .0028, .22, 'round', true); ctx.restore();
    ctx.save(); ctx.translate(r * .88, -r * .69); ctx.rotate(.16);
    cast(() => roundRect(-r * .176, -r * .075, r * .352, r * .15, r * .062, ink, .97));
    roundRect(-r * .117, -r * .023, r * .15, r * .046, r * .023, paper, .95); disc(r * .088, 0, r * .023, accent, .98);
    ctx.restore();
    ctx.save(); ctx.translate(-r * .85, r * .74); ctx.rotate(-.24);
    cast(() => roundRect(-r * .127, -r * .092, r * .254, r * .184, r * .059, mix(paper, ink, dark ? .88 : .91), .96));
    disc(-r * .045, -r * .006, r * .018, paper, .9); disc(r * .045, -r * .006, r * .018, paper, .9);
    line([[-r * .043, r * .045], [0, r * .060], [r * .043, r * .045]], accent, r * .008, .88, 'round');
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.globalAlpha *= cut;
    star(-r * 1.10, -r * .66, r * .098, -.20 + a, accent, .92);
    star(r * 1.11, r * .73, r * .064, .18 - a, ink, .70);
    ctx.save(); ctx.translate(-r * .64, -r * 1.11); ctx.rotate(-.18); roundRect(-r * .116, -r * .022, r * .232, r * .044, r * .022, ink, .43); ctx.restore();
    disc(r * 1.11, -r * .42, r * .033, accent, .88); disc(r * 1.19, -r * .30, r * .014, ink, .36);
    ellipse(r * .09, r * .04, -.23, 0, Math.PI * 2, ink, r * .004, .35, r * .81, r * 1.14);
    ctx.restore();
  },
  crop({ ctx, w, h, ink, accent, unit, roundRect, cast, star }) {
    ctx.save(); ctx.translate(w * .99, h * .075); ctx.rotate(-.29);
    cast(() => roundRect(-unit * .075, -unit * .048, unit * .15, unit * .096, unit * .038, accent, .80));
    ctx.restore();
    star(w * .93, h * .94, unit * .025, .12, ink, .40);
  },
});
