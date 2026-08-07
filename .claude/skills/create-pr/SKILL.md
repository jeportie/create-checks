---
name: create-pr
description: Open a pull request for the tskickstart repo using the standard description template and process — Conventional Commits, semantic-release (no changesets), the E2E matrix, and GitHub issues. Use when the user asks to create or open a PR.
---

# Create PR (tskickstart)

Adapted from the Ledger `create-pr` process for this repo. Differences from Ledger:
**no JIRA, no changesets, no Slack** — tskickstart uses **GitHub issues**,
**Conventional Commits**, and **semantic-release** (commit types drive the version, so
there is no changeset step).

## Gather (ask once, only for what's missing)

1. **Issue** — GitHub issue number/URL, or `N/A`.
2. **Change type** — feat | fix | docs | refactor | test | chore | ci | perf.
3. **Scope** — prompts | generators | templates | utils | cli | backend | frontend |
   npm-lib | app | e2e | ci | docs.
4. **Description** — the problem and the solution (before/after for fixes).
5. **Test coverage** — yes | partial | no (+ why, if not full).
6. **Impact / QA focus** — which project types / generators / templates to exercise.

## Steps

1. **Verify the branch is green** first:
   - `npm run check` (format, lint, typecheck), `npm test`, `npm run test:integration`
   - `npm run e2e:gen` for the affected project type(s) — Tier 1, no network
2. **Commits** use Conventional Commits (`<type>(<scope>): <desc>`) — they drive
   semantic-release. Do **not** add a changeset (this repo has none).
3. **Title:** `<type>(<scope>): <short description>`
   (e.g. `fix(backend): pin prisma to ^6`).
4. **Body:** fill the template below (kept in sync with
   `.github/pull_request_template.md`).
5. **Push + open as draft** — feature work targets `dev` (`main` is release-only):
   ```bash
   git push -u origin HEAD
   gh pr create --draft --base dev --title "<title>" --body-file <body.md>
   ```

## PR body template

```markdown
### Checklist

- [ ] `npm run check` passes (format, lint, typecheck)
- [ ] `npm test` / `npm run test:integration` pass
- [ ] `npm run e2e:gen` passes for the affected project type(s)
- [ ] **Covered by tests.** <!-- explain if partial/none -->
- [ ] Docs / generated README updated if behavior changed
- [ ] Conventional-commit types are correct (they drive the release)

### Description

<!-- Problem: what & why. Solution: how; before/after for fixes. -->

### Impact / QA focus

<!-- Which project types / generators / templates are affected and what to exercise. -->

### Context

- **Issue:** <!-- #123 or N/A -->

---

### For reviewers

- Code matches the linked issue / stated intent.
- Generator/template changes don't break a scaffolded project — check the E2E matrix (`scripts/e2e`).
- The promptless env-var interface (`src/prompts`) stays consistent.
- No undocumented trade-offs; new dependencies are justified.
```

## Notes

- Base branch is `dev` for feature work; `dev → main` is the release PR (semantic-release).
- The Ledger version's `create-changeset` and `slack-pr-message` steps are intentionally
  dropped for this repo.
