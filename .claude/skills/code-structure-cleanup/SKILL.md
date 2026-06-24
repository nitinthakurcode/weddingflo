---
name: code-structure-cleanup
description: Use after a Claude-built feature works but the code has duplicated mechanics, repeated API calls, repeated validation/parsing, or messy structure. Guides a behavior-preserving cleanup pass that extracts reusable service-layer modules with a small, focused diff. Do not use to redesign the whole app.
---

# Code Structure Cleanup After Every Feature

## Overview

Agents take the easiest path: they create new functions instead of reusing existing ones. A feature can work while leaving behind duplicated logic, inconsistent validation, repeated API calls, and code future agents struggle to understand. Run this cleanup pass **after** a feature works — never before.

## When to Use

- A feature works locally but the code feels duplicated or messy.
- Claude created similar helper functions across multiple files.
- You want future agents to pick up the codebase without confusion.
- You want a smaller, cleaner diff before review.

Do not treat this as permission to redesign the whole app.

## What "Service Layer" Means

A place for reusable mechanics: sending an email, streaming an AI response, creating a sandbox, validating a webhook, calling an external API, transforming a payload, parsing/normalizing data. The route/action/component decides **what** should happen; the service handles **how**. See the **service-layer-architecture** skill for the deeper pattern.

## Cleanup Prompt

```md
The feature works. Now do a code-structure cleanup pass — behavior must not change.

Goal:
- Find duplicated runtime mechanics: repeated API calls, repeated parsing,
  repeated validation, or repeated business logic.
- Move repeated mechanics into reusable service-layer functions/modules.
- Keep domain policy in the calling route/action/component.
- Keep the diff small. No user-facing behavior changes.

Process:
1. Inspect the files touched by the feature (start with `git diff`).
2. Identify repeated logic and name the duplication clearly.
3. Propose the smallest service-layer extraction.
4. Implement it.
5. Run the relevant tests/typechecks/lint.
6. Summarize exactly what got simpler.
```

## Claude Code shortcuts

- `git diff` (via Bash) scopes the cleanup to what the feature actually touched.
- `/simplify` applies reuse/simplification cleanups directly.
- `/code-review` (quality + correctness) can surface duplication before you cut the diff.
- Run the project's own checks after — e.g. `npm run type-check`, `npm run lint` (or the equivalents in this repo).

## Good Outcome

Instead of 4 files each with their own slightly different `sendEmail()`, there is one tested email service that all 4 files call.

## Common Pitfalls

1. **Refactoring the whole app.** Keep scope tied to the feature.
2. **Renaming everything.** Naming churn makes PRs hard to review.
3. **Mixing cleanup with a new feature.** Cleanup is a separate pass.
4. **Only formatting code.** Pretty code can still contain duplicated logic.
5. **Moving domain policy into services.** Services handle mechanics, not business decisions.

## Verification Checklist

- [ ] User-facing behavior stayed the same.
- [ ] Repeated mechanics were actually reduced.
- [ ] Calling files became simpler.
- [ ] Relevant tests/typechecks/lint ran.
- [ ] Diff stayed focused on the feature area.

---

Related skills: `service-layer-architecture`, `agentic-engineering-workflow`.
Adapted for Claude Code from David Ondrej / Michael Shimeles interview notes (Micky Podcast).
