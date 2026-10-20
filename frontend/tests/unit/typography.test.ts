import { describe, expect, it } from 'vitest';
import { studioTypographyCopy, studioTypographyLayoutChanged, studioTypographySettings, studioTypographyValue } from '../../src/typography.ts';

const plain = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const defaults = studioTypographySettings();

describe('studioTypographySettings', () => {
  it('restores old projects to the original layout', () => {
    expect(plain(studioTypographySettings(null))).toEqual(plain(defaults));
    expect(studioTypographyLayoutChanged(defaults)).toBe(false);
  });

  it('bounds every text override', () => {
    for (const key of ['name', 'character', 'author', 'caption', 'subtitle'] as const) {
      const normalized = studioTypographySettings({ [key]: { text: '\0NOVA\n名字', scale: Infinity, tracking: 99, font: 'url(evil)', weight: '900;evil', color: 'red', colorMode: 'custom', case: 'uppercase' } })[key];
      expect(normalized.text).toBe(' NOVA 名字');
      expect(normalized.scale).toBe(1);
      expect(normalized.tracking).toBe(0.25);
      expect(normalized.font).toBe('auto');
      expect(normalized.weight).toBe('auto');
      expect(normalized.color).toBe('#f3f0e5');
    }
  });

  it('round-trips through saved and standalone-output snapshots', () => {
    const settings = studioTypographySettings({ name: { text: 'Nonas', case: 'uppercase', scale: 0.8 }, copy: { character: { kicker: 'ORIGINAL CHARACTER' } } });
    expect(plain(studioTypographySettings(plain(settings)))).toEqual(plain(settings));
    expect(studioTypographyLayoutChanged(settings)).toBe(true);
  });
});

describe('text helpers', () => {
  const settings = studioTypographySettings({ name: { text: 'Nonas', case: 'uppercase' }, copy: { character: { kicker: 'ORIGINAL CHARACTER', label: 'ATELIER / 003', meta: 'some details' } } });

  it('applies letter case to the real text, with no added punctuation', () => {
    expect(studioTypographyValue(settings, 'name', 'fallback')).toBe('NONAS');
    expect(studioTypographyValue(defaults, 'name', 'NOVA')).toBe('NOVA');
    expect(studioTypographyValue(defaults, 'character', '角色')).toBe('角色');
  });

  it('falls back to the design copy when an override is empty', () => {
    expect(studioTypographyCopy(settings, 'character', 'kicker', 'old')).toBe('ORIGINAL CHARACTER');
    expect(studioTypographyCopy(settings, 'author', 'kicker', 'CREATOR')).toBe('CREATOR');
  });
});
