'use strict';

const path       = require('path');
const runCommand = require('./run-command');

// ─── resolve bundled tool paths ───────────────────────────────────────────────

function localPkg(name) {
  try {
    return require.resolve(name, { paths: [__dirname + '/..'] });
  } catch (_) {
    return null;
  }
}

/** Path to the bundled prettier CLI (inside this package's node_modules). */
function bundledPrettierBin() {
  try {
    const pkgDir = path.dirname(localPkg('prettier/package.json'));
    return path.join(pkgDir, 'bin', 'prettier.cjs');
  } catch (_) {
    return null;
  }
}

/** Path to the bundled clang-format binary. */
function bundledClangFormatBin() {
  try {
    const cf = require(localPkg('clang-format'));
    if (typeof cf.getNativeBinary === 'function') return cf.getNativeBinary();
  } catch (_) {}
  return null;
}

// ─── built-in formatters ─────────────────────────────────────────────────────

function formatJSON(text) {
  const obj = JSON.parse(text);
  return JSON.stringify(obj, null, 2) + '\n';
}

// ─── grammar → config ────────────────────────────────────────────────────────

const GRAMMAR_MAP = {
  // JavaScript / JSX
  'source.js':               { type: 'prettier', parser: 'babel' },
  'source.js.jsx':           { type: 'prettier', parser: 'babel' },
  'source.jsx':              { type: 'prettier', parser: 'babel' },
  // TypeScript / TSX
  'source.ts':               { type: 'prettier', parser: 'typescript' },
  'source.tsx':              { type: 'prettier', parser: 'typescript' },
  // CSS / SCSS / Less
  'source.css':              { type: 'prettier', parser: 'css'  },
  'source.css.scss':         { type: 'prettier', parser: 'scss' },
  'source.scss':             { type: 'prettier', parser: 'scss' },
  'source.css.less':         { type: 'prettier', parser: 'less' },
  'source.less':             { type: 'prettier', parser: 'less' },
  // HTML
  'text.html.basic':         { type: 'prettier', parser: 'html' },
  'text.html.erb':           { type: 'prettier', parser: 'html' },
  // Markdown
  'source.gfm':              { type: 'prettier', parser: 'markdown' },
  'text.md':                 { type: 'prettier', parser: 'markdown' },
  // YAML
  'source.yaml':             { type: 'prettier', parser: 'yaml' },
  // JSON
  'source.json':             { type: 'builtin',  fn: formatJSON },
  // GraphQL
  'source.graphql':          { type: 'prettier', parser: 'graphql' },
  // C / C++ / Objective-C  → bundled clang-format
  'source.c':                { type: 'clang' },
  'source.cpp':              { type: 'clang' },
  'source.objc':             { type: 'clang' },
  'source.objcpp':           { type: 'clang' },
  // Python  → system black (no npm bundle available)
  'source.python':           { type: 'black' },
  // Go  → system gofmt
  'source.go':               { type: 'gofmt' },
  // Rust  → system rustfmt
  'source.rust':             { type: 'rustfmt' },
  // Ruby  → system rubocop
  'source.ruby':             { type: 'rubocop' },
};

// ─── dispatcher ──────────────────────────────────────────────────────────────

async function format(editor, text) {
  const grammar = editor.getGrammar();
  const scope   = grammar ? grammar.scopeName : null;
  const cfg     = scope ? GRAMMAR_MAP[scope] : null;

  if (!cfg) {
    const name = grammar ? grammar.name : 'Unknown';
    throw new Error(`No formatter configured for language: ${name} (${scope})`);
  }

  const filePath = editor.getPath() || '';
  const cwd      = projectRootFor(filePath);

  switch (cfg.type) {

    case 'builtin':
      return cfg.fn(text);

    case 'prettier': {
      // Prefer bundled prettier → fallback to system path from settings
      const bundled = bundledPrettierBin();
      const bin     = bundled || (atom.config.get('formatter.prettierPath') || 'prettier');
      const args    = [
        '--parser', cfg.parser,
        '--stdin-filepath', filePath || `file.${parserToExt(cfg.parser)}`,
      ];
      return runCommand(bin, args, text, { cwd });
    }

    case 'clang': {
      // Prefer bundled clang-format → fallback to system path from settings
      const bundled = bundledClangFormatBin();
      const bin     = bundled || (atom.config.get('formatter.clangFormatPath') || 'clang-format');
      const args    = filePath ? [`-assume-filename=${path.basename(filePath)}`] : [];
      return runCommand(bin, args, text, { cwd });
    }

    case 'black': {
      const bin = atom.config.get('formatter.blackPath') || 'black';
      return runCommand(bin, ['-', '--quiet'], text, { cwd });
    }

    case 'gofmt': {
      const bin = atom.config.get('formatter.gofmtPath') || 'gofmt';
      return runCommand(bin, [], text, { cwd });
    }

    case 'rustfmt': {
      const bin = atom.config.get('formatter.rustfmtPath') || 'rustfmt';
      return runCommand(bin, ['--edition', '2021'], text, { cwd });
    }

    case 'rubocop': {
      const name = filePath ? path.basename(filePath) : 'stdin.rb';
      const raw  = await runCommand(
        'rubocop',
        ['--autocorrect', '--force-exclusion', '--stdin', name],
        text, { cwd }
      );
      const marker = `==== ${name} ====`;
      const idx    = raw.indexOf(marker);
      return idx >= 0 ? raw.slice(idx + marker.length).trimStart() : raw;
    }

    default:
      throw new Error(`Unknown formatter type: ${cfg.type}`);
  }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function projectRootFor(filePath) {
  if (!filePath) return undefined;
  for (const dir of atom.project.getPaths()) {
    if (filePath.startsWith(dir)) return dir;
  }
  return path.dirname(filePath);
}

function parserToExt(parser) {
  return { babel: 'js', typescript: 'ts', css: 'css', scss: 'scss',
           less: 'less', html: 'html', markdown: 'md', yaml: 'yml',
           graphql: 'graphql' }[parser] || 'txt';
}

module.exports = { format };
