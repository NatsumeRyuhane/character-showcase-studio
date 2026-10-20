/** Refresh the editable source from another checkout; never required to run the site. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const from = process.argv[2];
if (!from) throw new Error('Usage: node tools/sync-source.mjs <source-directory>');
const input = path.resolve(from);
const files = [
  'exploration-full-template.html', 'exploration-full-logic.js',
  'exploration-full-scene.js', 'design-language-scene.js',
  'design-language-styles.css', 'studio-geometry.js',
  'motion-clock.js', 'information-motion.js', 'badge-assets.json',
  'barcode-code128.min.js', 'qrcode-generator.js',
  'dual-language-scene.js', 'dual-language-styles.css', 'dual-language-markup.html',
];
for (const name of files) await fs.copyFile(path.join(input, name), path.join(root, 'src', name));
await fs.cp(path.join(input, 'badge-assets'), path.join(root, 'src', 'badge-assets'), { recursive: true });
console.log(`Copied ${files.length} source files and badge assets.`);
