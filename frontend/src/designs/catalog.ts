// The 13 designs and the family each belongs to: the one list that the state defaults, the
// design picker and the design registry (index.ts) all follow. Key order is the designs' order.
//   language  own palette and painter, built with languageDesign (language.ts)
//   urban     own palette and painter, built with urbanDesign (urban.ts)
//   dual      own painter for every geometry (dual.ts)
//   shared    drawn by the shared scene (shared-scene.ts)
export type DesignFamily = 'language' | 'urban' | 'dual' | 'shared';

export const designFamilies = {
  couture: 'language',
  brutalist: 'language',
  cloud: 'language',
  plush: 'language',
  play: 'language',
  sticker: 'language',
  orbit: 'shared',
  poster: 'shared',
  wave: 'shared',
  dual: 'dual',
  district: 'urban',
  tuner: 'urban',
  arcade: 'urban',
} as const satisfies Record<string, DesignFamily>;
