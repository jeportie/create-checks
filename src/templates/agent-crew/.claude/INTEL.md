# INTEL — Lessons Learned

Every agent reads this at startup and applies these lessons. Append a new entry whenever you learn a
durable lesson or make a mistake worth never repeating.

<!-- Format: - **[Category]**: mistake → what to do instead -->

- **[Merge Gate]**: `dev`/`main` require one human approval. Agents OPEN PRs (`gh pr create`) and STOP — never run `gh pr merge`. A human approves and merges.
- **[TDD]**: Wrote implementation before the test → ALWAYS Red-Green-Refactor. Write the failing test first, watch it fail for the right reason, then write the minimum code to pass.
- **[Done means tested]**: "The code is written" is not done. A task is done when it is complete, its tests pass, the CI gates are green, and the acceptance criteria are demonstrably met.
- **[Requirements Fidelity]**: Reworded a user's request and changed its meaning → copy user-provided statements verbatim where they state a decision, and verify exact polarity before acting.
- **[Scope Control]**: Built beyond the ask → only do what the current task requires; surface extra ideas, do not silently implement them.
- **[Sequential delivery]**: Started the next task before finishing the current one → work strictly one task at a time; finish, verify, and test before advancing (see the `sequential-delivery` skill if present).
