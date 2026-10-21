'use strict';
// The regression tests run source files as classic scripts in one shared
// node:vm context and call their top-level functions directly. Source files are
// ES modules, so moduleScript() turns one back into such a script:
// - imports of other modules are dropped: each test loads what it needs into the
//   same context, which then plays the part of the module graph;
// - JSON imports become constants, and side-effect imports (CSS) are dropped;
// - `export` keywords are removed;
// - TypeScript files are first stripped of their types, with the transformer
//   Vite itself uses (Oxc, through Vite's Rolldown), so the code is what the bundle runs.
//   They also keep their module scope: only their exports become globals, so private
//   helpers with the same name in two modules do not collide. JavaScript files share
//   one scope, as they did when the build concatenated them.
// Only these forms are supported, at the start of a line; anything else throws.
// Scripts move to Vitest (tests/unit/) as their modules are converted in the
// frontend rewrite (issue #3); this loader goes once none of them needs it.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const frontend = path.join(__dirname, '..', '..');
// Resolve Rolldown from Vite's own dependencies rather than declaring it separately.
const { transformSync } = require(require.resolve('rolldown/utils', { paths: [path.dirname(require.resolve('vite/package.json'))] }));
// Blank out a statement but keep its line breaks, so stack traces keep their line numbers.
const blank = text => text.replace(/[^\n]/g, '');

function source(absolute) {
  const text = fs.readFileSync(absolute, 'utf8');
  if (!absolute.endsWith('.ts')) return text;
  const result = transformSync(absolute, text, { lang: 'ts' });
  if (result.errors.length) throw new Error(`${absolute}: ${result.errors.map(error => error.message).join('; ')}`);
  return result.code;
}

function moduleScript(file) {
  const absolute = path.resolve(frontend, file);
  const typescript = absolute.endsWith('.ts'), text = source(absolute);
  if (typescript && /^export\s*\{/m.test(text)) throw new Error(`${file}: export lists are not supported in TypeScript modules`);
  let script = text
    .replace(/^import\s+(?:([\w$]+)\s+from\s+|\{[^}]*\}\s+from\s+)?(['"])([^'"]+)\2;?/gm, (statement, name, _quote, specifier) => {
      if (!name) return blank(statement);
      if (!specifier.endsWith('.json')) throw new Error(`${file}: unsupported import: ${statement}`);
      const json = fs.readFileSync(path.resolve(path.dirname(absolute), specifier), 'utf8').trim();
      return `const ${name}=${json};`;
    });
  const exported = [...script.matchAll(/^export\s+(?:(?:async\s+)?function\*?|const|let|class)\s+([\w$]+)/gm)].map(match => match[1]);
  script = script
    .replace(/^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm, '')
    .replace(/^export\s*\{[^}]*\};?/gm, blank);
  const leftover = script.match(/^(?:import|export)\b.*/m);
  if (leftover) throw new Error(`${file}: unsupported module syntax: ${leftover[0]}`);
  if (typescript) {
    const names = exported.join(',');
    return `var {${names}}=(()=>{'use strict';\n${script}\nreturn {${names}};})();`;
  }
  return script;
}

function load(scope, ...files) {
  for (const file of files) vm.runInContext(moduleScript(file), scope, { filename: file });
}

// The design modules (src/designs/), in an order where each one's dependencies load first.
const designModules = ['kit', 'series-geometry', 'shared-scene', 'language', 'urban',
  'couture', 'brutalist', 'cloud', 'plush', 'play', 'sticker', 'district', 'tuner', 'arcade', 'orbit', 'poster', 'wave', 'dual', 'index']
  .map(name => `src/designs/${name}.ts`);

module.exports = { moduleScript, load, designModules };
