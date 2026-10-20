import { buildStudioAEFiles, studioOBSFiles, type AEPayload } from './export-packages.ts';
import { studioDownload, studioZip } from './export-zip.ts';
import { studioOBSLayerBootstrap } from './obs-layer-host.ts';

// Only data crosses the sandbox. Exported markup always comes from our own build.

export type OutputLayer = 'all' | 'picture' | 'effects' | 'borders';
export interface OutputConfig {
  enabled: true;
  width: number;
  height: number;
  transparent: boolean;
  includeCharacters: boolean;
  start: 'intro' | 'show';
  fit: 'contain' | 'cover';
  layer: OutputLayer;
  obsLayers: 'combined' | 'separate';
  playback?: 'complete';
  sync?: { key: string; endpoint: '/__studio_clock' };
}
export interface SyncManifest {
  key: string;
  start: OutputConfig['start'];
  width: number;
  height: number;
  files: Record<Exclude<OutputLayer, 'all'>, string>;
}
export interface OutputDocument {
  html: string;
  filename: string;
  config: OutputConfig;
  /** For a three-layer OBS package: one document per layer. */
  layerDocuments?: Record<Exclude<OutputLayer, 'all'>, string>;
  syncManifest?: SyncManifest;
}
/** What the frame sends for an HTML or OBS export: the saved state, output options and session images. */
export interface OutputPayload {
  kind?: 'html' | 'obs';
  state: { design: 'character-explorations'; [key: string]: unknown };
  config?: { [key: string]: unknown };
  images?: { [key: string]: unknown };
}
type Untrusted = { [key: string]: any };

/**
 * Builds a standalone output page: the trusted frame template with the validated
 * state, options and images injected as JSON. Throws on anything invalid.
 */
export function buildStudioOutputDocument(frameTemplate: unknown, payload: unknown, policy: string): OutputDocument {
  if (typeof frameTemplate !== 'string' || !frameTemplate.includes('__CODEX_VISUALIZATION_WIDGET_STATE__')) throw new Error('输出模板不可用，请重新打开本地工作台。');
  const input = payload as Untrusted | null | undefined;
  if (!input || typeof input !== 'object' || !input.state || input.state.design !== 'character-explorations') throw new Error('无效的设计参数。');
  const serialized = JSON.stringify(input.state);
  if (new TextEncoder().encode(serialized).length > 16384) throw new Error('设计参数超过导出上限。');
  const state: Untrusted = JSON.parse(serialized), source: Untrusted = input.config || {}, portrait = state.ratio === 'portrait';
  const scale = source.width === (portrait ? 2160 : 3840) ? 2 : 1;
  const layer: OutputLayer = ['picture', 'effects', 'borders'].includes(source.layer) ? source.layer : 'all';
  const config: OutputConfig = {
    enabled: true, width: (portrait ? 1080 : 1920) * scale, height: (portrait ? 1920 : 1080) * scale,
    transparent: ['effects', 'borders'].includes(layer) || source.transparent === true, includeCharacters: source.includeCharacters === true,
    start: source.start === 'show' ? 'show' : 'intro', fit: source.fit === 'cover' ? 'cover' : 'contain', layer, obsLayers: source.obsLayers === 'separate' ? 'separate' : 'combined',
  };
  // Standalone HTML contains the full sequence; OBS retains direct/manual playback.
  if (source.playback === 'complete') {
    config.playback = 'complete';
    config.start = 'intro';
  }
  // Only our loopback service endpoint is permitted. This stays outside the
  // opaque-origin sandbox; the iframe keeps its original network policy.
  if (source.sync && typeof source.sync.key === 'string' && /^[a-zA-Z0-9_-]{8,100}$/.test(source.sync.key) && source.sync.endpoint === '/__studio_clock') config.sync = { key: source.sync.key, endpoint: '/__studio_clock' };
  const images: Record<string, string> = {};
  for (const key of ['logo', 'qr', 'barcode', 'model', 'portrait', 'introCharacter', 'introAuthor']) {
    if (!config.includeCharacters && ['model', 'portrait', 'introCharacter', 'introAuthor'].includes(key)) continue;
    if (state.narrative?.storyPackagingOnly && ['introCharacter', 'introAuthor'].includes(key)) continue;
    const value = input.images?.[key];
    if (value == null || value === '') continue;
    if (typeof value !== 'string' || value.length > 18 * 1024 * 1024 || !/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]*={0,2}$/i.test(value)) throw new Error('素材格式无效或图片过大。');
    images[key] = value;
  }
  const escape = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const globals={widgetState:{modelContent:null,privateContent:state},statePersistence:'none',studioOutput:config,studioImages:images};
  const bootstrap='<script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__</script>';
  const frameHtml=frameTemplate.replace(bootstrap,()=>'<script type="application/json" id="codex-visualization-widget-state">'+JSON.stringify(globals).replaceAll('<','\\u003c')+'</script>');
  if(frameHtml===frameTemplate)throw new Error('输出模板不完整，请重新构建工作台。');
  const title=(typeof state.name==='string'?state.name:'SHOWCASE').slice(0,40)+' · '+config.width+'×'+config.height+' · 展示输出';
  const filename=(typeof state.name==='string'?state.name:'showcase').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,30)||'showcase';
  const loader="const f=document.getElementById('studio-output');f.addEventListener('load',()=>f.focus());f.srcdoc=f.dataset.srcdoc;delete f.dataset.srcdoc;"+(config.sync?'('+studioOBSLayerBootstrap.toString()+')('+JSON.stringify(config)+');':'');
  const outputPolicy=config.sync?( /(?:^|;)\s*connect-src\s+[^;]*/i.test(policy)?policy.replace(/(^|;)\s*connect-src\s+[^;]*/i,"$1 connect-src 'self'"):policy+"; connect-src 'self'"):policy;
  const html='<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+escape(outputPolicy)+'"><title>'+escape(title)+'</title><meta name="studio-output-size" content="'+config.width+'x'+config.height+'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}iframe{display:block;width:100%;height:100vh;height:100dvh;border:0}</style></head><body><iframe id="studio-output" title="'+escape(title)+'" sandbox="allow-scripts" referrerpolicy="no-referrer" data-srcdoc="'+escape(frameHtml)+'"></iframe><script>'+loader+'</script></body></html>';
  return {html,filename:filename+'-showcase-'+config.width+'x'+config.height+'.html',config};
}

/**
 * Installs `globalThis.studioOutputHost`, which the sandboxed frame asks (through the
 * shell bridge) to build and download an export. Does nothing outside the shell page.
 */
export function mountStudioOutputHost(): void {
  const frame = document.getElementById('codex-visualization') as HTMLIFrameElement | null, template = frame?.dataset.srcdoc;
  const policy = document.querySelector<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]')?.content;
  if (!template || !policy) return;
  (globalThis as { studioOutputHost?: unknown }).studioOutputHost = {
    download(payload: (OutputPayload & { kind?: string }) | (AEPayload & { kind: 'ae' })) {
      if (payload?.kind === 'ae') {
        const result = buildStudioAEFiles(payload as AEPayload);
        studioDownload(studioZip(result.files), result.filename);
        return { filename: result.filename, layers: result.scene.layers.length, geometry: result.scene.geometry.length };
      }
      const output = payload as OutputPayload;
      const result = buildStudioOutputDocument(template, output, policy);
      if (output?.kind === 'obs') {
        if (result.config.obsLayers === 'separate') {
          const key = globalThis.crypto?.randomUUID?.() || ('studio_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2)), sync = { key, endpoint: '/__studio_clock' };
          result.layerDocuments = Object.fromEntries((['picture', 'effects', 'borders'] as const).map(layer => [layer, buildStudioOutputDocument(template, { ...output, config: { ...output.config, layer, sync } }, policy).html])) as OutputDocument['layerDocuments'];
          result.syncManifest = { key, start: result.config.start, width: result.config.width, height: result.config.height, files: { picture: '01-picture.html', effects: '02-effects.html', borders: '03-borders.html' } };
        }
        const filename = result.filename.replace(/\.html$/, '-OBS.zip');
        studioDownload(studioZip(studioOBSFiles(result)), filename);
        return { filename, width: result.config.width, height: result.config.height, layers: result.config.obsLayers === 'separate' ? 3 : 1 };
      }
      studioDownload(new Blob([result.html], { type: 'text/html;charset=utf-8' }), result.filename);
      return { filename: result.filename, width: result.config.width, height: result.config.height };
    },
  };
}
