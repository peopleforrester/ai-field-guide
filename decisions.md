# Decisions

## 2026-10-14 · 3.2 · CI gate skipped for the Dependabot lockfile refresh

Commit 54bb6c2 was promoted from staging to main without a CI run because no
workflow runs on staging (deploy.yml runs on main only). Verified locally with
`npm ci --ignore-scripts`, `npm test` (7 pass), `npm run typecheck` and
`npm run build`.
