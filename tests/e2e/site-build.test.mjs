// ABOUTME: Builds the whole site with Docusaurus and checks every doc and the homepage render to HTML.
// ABOUTME: Needs installed dependencies (npm ci); the build itself fails on any broken internal link.

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {ROOT, loadDocs} from '../lib/docs.mjs';

const DOCUSAURUS = join(ROOT, 'node_modules', '.bin', 'docusaurus');

/** Run the build, echoing one progress line every 15 s and keeping the log for a failure message. */
function build(outDir) {
  return new Promise((resolvePromise, reject) => {
    const started = Date.now();
    const child = spawn(DOCUSAURUS, ['build', '--out-dir', outDir], {cwd: ROOT});
    let log = '';
    child.stdout.on('data', (chunk) => (log += chunk));
    child.stderr.on('data', (chunk) => (log += chunk));
    const ticker = setInterval(() => {
      const seconds = Math.round((Date.now() - started) / 1000);
      process.stderr.write(`  docusaurus build still running (${seconds}s)\n`);
    }, 15_000);
    child.on('error', (error) => {
      clearInterval(ticker);
      reject(error);
    });
    child.on('close', (code) => {
      clearInterval(ticker);
      if (code === 0) {
        resolvePromise(log);
      } else {
        reject(new Error(`docusaurus build exited ${code}:\n${log}`));
      }
    });
  });
}

/** With trailingSlash: false, /docs/mcp is written as docs/mcp.html. */
function htmlFileFor(outDir, route) {
  return route === '/' ? join(outDir, 'index.html') : join(outDir, `${route.slice(1)}.html`);
}

test('the site builds and every doc renders to a page carrying its title', async (t) => {
  assert.ok(
    existsSync(DOCUSAURUS),
    `${DOCUSAURUS} is missing. Install dependencies with \`npm ci --ignore-scripts\` before running the end-to-end tests.`,
  );
  const outDir = await mkdtemp(join(tmpdir(), 'ai-field-guide-build-'));
  t.after(() => rm(outDir, {recursive: true, force: true}));

  await build(outDir);

  const home = await readFile(htmlFileFor(outDir, '/'), 'utf8');
  // The build minifies HTML, so attribute quotes come and go.
  assert.ok(home.includes('<title data-rh=true>The AI Field Guide</title>'), 'homepage lost its title');
  assert.ok(/href="?\/ai-field-guide\/docs\/mcp"?[ >]/.test(home), 'homepage no longer links the MCP topic');

  const {docs} = await loadDocs();
  assert.ok(docs.size > 0, 'no docs found to check');
  for (const {rel, fields, route} of docs.values()) {
    const file = htmlFileFor(outDir, route);
    assert.ok(existsSync(file), `${rel} should render to ${file}, which the build did not write`);
    const html = await readFile(file, 'utf8');
    const title = fields.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/&/g, '&(?:amp;)?');
    assert.ok(
      new RegExp(`<title data-rh=true>${title} \\| The AI Field Guide</title>`).test(html),
      `${file} does not carry the title "${fields.title}"`,
    );
  }
});
