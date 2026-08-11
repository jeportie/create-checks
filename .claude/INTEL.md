# INTEL — Lessons Learned

Every agent reads this at startup and applies these lessons. Append a new entry whenever you learn a
durable lesson or make a mistake worth never repeating.

<!-- Format: - **[Category]**: mistake → what to do instead -->

- **[CI Gate]**: `checks` and `e2e-gen` are STRICT required checks on `dev` and `main`. Never bypass them. Run `npm run check` and `npm run e2e:gen` locally and confirm green before opening a PR.
- **[Merge Gate]**: `dev`/`main` require one human approval. Agents OPEN PRs (`gh pr create`) and STOP — never run `gh pr merge`. The human (CEO) approves and merges.
- **[TDD]**: Wrote implementation before the test → ALWAYS Red-Green-Refactor. Write the failing test first, watch it fail for the right reason, then write the minimum code to pass.
- **[Requirements Fidelity]**: Reworded a user's issue and changed its meaning (CF-001/CF-008) → copy user-provided statements verbatim when asked, and verify exact polarity/decision text before creating or editing issues.
- **[Scope Control]**: Logged issues for out-of-scope / unimplemented areas → only record issues for currently implemented scope unless the human explicitly asks for forward-looking backlog items.
- **[Requirement Drift]**: Kept an old assumption after the human changed direction → treat the latest human directive as the source of truth and update the issue/plan text immediately.
- **[Shell Safety]**: A scripted interactive prompt appeared to hang → prefer deterministic non-interactive reproduction; the CLI is promptless in non-TTY (`NO_INSTALL=1` + env vars like `PROJECT_TYPE`, `VITEST_PRESET`).
- **[Test Execution]**: Parallel Vitest runs with coverage raced on `coverage/.tmp` → run Vitest sequentially (or in one invocation) when coverage outputs share a temp dir.
- **[Spellcheck]**: New committed docs / agent files reddened the `checks` gate → add new vocabulary to `cspell.json` (it scans `**/*.{js,mjs,cjs,md,json,yml}` and commit messages) before committing.
- **[Spellcheck/cspell tokenization]**: A template literal `\n\n<lowercase-word>` in source (e.g. `readme.js`) glues the `\n`'s trailing `n` to the word → a bogus token (the `n` from `\n` joined to `oxlint`) that whitelisting the real word will NOT fix. The rendered output is fine (real newlines). Split the source string (concatenation) to break the token — never whitelist the fake glued word. Capitalized words (`\n\nBiome`) dodge this via cspell's camelCase splitter.
- **[Branch staleness]**: A feature branch's config can drift behind `dev` (this branch's `cspell.json` lacked `oxlint/oxfmt/Groq/ECONNREFUSED`; `npm run check` doesn't even exist as a script here or on dev — the gate is the 5 commands run individually). Before assuming a red gate is your change, diff config against `origin/dev` (`git show origin/dev:cspell.json`). Local `npm run spellcheck` scans ALL on-disk tracked files incl. planning docs (`TODO.md`, `docs/superpowers/*`).
