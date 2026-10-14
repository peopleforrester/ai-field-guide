# Decisions

## 2026-10-14 · 3.2 · CI gate skipped for the Dependabot lockfile refresh

Commit 54bb6c2 was promoted from staging to main without a CI run because no
workflow runs on staging (deploy.yml runs on main only). Verified locally with
`npm ci --ignore-scripts`, `npm test` (7 pass), `npm run typecheck` and
`npm run build`.

## 2026-10-14 · 3.2 · CI gate skipped for the second Dependabot refresh

The katex, tinypool and postcss-selector-parser overrides commit was promoted
from staging to main without a CI run because no workflow runs on staging.
Verified locally with `npm ci --ignore-scripts`, `npm test` (7 pass),
`npm run typecheck`, `npm run build`, and a build with
`DOCUSAURUS_SSG_WORKER_THREAD_COUNT=2` to exercise the tinypool 2 worker pool.
