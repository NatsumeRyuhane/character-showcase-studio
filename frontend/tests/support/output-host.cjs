'use strict';
// The output host's build-time constants (see tools/output-host-defines.mjs), as globals
// of a vm context, so runtime/export-packages.ts can be loaded with load(). The AE
// template and notices can be replaced by test values.
const fs = require('node:fs');
const path = require('node:path');

const frontend = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(frontend, file), 'utf8');

function outputHostConstants({ aeTemplate = 'QA AE template', notices = 'QA notices' } = {}) {
  return {
    __STUDIO_AE_TEMPLATE__: aeTemplate,
    __STUDIO_ASSET_NOTICES__: notices,
    __STUDIO_OBS_LAYER_SERVER__: read('runtime/obs-layer-server.mjs'),
    __STUDIO_OBS_LAYER_CONTROL__: read('runtime/obs-layer-control.html'),
  };
}

module.exports = { outputHostConstants };
