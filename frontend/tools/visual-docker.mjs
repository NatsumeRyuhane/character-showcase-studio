/** Runs the visual regression tests in the pinned Playwright Linux image, the same environment CI uses.
 * Usage: node tools/visual-docker.mjs [playwright test arguments], e.g. --update-snapshots or a test-name filter. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// The image tag must match the locked @playwright/test, or the image has no matching browser.
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const version = lock.packages['node_modules/@playwright/test']?.version;
if (!version) throw new Error('@playwright/test is missing from package-lock.json.');
const image = `mcr.microsoft.com/playwright:v${version}-noble`;
const quote = value => `'${value.replace(/'/g, `'\\''`)}'`;
const script = ['npm ci --no-audit --no-fund', 'node tools/build.mjs', ['npx playwright test', ...process.argv.slice(2).map(quote)].join(' ')].join(' && ');
const args = [
  'run', '--rm', '--init', '--ipc=host',
  // Linux-built node_modules and the npm cache live in volumes, so the host's node_modules is untouched.
  '-v', `${root}:/work`, '-v', 'studio-visual-node-modules:/work/node_modules', '-v', 'studio-visual-npm-cache:/root/.npm',
  '-w', '/work', '-e', 'STUDIO_VISUAL_DOCKER=1', '-e', 'CI',
  image, 'bash', '-c', script,
];
const result = spawnSync('docker', args, { stdio: 'inherit' });
if (result.error) {
  console.error(result.error.code === 'ENOENT' ? 'Docker is not installed or not on PATH. Install Docker Desktop and try again.' : result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
