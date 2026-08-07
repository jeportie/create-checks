# E2E install matrix

Scaffolds tskickstart into throwaway temp dirs across many prompt combinations and
reports pass/fail as a tree. Complements the vitest integration suite: those tests run
with `NO_INSTALL=1` and only prove files are *generated*; this runner proves generated
projects actually **install, lint, type-check, and build**.

## Two tiers

| Tier | Command | What it does | Speed / network |
| --- | --- | --- | --- |
| **gen** | `npm run e2e:gen` | Scaffold every combination with `NO_INSTALL=1`; assert exit 0 + core files exist. | Fast, **no network**. |
| **verify** | `npm run e2e:verify` | Real install + the generated project's `npm run check` (+ `build`) on a curated subset. | Slow, **needs the npm registry**. |
| both | `npm run e2e` | gen then verify. | |

## Filters (all AND-ed)

```sh
node scripts/e2e/run.mjs --tier=gen --type=backend
node scripts/e2e/run.mjs --only="LINTER=biome"          # every biome branch
node scripts/e2e/run.mjs --tier=gen --db-engine=postgresql --orm=prisma
node scripts/e2e/run.mjs --list --type=frontend         # print combos, don't run
```

`--type`, `--group`, `--linter`, `--framework`, `--db-engine`, `--orm`,
`--only="K=V,K=V"` (raw env vars), `--grep=<regex>`, plus `--concurrency=N`, `--bail`,
`--list`, `--keep`, `--report=<path>`. See `--help`.

## Output

- A `✓ / ✗ / ○(skip)` tree grouped by combination id, then a summary line.
- `e2e-report.json` (machine-readable) in the working dir.
- GitHub Actions job-summary markdown when `$GITHUB_STEP_SUMMARY` is set.

## Environmental prerequisites (verify tier)

The verify tier degrades a step to **skip** (never a false fail) when a prerequisite is
missing:

- **elysia** backend `build` needs [Bun](https://bun.sh) — skipped if `bun` is absent.
- **app** never runs Detox (needs an iOS simulator); it runs install + `check` only.
- **DB / Docker** combos are not started as live services — verify covers install +
  type-check + build, not runtime migrations.
- **prisma** combos run `prisma generate` before `check` so the client types exist.

## Adding combinations

Edit `matrix.mjs`: `GROUPS` (tier 1) and `VERIFY` (tier 2). A dimension maps a short
label to a partial env object; env-var names mirror the CLI's promptless interface
(`src/prompts/*.js`). File manifests (`MANIFESTS`) are intentionally conservative —
tighten them after the first real run.
