// ABOUTME: Checks watched npm advisories for an upstream patch or a newer published release.
// ABOUTME: Exits 0 when nothing has moved and 10 when a watched package needs attention.

import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ADVISORY_API = 'https://api.github.com/advisories';
const REGISTRY_API = 'https://registry.npmjs.org';
const USER_AGENT = 'ai-field-guide-advisory-watch';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WATCHLIST = join(HERE, 'advisory-watchlist.json');

/** Exit code used when at least one watched package has moved. */
export const EXIT_ATTENTION = 10;

function githubHeaders() {
  const headers = {
    accept: 'application/vnd.github+json',
    'user-agent': USER_AGENT,
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  return headers;
}

async function getJson(url, headers) {
  const response = await fetch(url, {headers});
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Read one GitHub advisory and report whether it names a fixed version for the
 * given package. An advisory may list several ranges for the same package, so
 * every matching entry is inspected.
 */
export async function checkAdvisory(ghsaId, packageName) {
  const advisory = await getJson(`${ADVISORY_API}/${ghsaId}`, githubHeaders());
  const entries = (advisory.vulnerabilities ?? []).filter(
    (entry) => entry.package?.name === packageName,
  );
  if (entries.length === 0) {
    throw new Error(`${ghsaId} lists no vulnerability for package ${packageName}`);
  }
  const firstPatchedVersions = entries
    .map((entry) => entry.first_patched_version)
    .filter((version) => version !== null && version !== undefined);
  return {
    ghsaId,
    packageName,
    summary: advisory.summary,
    vulnerableRanges: entries.map((entry) => entry.vulnerable_version_range),
    firstPatchedVersions,
    patched: firstPatchedVersions.length > 0,
  };
}

/** Read the version currently carrying the `latest` dist-tag on npm. */
export async function latestVersion(packageName) {
  const metadata = await getJson(`${REGISTRY_API}/${encodeURIComponent(packageName)}`, {
    accept: 'application/vnd.npm.install-v1+json',
    'user-agent': USER_AGENT,
  });
  const latest = metadata['dist-tags']?.latest;
  if (!latest) {
    throw new Error(`npm returned no latest dist-tag for ${packageName}`);
  }
  return latest;
}

/**
 * Evaluate one watchlist entry against both signals: a fixed version named by
 * an advisory, and a published release newer than the one last recorded.
 */
export async function checkWatchEntry(entry, {onProgress} = {}) {
  const advisories = [];
  for (const ghsaId of entry.advisories) {
    onProgress?.(`  checking ${ghsaId}`);
    advisories.push(await checkAdvisory(ghsaId, entry.package));
  }
  onProgress?.(`  checking npm registry for ${entry.package}`);
  const registryLatest = await latestVersion(entry.package);

  const patchedAdvisories = advisories.filter((advisory) => advisory.patched);
  const newRelease = registryLatest !== entry.latestAtLastCheck;

  const reasons = [];
  for (const advisory of patchedAdvisories) {
    reasons.push(
      `${advisory.ghsaId} now names a fixed version: ${advisory.firstPatchedVersions.join(', ')}`,
    );
  }
  if (newRelease) {
    reasons.push(
      `npm latest moved from ${entry.latestAtLastCheck} to ${registryLatest}`,
    );
  }

  return {
    package: entry.package,
    trackingIssue: entry.trackingIssue,
    note: entry.note,
    advisories,
    registryLatest,
    latestAtLastCheck: entry.latestAtLastCheck,
    needsAttention: reasons.length > 0,
    reasons,
  };
}

/**
 * Render the issue comment posted when a watched package moves. Kept beside the
 * check so the workflow only has to loop over files.
 */
export function renderComment(result) {
  const lines = [
    `The advisory watch fired for \`${result.package}\`.`,
    '',
  ];
  for (const reason of result.reasons) {
    lines.push(`- ${reason}`);
  }
  lines.push(
    '',
    `npm latest: \`${result.registryLatest}\` (recorded in the watchlist: \`${result.latestAtLastCheck}\`)`,
    '',
    'Advisory state at this run:',
    '',
  );
  for (const advisory of result.advisories) {
    const fix = advisory.patched
      ? `\`${advisory.firstPatchedVersions.join(', ')}\``
      : 'none published';
    lines.push(
      `- \`${advisory.ghsaId}\`: vulnerable \`${advisory.vulnerableRanges.join(' / ')}\`, fix ${fix}`,
    );
  }
  lines.push(
    '',
    'Next step: re-run `npm audit`, bump or pin as needed, then update',
    '`latestAtLastCheck` in `scripts/advisory-watchlist.json` so the watch keeps working.',
  );
  return lines.join('\n');
}

function formatReport(results) {
  const lines = [];
  for (const result of results) {
    lines.push(`${result.package}`);
    lines.push(`  npm latest: ${result.registryLatest} (recorded: ${result.latestAtLastCheck})`);
    for (const advisory of result.advisories) {
      const fixed = advisory.patched
        ? advisory.firstPatchedVersions.join(', ')
        : 'none published';
      lines.push(
        `  ${advisory.ghsaId}: vulnerable ${advisory.vulnerableRanges.join(' / ')}, fix ${fixed}`,
      );
    }
    if (result.needsAttention) {
      lines.push('  ATTENTION:');
      for (const reason of result.reasons) {
        lines.push(`    - ${reason}`);
      }
    } else {
      lines.push('  no change');
    }
  }
  return lines.join('\n');
}

function optionValue(argv, name) {
  const index = argv.indexOf(name);
  return index === -1 ? undefined : argv[index + 1];
}

async function main(argv) {
  const asJson = argv.includes('--json');
  const commentDir = optionValue(argv, '--comment-dir');
  const watchlist = JSON.parse(await readFile(DEFAULT_WATCHLIST, 'utf8'));

  const onProgress = asJson ? undefined : (message) => console.error(message);
  const results = [];
  const total = watchlist.watch.length;
  for (const [index, entry] of watchlist.watch.entries()) {
    onProgress?.(`[${index + 1}/${total}] ${entry.package}`);
    results.push(await checkWatchEntry(entry, {onProgress}));
  }

  const attention = results.filter((result) => result.needsAttention);
  if (commentDir) {
    await mkdir(commentDir, {recursive: true});
    for (const result of attention) {
      await writeFile(
        join(commentDir, `issue-${result.trackingIssue}.md`),
        renderComment(result),
        'utf8',
      );
    }
  }
  if (asJson) {
    console.log(JSON.stringify({results, needsAttention: attention.length > 0}, null, 2));
  } else {
    console.log(formatReport(results));
  }
  return attention.length > 0 ? EXIT_ATTENTION : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(`advisory watch failed: ${error.message}`);
      process.exitCode = 1;
    },
  );
}
