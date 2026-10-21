// Poster: the shared scene with sliced rings, a larger ring, warmer paper and heavy corner cuts.
// Its taglines are pushed below the skewed name block in the DOM (fitPosterCopy in studio-views.js).
import { kit } from './kit.ts';
import type { Design } from './types.ts';

const { rgba } = kit;

export const posterDesign: Design = {
  key: 'poster',
  copyBelowTitle: true,
  shared: {
    centre: [.74, .43, .40],
    lightPaper: '#edeede',
    signature: 'slices',
    cuts({ w, h, dark, accent, shift, stroke, poly }) {
      poly([[w * .79, h * 1.025], [w * 1.04, h * .64], [w * 1.07, h * .82], [w * .94, h * 1.04]], accent);
      poly([[w * .86, h * 1.03], [w * 1.04, h * .76], [w * 1.06, h * .84], [w * .94, h * 1.04]], dark ? '#eee8d9' : '#17271e');
      poly([[w * .81 + shift, -h * .05], [w * .96, -h * .02], [w * .90, h * .12]], rgba(accent, .85));
      poly([[w * .87, -h * .02], [w * .93, h * .01], [w * .91, h * .16]], dark ? '#eee8d9' : '#17271e');
      stroke([[w * .52, h * .13], [w * .555, h * .10]], accent, w * .008, .8, 'butt');
    },
  },
};
