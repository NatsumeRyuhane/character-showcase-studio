// Build the frontend, then stage only the page itself as the Worker's static asset.
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import '../../frontend/tools/build.mjs';

const here = new URL('./', import.meta.url);
const assets = new URL('dist-cloudflare/', here);
await fs.mkdir(assets, { recursive: true });
await fs.copyFile(new URL('../../frontend/dist/index.html', here), new URL('index.html', assets));
console.log(`Cloudflare assets ready: ${fileURLToPath(assets)}`);
