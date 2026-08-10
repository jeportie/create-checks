---
name: sequential-delivery
description: Use when executing a queue of tasks (a plan, an issue list, a multi-step build). Work strictly one task at a time and advance to the next ONLY when the current one is finished, verified, and tested green — never batch half-done work or parallelize dependent tasks.
---

# Sequential delivery — one task at a time, finished before the next

Do work **strictly sequentially**. Exactly one task is "in progress" at any moment. You may not start
the next task until the current one is **finished, verified, and tested** — actually working, with
evidence, not just "code written."

## The loop (repeat per task)
1. **State the task and its done-criteria** before starting — what "working" means, and how you will
   prove it (which tests/checks must be green, which acceptance criteria must hold).
2. **Do only this task.** Do not touch, scaffold, or half-start later tasks. No parallel work on
   dependent tasks.
3. **Verify it works.** Run the tests and the relevant gate (e.g. `npm run check` + `npm run e2e:gen`,
   or the task's specific tests). Read the actual output.
4. **Show the evidence.** Point to the passing result. Evidence before assertion — never claim "done"
   or "working" without having run the check and seen it pass.
5. **Only then advance** to the next task. If it depends on this one, it now has a known-good base.

## Definition of "done"
A task is done when **all** of these hold:
- the change is complete (not a stub or a TODO), and
- its tests pass (add them if missing — a behavior with no test is not done), and
- the repo gates are green for it (`checks`, `e2e-gen`, and any task-specific check), and
- the stated acceptance criteria are demonstrably met.

"It compiles" or "the code is written" is **not** done.

## When a task cannot be finished
Stop. Do **not** skip ahead to an easier task to show motion. Surface the blocker — what you tried, the
failing output, and what you need to proceed — and wait for a decision. A blocked task keeps the queue
paused; that is correct behaviour, not a failure.

## For the crew
- The **orchestrator** dispatches ONE task (or one dependency layer) at a time and waits for `review`
  to open the PR and `quality` to pass before dispatching the next dependent task. Independent tasks
  may run in parallel only when they share no state and no ordering — when in doubt, serialize.
- The **operator** already works cycle-by-cycle (Red → Green → Refactor, one behaviour per commit);
  this skill extends that discipline from cycles up to whole tasks.
- The human gate still holds: "done" for a task that ships code means a PR a human can merge — not a
  merge the agent performed.

## Anti-patterns
- Batching several tasks and declaring them all done at the end.
- Marking a task done because the code exists, without running its tests.
- Jumping to task N+1 while task N is red or unverified.
- Parallelizing tasks that share files or depend on each other's output.
