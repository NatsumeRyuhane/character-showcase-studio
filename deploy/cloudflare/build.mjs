// Install the locked frontend dependencies, build the frontend, then stage only
// the page itself as the Worker's static asset.
import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = new URL('./', import.meta.url);
const frontend = new URL('../../frontend/', here);
// npm is npm.cmd on Windows, which only runs through a shell; the arguments are fixed.
const install = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: frontend, stdio: 'inherit', shell: process.platform === 'win32' });
if (install.status !== 0) throw new Error('npm ci failed in frontend/.');
// Imported only after the install: the build loads Vite from frontend/node_modules.
await import(new URL('tools/build.mjs', frontend).href);

const assets = new URL('dist-cloudflare/', here);
await fs.mkdir(assets, { recursive: true });
await fs.copyFile(new URL('dist/index.html', frontend), new URL('index.html', assets));
console.log(`Cloudflare assets ready: ${fileURLToPath(assets)}`);
