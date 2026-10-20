import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import './build.mjs';

const root = new URL('../', import.meta.url);
await fs.mkdir(new URL('dist-cloudflare/', root), { recursive: true });
await fs.copyFile(new URL('dist/index.html', root), new URL('dist-cloudflare/index.html', root));
console.log(`Cloudflare assets ready: ${fileURLToPath(new URL('dist-cloudflare/', root))}`);
