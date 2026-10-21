/** Build-time constants of the shell's output host (runtime/export-packages.ts), shared by the build and the unit tests. */
import fs from 'node:fs/promises';
import path from 'node:path';

const replaceRequired = (text, marker, replacement) => {
  if (!text.includes(marker)) throw new Error(`Missing source marker: ${marker}`);
  return text.replace(marker, () => replacement);
};

/** Badge source notices, safe to place inside an HTML comment. */
export async function readBadgeNotices(root) {
  return (await fs.readFile(path.join(root, 'src/badge-assets/SOURCE-NOTICES.txt'), 'utf8')).replaceAll('-->', '-- >');
}

/** Vite `define` entries: each value is the JSON literal of a file the packager embeds in exports. */
export async function outputHostDefines(root) {
  const read = file => fs.readFile(path.join(root, file), 'utf8');
  // ExtendScript (ES3) has no modules: the shared CRT function goes into the AE template without its export keyword.
  const crtMotion = (await read('runtime/crt-motion.js')).replace(/^export (?=function )/m, '');
  if (/^\s*(?:import|export)\b/m.test(crtMotion)) throw new Error('runtime/crt-motion.js must stay a single exported function.');
  return {
    __STUDIO_AE_TEMPLATE__: JSON.stringify(replaceRequired(await read('runtime/ae-import-template.jsx'), '/* CRT_MOTION_FUNCTION */', crtMotion)),
    __STUDIO_ASSET_NOTICES__: JSON.stringify(await readBadgeNotices(root)),
    __STUDIO_OBS_LAYER_SERVER__: JSON.stringify(await read('runtime/obs-layer-server.mjs')),
    __STUDIO_OBS_LAYER_CONTROL__: JSON.stringify(await read('runtime/obs-layer-control.html')),
  };
}
