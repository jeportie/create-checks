# NEXT: tskickstart — Ready for Main

## Status

All planned features and cleanup tasks are complete on `dev`:

- [x] **Prompt system refactoring** — Monolithic `src/index.js` split into modular `prompts/`, `generators/`, `templates/`, `utils/` architecture
- [x] **Frontend starter** — React + Vite + Tailwind CSS v4 project type with full template and tests
- [x] **Playwright E2E testing** — Optional Playwright scaffold for frontend/fullstack projects
- [x] **Directory renames** — `__tests__/` → `tests/`, `e2e/` → `tests/e2e/`
- [x] **Template bug fixes** — spaced-comment, vitest excludes, vite-env.d.ts, cspell SVG, eslintignore removal
- [x] **`.npmignore` cleanup** — Added doc files, removed obsolete entries

## Next

Merge `dev` → `main` and cut a release.
