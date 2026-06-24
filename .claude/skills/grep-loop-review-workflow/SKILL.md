---
name: grep-loop-review-workflow
description: Use when you have a small PR or feature and want Claude to repeatedly fix review feedback until tests pass and the PR is merge-ready. Works with Claude's own /code-review and /review, AI reviewers, Greptile-style review, or human feedback. Do not use on massive PRs or unclear product decisions.
---

# Grep Loop Review Workflow

## Overview

An auto-research-style loop for code review:

1. Create a small PR.
2. Let a review tool, AI reviewer, or human inspect it.
3. Feed the review back to the coding agent.
4. Agent fixes the feedback.
5. Review again.
6. Repeat until the PR is clean and tests pass.

The loop works best when the PR is small and the success condition is clear.

## When to Use

- You have a small PR/feature ready for review.
- Review feedback is specific enough to act on.
- Tests or typechecks can confirm the fix.
- You want the agent to keep going until the review is clean.

Do not use on massive PRs or unclear product decisions.

## Claude Code review tools

- `/code-review` — reviews the current working diff for correctness bugs and reuse/simplification cleanups. Add `--fix` to apply findings, `--comment` to post inline PR comments.
- `/review` — reviews a specific pull request.
- `/security-review` — security pass on pending changes.
- `/loop /code-review` — run a review on a recurring interval while you iterate.
- `gh pr diff`, `gh pr view`, `gh pr checks` (via Bash) — pull the diff, comments, and CI status for the agent to act on.

## Review-Fix Prompt

```md
Run a review-fix loop for this PR.

Inputs:
- Current branch: <branch-name>
- Review feedback: <paste feedback, or point to /code-review output / `gh pr view` comments>
- Required end state: tests pass, reviewer issues resolved, no unrelated rewrites.

Rules:
1. Read the PR diff first (`git diff` or `gh pr diff`).
2. Read the review feedback.
3. Fix only issues that are real and relevant to this PR.
4. Add or update tests for each bug fix when possible.
5. Run the relevant tests/typechecks.
6. Commit/push the fix only if this workflow is allowed to push.
7. Stop only when the PR is clean or when blocked by a decision that needs a human.
```

## Pre-Flight Check

Before starting the loop, ask:

```md
Is this PR too large for a reliable review loop? If yes, suggest how to split it.
```

If yes, split the PR first.

## Human Guardrails

- Use the loop on small PRs.
- Reviewers (human or AI) produce false positives — don't blindly accept every comment.
- Agents can over-fix and rewrite unrelated code. Constrain scope explicitly.
- A clean review is not proof the product is valuable; it only means this diff looks clean.

## Common Pitfalls

1. **Thousands of lines in one PR.** Both reviewer and coding agent lose accuracy.
2. **No tests.** The loop needs objective checks, not vibes.
3. **Blindly accepting every review comment.** Some are wrong or irrelevant.
4. **No stop condition.** Define "done" before starting.

## Verification Checklist

- [ ] PR is small enough to review reliably.
- [ ] Agent read the diff before editing.
- [ ] Agent fixed only relevant issues.
- [ ] Tests/typechecks passed, or blockers were stated.
- [ ] Final summary lists resolved review items.

---

Related skills: `agentic-engineering-workflow`, `code-structure-cleanup`.
Adapted for Claude Code from David Ondrej / Michael Shimeles interview notes (Micky Podcast).
