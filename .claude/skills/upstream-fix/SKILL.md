---
name: upstream-fix
description: Use when working in a project scaffolded from (or built on) tskickstart and you hit something that belongs upstream — a bug in the generated scaffolding/tooling, or a needed new feature/tool/skill for the generator itself. Contribute it back by opening an issue on the upstream repo instead of only patching locally or forking.
---

# Upstream fix — contribute back to tskickstart

When you are working in a **downstream** project (one scaffolded from, or built on,
`@jeportie/create-tskickstart`) and you discover something that really belongs to the **generator** —
not just your app — do not silently patch around it or fork. Report it upstream so every future
scaffolded project benefits.

## When this applies
- A **bug in the generated scaffolding**: a template, config, script, or generated workflow that
  tskickstart produced is wrong or broken.
- A **missing feature / tool / skill** the generator should offer (a new project type, an install
  option, a new agent skill, etc.).
- **Not** your own application logic — that stays in your project. The test: *did this come from the
  generator/templates, or would fixing it help every scaffolded project?* If yes, it is upstream.

## What to do
1. **Confirm it is upstream.** Trace the file to a tskickstart template/generator (e.g. it matches
   `src/templates/**` or was emitted by a generator). If it is only your app, fix it locally and stop.
2. **Apply a minimal local workaround** if you must, to unblock yourself — and note it, so the upstream
   fix can replace it later.
3. **Open an issue on the upstream repo** (use the bug/feature templates):
   ```bash
   gh issue create --repo jeportie/tskickstart \
     --label bug \            # or: enhancement
     --title "<concise summary>" \
     --body "<what generated it (template/generator path) · repro or proposal · downstream project + link · any local workaround>"
   ```
   Use the bug template's env-var repro form (e.g. `PROJECT_TYPE=backend …`) when relevant, and copy the
   reporter's wording verbatim where it states a decision (Requirements-Fidelity lesson).
4. **Link it back** from your downstream project (a comment or your tracker) so you can adopt the fix
   when it lands.
5. **Small & obvious?** You may also open an upstream PR (`--repo jeportie/tskickstart`, branch → PR to
   `dev`) — but the default is an issue; a human decides, and you never merge upstream yourself.

## Requirements
- The local `gh` must be authenticated with rights to open issues on `jeportie/tskickstart`.
- Write the issue so a classifier can judge scope and usefulness — clear title, concrete repro or
  proposal, and why it belongs in the generator. Upstream it is picked up by the repo's
  [`triage-router`](../triage-router/SKILL.md).
