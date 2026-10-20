'use strict';
// The regression tests run source files as classic scripts in one shared
// node:vm context and call their top-level functions directly. Source files are
// ES modules, so moduleScript() turns one back into such a script:
// - imports of other modules are dropped: each test loads what it needs into the
//   same context, which then plays the part of the module graph;
// - JSON imports become constants, and side-effect imports (CSS) are dropped;
// - `export` keywords are removed.
// Only these forms are supported, at the start of a line; anything else throws.
// Vitest replaces this in phase 3 of the frontend rewrite (issue #3).
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const frontend = path.join(__dirname, '..', '..');
// Blank out a statement but keep its line breaks, so stack traces keep their line numbers.
const blank = text => text.replace(/[^\n]/g, '');

function moduleScript(file) {
  const absolute = path.resolve(frontend, file);
  const script = fs.readFileSync(absolute, 'utf8')
    .replace(/^import\s+(?:([\w$]+)\s+from\s+|\{[^}]*\}\s+from\s+)?'([^']+)';?/gm, (statement, name, specifier) => {
      if (!name) return blank(statement);
      if (!specifier.endsWith('.json')) throw new Error(`${file}: unsupported import: ${statement}`);
      const json = fs.readFileSync(path.resolve(path.dirname(absolute), specifier), 'utf8').trim();
      return `const ${name}=${json};`;
    })
    .replace(/^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/gm, '')
    .replace(/^export\s*\{[^}]*\};?/gm, blank);
  const leftover = script.match(/^(?:import|export)\b.*/m);
  if (leftover) throw new Error(`${file}: unsupported module syntax: ${leftover[0]}`);
  return script;
}

function load(scope, ...files) {
  for (const file of files) vm.runInContext(moduleScript(file), scope, { filename: file });
}

module.exports = { moduleScript, load };
