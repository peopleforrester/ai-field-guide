// ABOUTME: Tests the advisory watcher against the live GitHub advisory and npm APIs.
// ABOUTME: Positive controls prove both signals fire, so a silent watcher cannot pass.

import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {
  checkAdvisory,
  checkWatchEntry,
  latestVersion,
  renderComment,
} from './check-advisory-patch.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const WATCHLIST = JSON.parse(
  await readFile(join(HERE, 'advisory-watchlist.json'), 'utf8'),
);

// A long-fixed advisory. If the detector cannot see this patch, it cannot see
// the one we are actually waiting for.
test('detects a fixed version on an advisory that has one', async () => {
  const result = await checkAdvisory('GHSA-7fh5-64p2-3v2j', 'postcss');
  assert.equal(result.patched, true);
  assert.ok(
    result.firstPatchedVersions.includes('8.4.31'),
    `expected 8.4.31 among ${JSON.stringify(result.firstPatchedVersions)}`,
  );
});

test('reads every watched advisory and reports a usable shape', async () => {
  for (const entry of WATCHLIST.watch) {
    for (const ghsaId of entry.advisories) {
      const result = await checkAdvisory(ghsaId, entry.package);
      assert.equal(result.packageName, entry.package);
      assert.ok(result.vulnerableRanges.length > 0, `${ghsaId} reported no range`);
      // Deliberately not asserting `patched === false`. The day upstream ships
      // the fix, this test must keep passing and the watcher must fire instead.
      assert.equal(typeof result.patched, 'boolean');
    }
  }
});

test('refuses an advisory that does not cover the named package', async () => {
  await assert.rejects(
    () => checkAdvisory('GHSA-7fh5-64p2-3v2j', 'image-size'),
    /lists no vulnerability for package image-size/,
  );
});

test('reads the latest published version from npm', async () => {
  const version = await latestVersion('postcss');
  assert.match(version, /^\d+\.\d+\.\d+/);
});

// Positive control for the second signal: a stale recorded version must be
// reported as a new release even while the advisory itself stays unpatched.
test('flags a package whose recorded version has fallen behind npm', async () => {
  const result = await checkWatchEntry({
    package: 'postcss',
    advisories: ['GHSA-7fh5-64p2-3v2j'],
    latestAtLastCheck: '0.0.1',
  });
  assert.equal(result.needsAttention, true);
  assert.ok(
    result.reasons.some((reason) => reason.includes('npm latest moved from 0.0.1')),
    `expected a new-release reason, got ${JSON.stringify(result.reasons)}`,
  );
});

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
