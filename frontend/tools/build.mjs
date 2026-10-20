/** Builds dist/ with Vite and assembles the self-contained page. Every input is inside this folder. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { outputHostDefines, readBadgeNotices } from './output-host-defines.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (directory, name) => fs.readFile(path.join(root, directory, name), 'utf8');
const inlineScript = source => source.replace(/<\/script/gi, '<\\/script');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const replaceRequired = (text, marker, replacement) => {
  if (!text.includes(marker)) throw new Error(`Missing source marker: ${marker}`);
  // Library/source text may contain $&, $' or $`; a replacement callback keeps
  // those bytes literal instead of treating them as String.replace directives.
  return text.replace(marker, () => replacement);
};

// Vite bundles the frame script's ES module graph (entry src/main.js) into one
// classic script, and its CSS imports into one stylesheet, both unminified.
const bundle = await build({
  root, configFile: false, publicDir: false, logLevel: 'warn',
  build: {
    write: false, target: 'esnext', minify: false, cssMinify: false,
    // Region comments carry module paths relative to cwd; pin it so output never depends on where the build runs.
    rolldownOptions: { cwd: root },
    lib: { entry: path.join(root, 'src', 'main.js'), formats: ['iife'], name: 'studio', fileName: () => 'studio.js', cssFileName: 'studio' },
  },
});
const outputs = (Array.isArray(bundle) ? bundle[0] : bundle).output;
const script = outputs.find(item => item.type === 'chunk').code;
// The shell's output host is a second, separate bundle (entry runtime/output-host.ts). It runs
// outside the sandbox, so it shares no code with the frame. The files it embeds in exports
// come in as build-time constants.
const hostBundle = await build({
  root, configFile: false, publicDir: false, logLevel: 'warn',
  define: await outputHostDefines(root),
  build: {
    write: false, target: 'esnext', minify: false,
    rolldownOptions: { cwd: root },
    lib: { entry: path.join(root, 'runtime', 'output-host.ts'), formats: ['iife'], name: 'studioOutputHostBundle', fileName: () => 'output-host.js' },
  },
});
const hostScript = (Array.isArray(hostBundle) ? hostBundle[0] : hostBundle).output.find(item => item.type === 'chunk').code;
if (/__STUDIO_(?:AE_TEMPLATE|ASSET_NOTICES|OBS_LAYER_SERVER|OBS_LAYER_CONTROL)__/.test(hostScript)) throw new Error('Unreplaced output host constant.');
const styles = outputs.find(item => item.fileName.endsWith('.css'))?.source;
if (typeof styles !== 'string') throw new Error('Vite produced no stylesheet.');
let fragment = await read('src', 'exploration-full-template.html');
fragment = replaceRequired(fragment, '/* STUDIO_STYLES */', styles);
fragment = replaceRequired(fragment, '<!-- DUAL_LANGUAGE_MARKUP -->', await read('src', 'dual-language-markup.html'));
let fontCss = await read('assets/fonts', 'fonts.css');
fontCss = await (async () => {
  const paths = [...new Set([...fontCss.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(match => match[1]))];
  for (const file of paths) {
    if (/^(data:|https?:)/.test(file)) throw new Error('Font CSS must reference bundled files only.');
    const bytes = await fs.readFile(path.join(root, 'assets/fonts', file));
    fontCss = fontCss.split(file).join(`data:font/woff2;base64,${bytes.toString('base64')}`);
  }
  return fontCss;
})();
fragment = fragment.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^;]+;/, () => fontCss);
fragment = fragment.replaceAll("'Noto Sans SC'", "'Microsoft YaHei UI','Microsoft YaHei','PingFang SC'");
const vendor = `${await read('src', 'barcode-code128.min.js')}\n${await read('src', 'qrcode-generator.js')}`;
const notices = await readBadgeNotices(root);
fragment = replaceRequired(fragment, '<!-- EXPLORATION_SCRIPTS -->',
  `<!-- Badge source notices\n${notices}\n-->\n<script>\n${inlineScript(vendor)}\n</script>\n<script>\n${inlineScript(script)}\n</script>`);
const ids = [...fragment.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (ids.length !== new Set(ids).size) throw new Error('Duplicate IDs in generated fragment.');
if (/<(?:html|head|body|!doctype)\b/i.test(fragment)) throw new Error('Source fragment contains document markup.');
if (/\/\* STUDIO_STYLES \*\/|<!-- DUAL_LANGUAGE_MARKUP -->/.test(fragment)) throw new Error('Unreplaced source marker.');

let kit = await read('runtime', 'visualize.html');
kit = replaceRequired(kit, '<script src="https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js"></script>', `<script>${inlineScript(await read('vendor', 'floating-ui-core.min.js'))}</script>`);
kit = replaceRequired(kit, '<script src="https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js"></script>', `<script>${inlineScript(await read('vendor', 'floating-ui-dom.min.js'))}</script>`);
kit = replaceRequired(kit, '<script id="codex-visualization-lucide" async src="https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js"></script>', `<script id="codex-visualization-lucide">${inlineScript(await read('vendor', 'lucide.js'))}</script>`);
kit = replaceRequired(kit, '<!--__INLINE_VISUALIZATION_FRAGMENT__-->', fragment);
if (/<script\b[^>]*\bsrc\s*=/i.test(kit) || /@import\b/i.test(fragment)) throw new Error('A runtime network dependency remains.');
const stylesheet = await read('runtime', 'visualize.css');
const bridge = inlineScript(await read('runtime', 'standalone-host-bridge.js'));
const shell = inlineScript(await read('runtime', 'standalone-shell.js'));
// Published starting point is data only, never imported markup or scripts.
const startupDefaults = JSON.parse(await read('runtime', 'startup-defaults.json'));
if (typeof startupDefaults.revision !== 'string' || !startupDefaults.widgetState?.privateContent || Buffer.byteLength(JSON.stringify(startupDefaults.widgetState)) > 16384) throw new Error('Invalid startup defaults.');
const startupJson = JSON.stringify(startupDefaults).replaceAll('<', '\\u003c');
const outputHost = inlineScript(hostScript);
// The original sandbox and CSP policies are retained. The generated page embeds
// all required scripts, styles, icons and Latin fonts, so they need no connection.
const sources = 'blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com';
const frameCsp = ["default-src 'none'", `script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${sources}`, `style-src 'unsafe-inline' ${sources}`, `img-src ${sources}`, `font-src ${sources}`, `media-src ${sources}`, 'worker-src blob:', 'connect-src blob: data:', "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
const shellCsp = frameCsp.replace("frame-src 'none'", "frame-src 'self'");
const title = '角色展示设计工作台 · Character Showcase Studio';
const frameHtml = `<!doctype html>
<html lang="zh-CN" data-visualize-standalone>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${frameCsp}"><title>${title}</title><style>${stylesheet}\nhtml>body{padding:0}</style></head>
<body><script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__</script><script>${bridge}</script>${kit}</body></html>`;
const document = `<!doctype html>
<html lang="zh-CN" data-visualize-standalone>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${shellCsp}"><title>${title}</title><style>:root{color-scheme:light;background:#edf0e9}html,body{margin:0;height:100%;overflow:hidden}body{box-sizing:border-box;background:inherit}iframe{display:block;width:100%;height:100dvh;margin:0 auto;border:0}</style></head>
<body><script type="application/json" id="studio-startup-defaults">${startupJson}</script><iframe id="codex-visualization" sandbox="allow-scripts" referrerpolicy="no-referrer" title="${title}" data-srcdoc="${escape(frameHtml)}"></iframe><script>${outputHost}</script><script>${shell}</script></body></html>\n`;
// dist/ is build output only; it is gitignored and never edited by hand.
await fs.mkdir(path.join(root, 'dist'), { recursive: true });
await fs.writeFile(path.join(root, 'dist', 'index.html'), document);
await fs.writeFile(path.join(root, 'dist', 'character-explorations.fragment.html'), fragment);
await fs.writeFile(path.join(root, 'dist', 'exploration-full-source.js'), script);
const count = [...fragment.matchAll(/<section\b[^>]*\bdata-variant=/g)].length;
console.log(`Built ${count} design variants. dist/index.html: ${Buffer.byteLength(document).toLocaleString()} bytes.`);
