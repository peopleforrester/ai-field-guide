// ABOUTME: Reads the guide's docs folder for the tests: front matter and the URL each doc is served at.
// ABOUTME: Shared by the offline content checks and the end-to-end build check.

import {readFile, readdir} from 'node:fs/promises';
import {dirname, join, posix, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DOCS = join(ROOT, 'docs');
export const BASE_URL = '/ai-field-guide';

async function listDocs(dir) {
  const files = [];
  for (const entry of await readdir(dir, {withFileTypes: true})) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listDocs(path)));
    } else if (/\.mdx?$/.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

/** Parse the flat `key: value` front matter these docs use. */
function frontMatter(source, file) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    throw new Error(`${file} has no front matter block`);
  }
  const fields = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (!pair) {
      throw new Error(`${file} has an unparseable front matter line: ${line}`);
    }
    fields[pair[1]] = pair[2].trim();
  }
  return fields;
}

/** The URL path Docusaurus serves a doc at, following its default routing rules. */
function routeFor(rel, fields) {
  const dir = posix.dirname(rel) === '.' ? '' : posix.dirname(rel);
  const strip = (segment) => segment.replace(/^\d+-/, '');
  const dirRoute = dir.split('/').filter(Boolean).map(strip).join('/');
  let route;
  if (fields.slug) {
    route = fields.slug.startsWith('/')
      ? fields.slug
      : posix.join('/', dirRoute, fields.slug);
  } else {
    const name = strip(posix.basename(rel).replace(/\.mdx?$/, ''));
    route = name === 'index' ? `/${dirRoute}` : posix.join('/', dirRoute, name);
  }
  return posix.join('/docs', route).replace(/\/$/, '') || '/docs';
}

/** Every doc file, keyed by absolute path, with its source, front matter and route. */
export async function loadDocs() {
  const files = await listDocs(DOCS);
  const docs = new Map();
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const rel = relative(DOCS, file).split('\\').join('/');
    const fields = frontMatter(source, rel);
    docs.set(file, {rel, source, fields, route: routeFor(rel, fields)});
  }
  return {files, docs};
}
