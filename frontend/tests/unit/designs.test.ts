import { describe, expect, it } from 'vitest';
import { designFamilies } from '../../src/designs/catalog.ts';
import { designPalette, designs } from '../../src/designs/index.ts';
import { designKeys, languageKeys } from '../../src/studio-state.ts';

describe('design registry', () => {
  it('has one module per design key, under its own key', () => {
    expect(Object.keys(designs).sort()).toEqual([...designKeys].sort());
    for (const [key, design] of Object.entries(designs)) expect(design.key).toBe(key);
  });

  it('gives palettes to the language and urban designs only', () => {
    for (const key of designKeys) {
      for (const dark of [false, true]) {
        const palette = designPalette(key, dark);
        if (languageKeys.includes(key)) expect(palette).toEqual({ paper: expect.stringMatching(/^#[0-9a-f]{6}$/), ink: expect.stringMatching(/^#[0-9a-f]{6}$/), muted: expect.stringMatching(/^#[0-9a-f]{6}$/) });
        else expect(palette).toBeNull();
      }
      if (languageKeys.includes(key)) expect(designPalette(key, true)).not.toEqual(designPalette(key, false));
    }
    expect(designPalette('constructor', false)).toBeNull();
  });

  it('matches each design module to its family in the catalog', () => {
    for (const key of designKeys) {
      const design = designs[key], family = designFamilies[key];
      expect(typeof design.palette === 'function').toBe(family === 'language' || family === 'urban');
      expect(typeof design.paint === 'function').toBe(family !== 'shared');
      expect(!!design.ownsEveryGeometry).toBe(family === 'dual');
      if (design.paint) expect(design.shared).toBeUndefined();
    }
    expect(languageKeys).toEqual(designKeys.filter(key => ['language', 'urban'].includes(designFamilies[key])));
  });
});
