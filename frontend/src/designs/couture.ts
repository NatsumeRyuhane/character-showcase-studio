// Couture (the default design): a restrained art publication around a single platinum sculpture.
import { mix, rgba } from './kit.ts';
import { languageDesign } from './language.ts';
import type { Point } from './types.ts';

export const coutureDesign = languageDesign({
  key: 'couture',
  palette: { light: ['#efede8', '#252522', '#77766f'], dark: ['#17171a', '#eee9e1', '#a09b94'] },
  accent: '#c1b5a5',
  note: 'FORM / FEELING',
  backdrop({ ctx, w, h, dark, ink, accent }) {
    const wash = ctx.createLinearGradient(0, 0, w, h);
    wash.addColorStop(0, rgba(ink, dark ? .018 : .025)); wash.addColorStop(.57, rgba(accent, .02)); wash.addColorStop(1, rgba(ink, dark ? .025 : .045));
    ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);
  },
  signature({ ctx, portrait, dark, ink, muted, accent, a, sa, ca, s2, intro, r, strength, cut, line, cast }) {
    ctx.studioIntroRotation?.(-.11);
    // A single platinum sculpture. Its open ends orbit through a gently turning
    // projection while the highlight travels independently across the metal.
    // There are no floating blades or large accent-coloured metallic surfaces.
    const aperture = portrait ? .94 : 1;
    const rot = -.22 + sa * .11 - (1 - intro) * .11, rx = r * (.92 + .055 * ca) * aperture, ry = r * (1.07 + .024 * s2) * aperture;
    const start = a - 2.47, end = start + Math.PI * 1.72, steps = 150;
    const projection = (b: number) => 1 / (1 - Math.sin(b + .30) * (.065 + .022 * sa));
    function point(b: number, offset = 0): Point {
      const z = projection(b), x = Math.cos(b) * (rx + offset) * z, y = Math.sin(b) * (ry + offset) * z;
      return [x * Math.cos(rot) - y * Math.sin(rot), x * Math.sin(rot) + y * Math.cos(rot)];
    }
    function outline(offset: number, from = start, to = end) {
      const points: Point[] = [];
      for (let i = 0; i <= steps; i++) points.push(point(from + (to - from) * i / steps, offset));
      return points;
    }
    function metalShape(fill: string | CanvasGradient, dx = 0, dy = 0) {
      ctx.save(); ctx.translate(dx, dy); ctx.beginPath();
      for (let i = 0; i <= steps; i++) { const b = start + (end - start) * i / steps, p = point(b, r * .031 * strength); i ? ctx.lineTo(...p) : ctx.moveTo(...p); }
      for (let i = steps; i >= 0; i--) { const b = start + (end - start) * i / steps, p = point(b, -r * .031 * strength); ctx.lineTo(...p); }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore();
    }
    const silver = ctx.createLinearGradient(-r * (.75 + .18 * ca), -r, r * .85, r * (.72 + .18 * sa));
    for (const [stop, color] of [[0, '#646a70'], [.12, '#c1c8cc'], [.25, '#f5f7f6'], [.34, '#777f88'], [.47, '#b8c0c6'], [.53, '#eef2f3'], [.59, '#737c85'], [.73, '#e5e9ea'], [.84, '#9aa3ab'], [1, '#4a535d']] as const) silver.addColorStop(stop, color);
    cast(() => metalShape(dark ? '#616973' : '#7c858d', r * .012 * ca, r * .021));
    metalShape(silver);
    line(outline(r * .030 * strength), '#f8fbfb', r * .0027, .78);
    line(outline(-r * .030 * strength), dark ? '#49535d' : '#67727b', r * .0037, .64);
    // Short reflected streaks slide around the bevel, making slow motion visible.
    const shineStart = start + .40 + (Math.sin(a + .6) * .5 + .5) * (end - start - 1.10);
    line(outline(r * .012 * strength, shineStart, shineStart + .47), '#ffffff', r * .007, .54);
    line(outline(-r * .017 * strength, start + .10, start + .55), '#d6dfe3', r * .004, .52);
    const p0 = point(start, r * .030 * strength), p1 = point(start, -r * .030 * strength), q0 = point(end, r * .030 * strength), q1 = point(end, -r * .030 * strength);
    line([p0, p1], '#e5eaed', r * .004, .9, 'butt'); line([q0, q1], mix(accent, '#c9cdd0', .88), r * .004, .9, 'butt');
    if (cut > 0) {
      line(outline(r * .12, start + .18, end - .20), muted, r * .002, .11 * cut);
      line(outline(r * .16, start + .75, start + 1.55), ink, r * .002, .10 * cut);
    }
  },
});
