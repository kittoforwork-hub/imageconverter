import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public');
const errors = [];
const checked = { html: 0, css: 0, js: 0, references: 0 };

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function addError(message) {
  errors.push(message);
}

function localReferenceToPath(value, fromFile) {
  const ref = value.trim().replaceAll('&amp;', '&');
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return null;
  const pathname = decodeURIComponent(ref.split(/[?#]/, 1)[0]);
  if (!pathname) return null;
  return path.resolve(pathname.startsWith('/')
    ? publicDir + pathname
    : path.dirname(fromFile) + path.sep + pathname);
}

function checkDuplicateIds(html, filePath) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const ids = new Map();
  const tagPattern = /<([a-z][\w:-]*)\b([^<>]*)>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(noComments))) {
    const tag = tagMatch[0];
    const idMatch = /\bid\s*=\s*(["'])(.*?)\1/i.exec(tag);
    if (!idMatch) continue;
    const id = idMatch[2];
    if (!id) continue;
    if (ids.has(id)) addError(`${path.relative(root, filePath)}: duplicate id "${id}"`);
    else ids.set(id, true);
  }
}

async function checkHtml(filePath, html) {
  checked.html += 1;
  checkDuplicateIds(html, filePath);
  const tagPattern = /<(?:script|link|img|source|audio|video|iframe|object|embed)\b[^>]*>/gi;
  let tagMatch;
  while ((tagMatch = tagPattern.exec(html))) {
    const tag = tagMatch[0];
    const attrMatch = /\b(src|href|poster|data)\s*=\s*(["'])(.*?)\2/i.exec(tag);
    if (!attrMatch) continue;
    const attr = attrMatch[1].toLowerCase();
    const ref = attrMatch[3];
    // A <link href> may be a font or other external resource; local paths are checked below.
    const resolved = localReferenceToPath(ref, filePath);
    if (!resolved) continue;
    checked.references += 1;
    try {
      const fileStat = await stat(resolved);
      if (!fileStat.isFile()) addError(`${path.relative(root, filePath)}: ${attr} does not point to a file: ${ref}`);
    } catch {
      addError(`${path.relative(root, filePath)}: missing local ${attr}: ${ref}`);
    }
  }
}

async function checkCss(filePath, css) {
  checked.css += 1;
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const references = [];

  // Check both CSS imports and local assets. Imports are important because
  // the public stylesheet files are intentionally small entry points.
  const importPattern = /@import\s+(?:url\(\s*)?(["'])(.*?)\1\s*\)?/gi;
  let match;
  while ((match = importPattern.exec(cssWithoutComments))) {
    references.push({ kind: 'CSS import', ref: match[2] });
  }

  const urlPattern = /url\(\s*(["']?)(.*?)\1\s*\)/gi;
  while ((match = urlPattern.exec(cssWithoutComments))) {
    references.push({ kind: 'CSS url', ref: match[2] });
  }

  for (const { kind, ref } of references) {
    const resolved = localReferenceToPath(ref, filePath);
    if (!resolved) continue;
    checked.references += 1;
    try {
      const fileStat = await stat(resolved);
      if (!fileStat.isFile()) addError(`${path.relative(root, filePath)}: ${kind} does not point to a file: ${ref}`);
    } catch {
      addError(`${path.relative(root, filePath)}: missing ${kind.toLowerCase()}: ${ref}`);
    }
  }
}

async function main() {
  let publicStat;
  try { publicStat = await stat(publicDir); } catch { publicStat = null; }
  if (!publicStat?.isDirectory()) {
    console.error('ERROR: public/ directory not found.');
    process.exitCode = 1;
    return;
  }

  const files = await walk(publicDir);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const cssFiles = files.filter(file => file.endsWith('.css'));
  const jsFiles = files.filter(file => file.endsWith('.js'));

  for (const required of ['index.html', 'file-converter.html', 'notepad.html']) {
    if (!htmlFiles.includes(path.join(publicDir, required))) addError(`Missing required page: public/${required}`);
  }

  for (const file of htmlFiles) await checkHtml(file, await readFile(file, 'utf8'));
  for (const file of cssFiles) await checkCss(file, await readFile(file, 'utf8'));

  for (const file of jsFiles) {
    checked.js += 1;
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      const output = (result.stderr || result.stdout || 'unknown syntax error').trim();
      addError(`${path.relative(root, file)}: JavaScript syntax check failed\n${output}`);
    }
  }

  console.log('Workshop Utility BY KITTO — project check');
  console.log(`HTML: ${checked.html} | CSS: ${checked.css} | JavaScript: ${checked.js} | local references: ${checked.references}`);

  if (errors.length) {
    console.error(`\nFound ${errors.length} issue(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('All checks passed.');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
