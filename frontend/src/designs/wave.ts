// Wave: the shared scene with layered wave rings, set lower, and light corner cuts.
import { rgba } from './kit.ts';
import type { Design } from './types.ts';

export const waveDesign: Design = {
  key: 'wave',
  shared: {
    centre: [.73, .57, .375],
    signature: 'wave',
    cuts({ w, h, accent, fg, shift, stroke, poly }) {
      poly([[w * .90, h * 1.02], [w * 1.06, h * .76], [w * 1.04, h * .94], [w * .99, h * 1.02]], accent);
      stroke([[w * .55, h * .12], [w * .61, h * .10]], accent, w * .006, .85, 'butt');
      stroke([[w * .57, h * .145], [w * .605, h * .134]], fg, w * .002, .35, 'butt');
      poly([[w * .964 + shift, h * .22], [w * .987 + shift, h * .18], [w * 1.01 + shift, h * .22]], rgba(accent, .7));
    },
  },
};
