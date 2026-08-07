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
