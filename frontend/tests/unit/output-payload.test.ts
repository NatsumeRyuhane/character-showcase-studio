import { describe, expect, it } from 'vitest';
import { createDefaultVariants, createStudioState } from '../../src/studio-state.ts';
import { decodeStudioVariants } from '../../src/variant-codec.ts';
import { studioOutputConfig, studioOutputDimensions, studioOutputPayload, type StudioImages } from '../../src/output-payload.ts';

const png = 'data:image/png;base64,iVBORw0KGgo=';
const images = (): StudioImages => ({ qr: png, barcode: png, logo: png, model: png, portrait: png, introCharacter: png, introAuthor: png });

describe('studioOutputDimensions', () => {
  it('doubles the logical size for 4K and follows the ratio', () => {
    const state = createStudioState();
    expect(studioOutputDimensions(state)).toEqual([1920, 1080]);
    state.ratio = 'portrait';
    state.output.resolution = '2160';
    expect(studioOutputDimensions(state)).toEqual([2160, 3840]);
  });
});

describe('studioOutputConfig', () => {
  it('always plays standalone HTML from the intro, in one source', () => {
    const state = createStudioState();
    Object.assign(state.output, { start: 'show', obsLayers: 'separate', transparent: true });
    expect(studioOutputConfig(state, 'html')).toMatchObject({ start: 'intro', obsLayers: 'combined', playback: 'complete', transparent: true });
    const obs = studioOutputConfig(state, 'obs');
    expect(obs).toMatchObject({ start: 'show', obsLayers: 'separate' });
    expect(obs).not.toHaveProperty('playback');
  });
});

describe('studioOutputPayload', () => {
  it('leaves character pictures out unless the user opted in', () => {
    const state = createStudioState();
    expect(Object.keys(studioOutputPayload(state, images(), 'obs').images).sort()).toEqual(['barcode', 'logo', 'qr']);
    state.output.includeCharacters = true;
    expect(Object.keys(studioOutputPayload(state, images(), 'obs').images).sort()).toEqual(['barcode', 'introAuthor', 'introCharacter', 'logo', 'model', 'portrait', 'qr']);
    state.narrative.storyPackagingOnly = true;
    expect(Object.keys(studioOutputPayload(state, images(), 'obs').images).sort()).toEqual(['barcode', 'logo', 'model', 'portrait', 'qr']);
  });

  it('skips empty images', () => {
    const state = createStudioState();
    expect(studioOutputPayload(state, { ...images(), qr: '', logo: '' }, 'html').images).toEqual({ barcode: png });
  });

  it('sends the state in tuple-v1 form without touching the editor state', () => {
    const state = createStudioState();
    state.output.obsLayers = 'separate';
    const payload = studioOutputPayload(state, images(), 'html');
    expect(payload.kind).toBe('html');
    expect(payload.state.variantEncoding).toBe('tuple-v1');
    expect(payload.state.output.obsLayers).toBe('combined');
    expect(decodeStudioVariants(payload.state.variants, createDefaultVariants())).toEqual(state.variants);
    expect(state.output.obsLayers).toBe('separate');
    expect(state).not.toHaveProperty('variantEncoding');
  });
});
