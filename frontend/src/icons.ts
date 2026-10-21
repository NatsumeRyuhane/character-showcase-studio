// The Lucide icons the studio uses, copied from lucide 1.17.0 (ISC, see vendor/LUCIDE-LICENSE.txt)
// so the page carries these few instead of the whole library. createIcon builds the same <svg>
// that lucide.createIcons({ attrs: { width: 16, height: 16 } }) produced, so the artwork is unchanged.
type IconNode = readonly (readonly [tag: 'path' | 'circle', attrs: Readonly<Record<string, string>>])[];

export const icons = {
  'arrow-left-right': [['path', { d: 'M8 3 4 7l4 4' }], ['path', { d: 'M4 7h16' }], ['path', { d: 'm16 21 4-4-4-4' }], ['path', { d: 'M20 17H4' }]],
  'scan': [['path', { d: 'M3 7V5a2 2 0 0 1 2-2h2' }], ['path', { d: 'M17 3h2a2 2 0 0 1 2 2v2' }], ['path', { d: 'M21 17v2a2 2 0 0 1-2 2h-2' }], ['path', { d: 'M7 21H5a2 2 0 0 1-2-2v-2' }]],
  'person-standing': [['circle', { cx: '12', cy: '5', r: '1' }], ['path', { d: 'm9 20 3-6 3 6' }], ['path', { d: 'm6 8 6 2 6-2' }], ['path', { d: 'M12 10v4' }]],
  'scan-face': [
    ['path', { d: 'M3 7V5a2 2 0 0 1 2-2h2' }], ['path', { d: 'M17 3h2a2 2 0 0 1 2 2v2' }], ['path', { d: 'M21 17v2a2 2 0 0 1-2 2h-2' }], ['path', { d: 'M7 21H5a2 2 0 0 1-2-2v-2' }],
    ['path', { d: 'M8 14s1.5 2 4 2 4-2 4-2' }], ['path', { d: 'M9 9h.01' }], ['path', { d: 'M15 9h.01' }],
  ],
  'layers-2': [
    ['path', { d: 'M13 13.74a2 2 0 0 1-2 0L2.5 8.87a1 1 0 0 1 0-1.74L11 2.26a2 2 0 0 1 2 0l8.5 4.87a1 1 0 0 1 0 1.74z' }],
    ['path', { d: 'm20 14.285 1.5.845a1 1 0 0 1 0 1.74L13 21.74a2 2 0 0 1-2 0l-8.5-4.87a1 1 0 0 1 0-1.74l1.5-.845' }],
  ],
  'sparkles': [
    ['path', { d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z' }],
    ['path', { d: 'M20 2v4' }], ['path', { d: 'M22 4h-4' }], ['circle', { cx: '4', cy: '20', r: '2' }],
  ],
  'orbit': [
    ['path', { d: 'M20.341 6.484A10 10 0 0 1 10.266 21.85' }], ['path', { d: 'M3.659 17.516A10 10 0 0 1 13.74 2.152' }],
    ['circle', { cx: '12', cy: '12', r: '3' }], ['circle', { cx: '19', cy: '5', r: '2' }], ['circle', { cx: '5', cy: '19', r: '2' }],
  ],
} as const satisfies Record<string, IconNode>;

export type IconName = keyof typeof icons;

/** Root attributes in Lucide's order, so serialized markup matches what it produced. */
export function iconAttributes(name: IconName): [string, string][] {
  return [
    ['xmlns', 'http://www.w3.org/2000/svg'], ['width', '16'], ['height', '16'], ['viewBox', '0 0 24 24'], ['fill', 'none'], ['stroke', 'currentColor'],
    ['stroke-width', '2'], ['stroke-linecap', 'round'], ['stroke-linejoin', 'round'], ['data-lucide', name], ['aria-hidden', 'true'], ['class', 'lucide lucide-' + name],
  ];
}

export function createIcon(name: IconName): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  for (const [key, value] of iconAttributes(name)) svg.setAttribute(key, value);
  for (const [tag, attrs] of icons[name]) {
    const child = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attrs)) child.setAttribute(key, value);
    svg.append(child);
  }
  return svg;
}

export const isIconName = (name: string): name is IconName => Object.hasOwn(icons, name);
