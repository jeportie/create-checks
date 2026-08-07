<!-- Open PRs as Draft. All automated checks must pass before "Ready for review". -->

### 📝 Description

<!-- What this PR does and why. -->
<!-- Bug fixes: previous behaviour → the fix → the automated check that prevents regression. -->
<!-- Features: the problem solved and the approach taken. -->
<!-- Generators/templates: note which scaffolded project types are affected. -->

### ✅ Checklist

- [ ] `npm run check` passes (format, lint, typecheck)
- [ ] `npm test` / `npm run test:integration` pass
- [ ] `npm run e2e:gen` passes for the affected project type(s)
- [ ] **Covered by tests** <!-- explain if partial / none -->
- [ ] Docs / generated README updated if behaviour changed
- [ ] Conventional-commit types are correct (they drive the release)

### 🎯 Impact / QA focus

<!-- Which project types / generators / templates are affected and what a reviewer should exercise. -->

### 🔗 Context

- **Issue**: <!-- #123 or N/A -->

---

### 👀 For reviewers

- Code matches the linked issue / stated intent.
- Generator/template changes don't break a scaffolded project — check the E2E matrix (`scripts/e2e`).
- The promptless env-var interface (`src/prompts`) stays consistent.
- No undocumented trade-offs; new dependencies are justified.
