---
name: agentic-engineering-workflow
description: Use when building software with Claude Code and you want a serious end-to-end workflow instead of vibe coding. Covers harness/model choice, plan-then-build discipline, small reviewable units, source-as-context, cleanup passes, review-fix loops, launch pressure, and security basics. Do not use for one-off tiny edits.
---

# Agentic Engineering Workflow

## Overview

The high-level operating system for building with Claude Code: stay in charge, keep context focused, give the agent tight feedback loops. The human decides the outcome; the agent does the mechanical work; tests and reviews keep the result honest. This is not "ask Claude to build everything and hope."

## When to Use

- Building an MVP, feature, internal tool, or AI-assisted product.
- You want a repeatable workflow instead of random prompting.
- You are early-technical and need simple rules for staying in control.
- You are running Claude Code (in any terminal, including Cursor's integrated terminal).

Do not use for one-off tiny edits where a direct prompt is enough.

## Workflow (Claude Code native)

1. **Use the strongest model + harness you can.** In Claude Code, set the model with `/model` (default to the latest Opus for hard reasoning; Sonnet for speed). The harness — file search, Bash, subagents, plan mode, project memory — is what determines what the model can actually do. Don't fight it; use it.

2. **Plan before you build.** Enter **plan mode** (Shift+Tab to cycle modes, or ask Claude to "plan first, don't edit yet"). For non-trivial tasks, have Claude produce a plan and approve it before any edits. Use the **Plan** subagent for architecture and the **Explore** subagent for read-only codebase reconnaissance — they keep the main context clean.

3. **Keep each task small and reviewable.** One feature, one fix, one PR-sized unit. If a plan is large, ask Claude to split it into smaller chunks and track them with its todo list. Small diffs = reliable review loops.

4. **Give source code as context when docs aren't enough.** For any package/SDK/framework, point Claude at local source (`reference/repos/...`) and register it in `CLAUDE.md`. Make it search the real implementation before coding. See the **source-code-context** skill.

5. **Build the minimal feature first.** Do not refactor the whole app while building. Get the smallest working version running and verified.

6. **Run a cleanup pass.** After it works, have Claude find duplicated runtime mechanics and extract reusable service-layer modules — a separate pass, not mixed with the feature. See the **code-structure-cleanup** and **service-layer-architecture** skills, or run `/simplify`.

7. **Run a review-fix loop.** Use typechecks, tests, and review. In Claude Code: `/code-review` for the working diff, `/review` for a PR, `/security-review` for security-sensitive changes. Feed findings back to the agent and fix until clean or a human decision is needed. See the **grep-loop-review-workflow** skill.

8. **Persist decisions to memory.** Put durable project conventions, commands, and constraints in `CLAUDE.md` (project) or `~/.claude/CLAUDE.md` (global) so future sessions don't re-derive them.

9. **Launch earlier than feels comfortable.** A semi-functional MVP with real feedback beats a perfect private project. Don't hide behind "one more feature."

10. **Apply security guardrails** (below).

## Copy-Paste Starter Prompt

```md
We are building this with an agentic engineering workflow.

Rules:
1. Plan first; do not edit until I approve the plan.
2. Keep the change small and reviewable (one PR-sized unit).
3. Search existing code (Grep/Glob/Explore) before creating new abstractions.
4. If using a package/framework, reference its local source or official repo before guessing APIs.
5. Build the minimal working version first, then verify it.
6. After it works, run a code-structure cleanup pass as a separate step.
7. Run relevant tests/typechecks/lint.
8. Summarize what changed, what was tested, and what still needs human judgment.

Task:
<describe the feature or fix here>
```

## Security Guardrails

- Never install a package less than ~14 days old unless a human explicitly approves it.
- Use 2FA via an authenticator app, not SMS.
- Use a password manager.
- Never paste secrets into prompts, screenshots, or commits. Keep them in `.env.local` (gitignored).
- When a package breach trends, ask Claude to scan local projects for that package/version (`grep` lockfiles).
- Run `/security-review` before merging security-sensitive changes.

## Common Pitfalls

1. **Letting the agent be the product owner.** It's a worker; you decide the outcome.
2. **Overloading context.** More context is not better. Give exact files/folders; lean on Explore for search.
3. **Huge PRs.** Review loops break down past a few hundred changed lines.
4. **No cleanup pass.** Working code can still be duplicated and hard for the next agent to debug.
5. **Skipping plan mode** on non-trivial work, then getting a sprawling unreviewable diff.
6. **Never launching.**

## Verification Checklist

- [ ] Task was split into a small reviewable unit.
- [ ] A plan was approved before editing (for non-trivial work).
- [ ] Agent searched existing code before editing.
- [ ] External package behavior was checked against source or official docs.
- [ ] Feature works locally and was verified.
- [ ] Cleanup pass removed obvious duplication.
- [ ] Tests/typechecks/lint ran, or the reason they couldn't is stated.
- [ ] Security-sensitive changes were reviewed (`/security-review`).

---

Related skills: `source-code-context`, `code-structure-cleanup`, `service-layer-architecture`, `grep-loop-review-workflow`.
Adapted for Claude Code from David Ondrej / Michael Shimeles interview notes (Micky Podcast).
