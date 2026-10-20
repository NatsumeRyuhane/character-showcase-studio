import { describe, expect, it } from 'vitest';
import { buildStudioAEFiles, studioExportName, studioOBSFiles, validateStudioAEScene } from '../../runtime/export-packages.ts';
import { studioZip, type ZipEntry } from '../../runtime/export-zip.ts';
import { buildStudioOutputDocument, type OutputDocument } from '../../runtime/studio-output-host.ts';

const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const png = 'data:image/png;base64,iVBORw0KGgo=';

/** Lists a stored ZIP's entries by walking its local file headers. */
async function unzip(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer), entries: Record<string, string> = {};
  for (let offset = 0; view.getUint32(offset, true) === 0x04034b50;) {
    const size = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true);
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength));
    entries[name] = new TextDecoder().decode(bytes.subarray(offset + 30 + nameLength, offset + 30 + nameLength + size));
    offset += 30 + nameLength + size;
  }
  return entries;
}

describe('studioZip', () => {
  it('stores UTF-8 text and binary entries', async () => {
    const files: ZipEntry[] = [{ name: 'README.txt', data: '角色 showcase' }, { name: 'assets/a.bin', data: new Uint8Array([104, 105]) }];
    const blob = studioZip(files);
    expect(blob.type).toBe('application/zip');
    expect(await unzip(blob)).toEqual({ 'README.txt': '角色 showcase', 'assets/a.bin': 'hi' });
  });

  it('refuses unsafe names and non-binary data', () => {
    for (const name of ['../escape.txt', '/absolute.txt', 'with space.txt', 'semi;colon']) expect(() => studioZip([{ name, data: 'x' }])).toThrow('Invalid export filename');
    expect(() => studioZip([{ name: 'a.txt', data: 5 as unknown as string }])).toThrow('Invalid export entry');
  });
});

describe('studioExportName', () => {
  it('keeps letters, digits, _ and -, up to 30 characters', () => {
    expect(studioExportName('NOVA / 角色 "01"')).toBe('NOVA角色01');
    expect(studioExportName('x'.repeat(40))).toHaveLength(30);
    expect(studioExportName('')).toBe('showcase');
    expect(studioExportName('<>')).toBe('showcase');
  });
});

const scene = {
  version: 1, name: 'QA </script>', design: 'poster', width: 1920, height: 1080, fps: 30, intro: 4.5, duration: 16.5, speed: 1, offset: 0,
  background: [0.1, 0.1, 0.1, 1], ink: [1, 1, 1, 1], accent: [1, 0, 0, 1], transparent: false, frame: 'horizontal', frameThickness: 60,
  layers: [{ kind: 'text', name: '角色名字', text: 'NOVA </script>', fontFamily: 'Arial', fontSize: 120, weight: 700, tracking: 0, x: 200, y: 300, w: 350, h: 130, entry: -1 }],
  geometry: [], warnings: [], motion: { enabled: true, style: 'refined', amount: 0.55, speed: 1 }, shadow: { enabled: true, color: [0, 0, 0, 1], strength: 0.5, depth: 1, soft: false },
  pattern: { kind: 'dots', opacity: 0.05, moving: true, amount: 0.15 }, edges: { top: { direction: 'negative', duration: 30 }, bottom: { direction: 'positive', duration: 40 } }, borderText: { top: 'TEST', bottom: 'TEST' },
};

describe('AE packages', () => {
  it('fills defaults for fields older exports lack', () => {
    const d = validateStudioAEScene({ scene, assets: [] });
    expect(d.showDuration).toBe(12);
    expect(d.ending.duration).toBe(0);
    expect(d.narrative).toMatchObject({ introStyle: 'title', infoDuration: 0.85 });
  });

  it('builds the import script with the scene as an inert literal', () => {
    const built = buildStudioAEFiles({ scene, assets: [{ name: 'assets/asset-001.png', data: png }] });
    const jsx = built.files.find(f => f.name === 'IMPORT_TO_AE.jsx')!.data as string;
    expect(jsx).not.toContain('</script>');
    expect(jsx).toContain('\\u003c/script>');
    expect(built.files.find(f => f.name === 'scene.json')!.data).toBe(JSON.stringify(built.scene));
    expect(built.files.find(f => f.name === 'assets/asset-001.png')!.data).toBeInstanceOf(Uint8Array);
    expect(built.files.map(f => f.name)).toEqual(expect.arrayContaining(['README.txt', 'ASSET-NOTICES.txt']));
    expect(built.filename).toBe('QAscript-AE-editable.zip');
  });

  it('rejects out-of-range values, script in numbers, bad assets and unknown sizes', () => {
    const cases: [(s: ReturnType<typeof copy<typeof scene>>) => void, RegExp][] = [
      [s => { (s as { speed: unknown }).speed = '1;alert(1)'; }, /数值/],
      [s => { s.width = 1000; }, /数值/],
      [s => { s.height = 1920; }, /画布尺寸/],
      [s => { s.fps = 24; }, /帧率/],
      [s => { s.layers[0].kind = 'script'; }, /图层类型/],
      [s => { s.background = [1, 1, 1]; }, /颜色/],
      [s => { s.edges.top.direction = 'up'; }, /边框方向/],
    ];
    for (const [change, error] of cases) {
      const bad = copy(scene);
      change(bad);
      expect(() => validateStudioAEScene({ scene: bad, assets: [] })).toThrow(error);
    }
    expect(() => validateStudioAEScene({ scene, assets: [{ name: '../x.png', data: png }] })).toThrow(/素材文件名/);
    expect(() => validateStudioAEScene({ scene, assets: [{ name: 'assets/asset-001.png', data: 'data:text/html;base64,AA==' }] })).toThrow(/素材格式/);
    expect(() => validateStudioAEScene({ scene })).toThrow(/数据不完整/);
  });
});

const frameTemplate = '<html><body><script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__</script></body></html>';
const policy = "default-src 'none'; connect-src blob: data:";
const state = { design: 'character-explorations' as const, version: 6, name: 'NOVA "1"', ratio: 'landscape', narrative: { storyPackagingOnly: false } };

describe('buildStudioOutputDocument', () => {
  it('injects the state as escaped JSON into the trusted template', () => {
    const result = buildStudioOutputDocument(frameTemplate, { state: { ...state, name: '</script><b>' }, config: { width: 3840 } }, policy);
    expect(result.config).toMatchObject({ width: 3840, height: 2160, layer: 'all', start: 'intro', fit: 'contain', obsLayers: 'combined' });
    expect(result.html).not.toContain('</script><b>');
    expect(result.html).toContain('sandbox="allow-scripts"');
    expect(result.filename).toBe('scriptb-showcase-3840x2160.html');
  });

  it('rejects foreign templates and states, oversized states and non-image data', () => {
    expect(() => buildStudioOutputDocument('<html></html>', { state }, policy)).toThrow(/模板不可用/);
    expect(() => buildStudioOutputDocument(frameTemplate, { state: { design: 'other' } }, policy)).toThrow(/无效的设计参数/);
    expect(() => buildStudioOutputDocument(frameTemplate, { state: { ...state, name: '界'.repeat(6000) } }, policy)).toThrow(/超过导出上限/);
    expect(() => buildStudioOutputDocument(frameTemplate, { state, images: { logo: 'data:text/html;base64,AA==' } }, policy)).toThrow(/素材格式/);
  });

  it('leaves out character images unless asked, and story images in packaging-only mode', () => {
    const images = { logo: png, model: png, introCharacter: png };
    const json = (html: string) => html.replaceAll('&quot;', '"');
    expect(json(buildStudioOutputDocument(frameTemplate, { state, images }, policy).html)).not.toContain('"model"');
    const all = json(buildStudioOutputDocument(frameTemplate, { state, images, config: { includeCharacters: true } }, policy).html);
    expect(all).toContain('"model"');
    expect(all).toContain('"introCharacter"');
    const packaging = { ...state, narrative: { storyPackagingOnly: true } };
    expect(json(buildStudioOutputDocument(frameTemplate, { state: packaging, images, config: { includeCharacters: true } }, policy).html)).not.toContain('"introCharacter"');
  });

  it('opens a connection only to the loopback clock of a synchronized OBS layer', () => {
    const plain = buildStudioOutputDocument(frameTemplate, { state, config: { sync: { key: 'abcdefgh12', endpoint: 'https://evil.example/' } } }, policy);
    expect(plain.config.sync).toBeUndefined();
    expect(plain.html).not.toContain("connect-src 'self'");
    const synced = buildStudioOutputDocument(frameTemplate, { state, config: { layer: 'borders', sync: { key: 'abcdefgh12', endpoint: '/__studio_clock' } } }, policy);
    expect(synced.config).toMatchObject({ layer: 'borders', transparent: true, sync: { key: 'abcdefgh12', endpoint: '/__studio_clock' } });
    expect(synced.html).toContain("connect-src 'self'");
    expect(synced.html).toContain('studioOBSLayerBootstrap');
  });
});

describe('studioOBSFiles', () => {
  const output = (config: object): OutputDocument => buildStudioOutputDocument(frameTemplate, { state, config }, policy);

  it('packs one local browser source by default', () => {
    const files = studioOBSFiles(output({}));
    expect(files.map(f => f.name)).toEqual(['output.html', 'scene-template.json', 'PREPARE-OBS.cmd', 'README.txt']);
    const collection = JSON.parse(files[1].data as string);
    expect(collection.sources[0].settings).toMatchObject({ is_local_file: true, local_file: 'output.html', width: 1920, height: 1080 });
  });

  it('packs three layers with the sync service, and refuses an incomplete set', () => {
    const result = output({ obsLayers: 'separate' });
    expect(() => studioOBSFiles(result)).toThrow(/三层输出文件不完整/);
    result.layerDocuments = { picture: 'p', effects: 'e', borders: 'b' };
    result.syncManifest = { key: 'abcdefgh12', start: 'intro', width: 1920, height: 1080, files: { picture: '01-picture.html', effects: '02-effects.html', borders: '03-borders.html' } };
    const names = studioOBSFiles(result).map(f => f.name);
    expect(names).toEqual(['output.html', '01-picture.html', '02-effects.html', '03-borders.html', 'control.html', 'OBS-LAYERS-SERVER.mjs', 'studio-sync.json', 'START-LAYERS.cmd', 'scene-template.json', 'PREPARE-OBS.cmd', 'README.txt']);
  });
});
