// ABOUTME: Offline tests for the advisory watcher: watchlist shape and issue comment rendering.
// ABOUTME: The live GitHub advisory and npm checks live in check-advisory-patch.network.test.mjs.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {renderComment} from './check-advisory-patch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WATCHLIST = JSON.parse(
  await readFile(join(HERE, 'advisory-watchlist.json'), 'utf8'),
);

test('every watchlist entry carries the fields the watcher needs', () => {
  assert.ok(WATCHLIST.watch.length > 0, 'watchlist is empty');
  for (const entry of WATCHLIST.watch) {
    assert.equal(typeof entry.package, 'string');
    assert.ok(Array.isArray(entry.advisories) && entry.advisories.length > 0);
    assert.match(entry.latestAtLastCheck, /^\d+\.\d+\.\d+/);
    assert.equal(typeof entry.trackingIssue, 'number');
  }
});

test('renders an issue comment naming the package and every reason', () => {
  const body = renderComment({
    package: 'image-size',
    registryLatest: '2.0.3',
    latestAtLastCheck: '2.0.2',
    reasons: ['npm latest moved from 2.0.2 to 2.0.3'],
    advisories: [
      {
        ghsaId: 'GHSA-w3rx-r6r6-pgpr',
        vulnerableRanges: ['<= 2.0.2'],
        firstPatchedVersions: ['2.0.3'],
        patched: true,
      },
    ],
  });
  assert.match(body, /image-size/);
  assert.match(body, /npm latest moved from 2\.0\.2 to 2\.0\.3/);
  assert.match(body, /GHSA-w3rx-r6r6-pgpr/);
  assert.match(body, /advisory-watchlist\.json/);
});

test('renders an unpatched advisory as having no published fix', () => {
  const body = renderComment({
    package: 'image-size',
    registryLatest: '2.0.3',
    latestAtLastCheck: '2.0.2',
    reasons: ['npm latest moved from 2.0.2 to 2.0.3'],
    advisories: [
      {
        ghsaId: 'GHSA-5p2g-fcmc-qvqq',
        vulnerableRanges: ['>= 1.0.0, <= 2.0.2', '< 0.9'],
        firstPatchedVersions: [],
        patched: false,
      },
    ],
  });
  assert.match(body, /`GHSA-5p2g-fcmc-qvqq`: vulnerable `>= 1\.0\.0, <= 2\.0\.2 \/ < 0\.9`, fix none published/);
});
