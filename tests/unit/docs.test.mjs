// ABOUTME: Offline checks on the guide's content: doc front matter, internal links, and topic wiring.
// ABOUTME: Catches a missing title, a duplicate sidebar slot, or a link to a page that does not exist.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname, join, posix, resolve} from 'node:path';

import {BASE_URL, ROOT, loadDocs} from '../lib/docs.mjs';

const {files: DOC_FILES, docs: DOCS_BY_FILE} = await loadDocs();
const ROUTES = new Set([...DOCS_BY_FILE.values()].map((doc) => doc.route));

function assertRouteExists(link, where) {
  const path = link.replace(/[#?].*$/, '').replace(/\/$/, '');
  assert.ok(
    ROUTES.has(path),
    `${where} links to ${link}, which matches no doc. Known routes: ${[...ROUTES].sort().join(', ')}`,
  );
}

test('the docs folder holds the welcome page and at least one topic', () => {
  const routes = [...ROUTES];
  assert.ok(routes.includes('/docs'), 'no doc is served at /docs');
  assert.ok(routes.some((route) => route.split('/').length > 2), 'no topic folder under docs/');
});

test('every doc has a title and an integer sidebar position', () => {
  for (const {rel, fields} of DOCS_BY_FILE.values()) {
    assert.ok(fields.title, `${rel} has no title`);
    assert.match(fields.sidebar_position ?? '', /^\d+$/, `${rel} has no integer sidebar_position`);
  }
});

test('no two docs in the same folder share a sidebar position', () => {
  const seen = new Map();
  for (const {rel, fields} of DOCS_BY_FILE.values()) {
    const key = `${posix.dirname(rel)}#${fields.sidebar_position}`;
    assert.ok(!seen.has(key), `${rel} and ${seen.get(key)} share sidebar_position ${fields.sidebar_position}`);
    seen.set(key, rel);
  }
});

test('no two docs are served at the same URL', () => {
  assert.equal(ROUTES.size, DOCS_BY_FILE.size, 'two docs resolve to the same route');
});

test('relative links between docs point at files that exist', () => {
  const files = new Set(DOC_FILES);
  for (const [file, {rel, source}] of DOCS_BY_FILE) {
    for (const [, target] of source.matchAll(/\]\((\.{1,2}\/[^)#\s]+)/g)) {
      const resolved = resolve(dirname(file), target);
      assert.ok(files.has(resolved), `${rel} links to ${target}, which does not exist`);
    }
  }
});

test('site-absolute links inside docs point at a doc route', () => {
  for (const {rel, source} of DOCS_BY_FILE.values()) {
    for (const [, target] of source.matchAll(/\]\((\/docs[^)\s]*)\)/g)) {
      assertRouteExists(target, rel);
    }
  }
});

test('each topic overview links every module in its folder', () => {
  for (const [file, {rel, source}] of DOCS_BY_FILE) {
    if (!/(^|\/)index\.mdx?$/.test(rel) || !rel.includes('/')) {
      continue;
    }
    const siblings = DOC_FILES.filter(
      (other) => other !== file && dirname(other) === dirname(file),
    );
    for (const sibling of siblings) {
      const name = posix.basename(DOCS_BY_FILE.get(sibling).rel);
      assert.ok(source.includes(`](./${name})`), `${rel} does not link the module ${name}`);
    }
  }
});

test('homepage and footer links point at doc routes', async () => {
  const home = await readFile(join(ROOT, 'src', 'pages', 'index.tsx'), 'utf8');
  const config = await readFile(join(ROOT, 'docusaurus.config.ts'), 'utf8');
  const links = [
    ...[...home.matchAll(/href:\s*'([^']+)'/g)].map((m) => ['src/pages/index.tsx', m[1]]),
    ...[...home.matchAll(/to="([^"]+)"/g)].map((m) => ['src/pages/index.tsx', m[1]]),
    ...[...config.matchAll(/\bto:\s*'([^']+)'/g)].map((m) => ['docusaurus.config.ts', m[1]]),
  ];
  assert.ok(links.length > 0, 'found no internal links on the homepage or in the footer');
  for (const [where, link] of links) {
    assertRouteExists(link.startsWith(BASE_URL) ? link.slice(BASE_URL.length) : link, where);
  }
});

test('the homepage module count matches the modules in each topic folder', async () => {
  const home = await readFile(join(ROOT, 'src', 'pages', 'index.tsx'), 'utf8');
  const topics = [...home.matchAll(/href:\s*'([^']+)',[\s\S]*?modules:\s*(\d+)/g)];
  assert.ok(topics.length > 0, 'found no topic cards on the homepage');
  for (const [, href, count] of topics) {
    const folder = href.replace(`${BASE_URL}/docs/`, '');
    const modules = [...DOCS_BY_FILE.values()].filter(
      ({rel}) => posix.dirname(rel) === folder && !/(^|\/)index\.mdx?$/.test(rel),
    );
    assert.equal(modules.length, Number(count), `homepage says ${folder} has ${count} modules`);
  }
});
