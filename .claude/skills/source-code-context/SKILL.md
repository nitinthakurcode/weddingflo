---
name: source-code-context
description: Use when Claude is guessing API names or framework behavior from incomplete or stale docs, or keeps hallucinating functions that don't exist. Shows how to put real package/repo source on disk and make Claude search the actual implementation before coding. Use when integrating any SDK, API client, framework, or open-source tool.
---

# Source Code as Agent Context

## Overview

Code is often the best source of truth. Docs go stale, examples are incomplete, blog posts lag the current API. When Claude can search the actual repo/package source, it finds real function names, types, examples, and edge cases instead of guessing. Use this skill to stop Claude from hallucinating APIs.

## When to Use

- Integrating a package, SDK, API client, framework, or open-source tool.
- Claude keeps inventing functions that don't exist.
- Docs are weak, stale, or too abstract.
- You want Claude to follow the package's actual internal patterns.

Do not paste an entire repo into the chat — that bloats context. Put the source on disk and point Claude at it.

## Setup (Claude Code native)

1. Identify the package/repo you depend on.
2. Put its source in a predictable, clearly named folder. Two good options:
   - Vendor it: `reference/repos/github.com/<org>/<project>`
   - Or clone on demand: `gh repo clone <org>/<project> reference/repos/github.com/<org>/<project>`
   - You can also point Claude straight at the already-installed copy in `node_modules/<pkg>` or your language's package cache when that's the exact version you ship.
3. Register the convention in `CLAUDE.md` (project memory) so every future session knows it:

```md
## Reference sources
When working with <library/tool>, search the local source under
`reference/repos/github.com/<org>/<project>` (or `node_modules/<pkg>`).
Do not guess API names. Search the source first, then implement.
```

4. In a session, drop Claude onto the right files fast with `@` file references or by telling it to use **Grep/Glob** (or the **Explore** subagent) over the reference folder.

## Feature Prompt Template

```md
Build <feature>. We use <library/tool>.

Before coding:
1. Search `reference/repos/github.com/<org>/<project>` (or node_modules/<pkg>)
   for the correct API and current patterns. Use Grep/Glob/Explore — do not load the whole repo.
2. Tell me which files/functions/examples you referenced.
3. Implement only the minimal service function plus one calling route/component.
4. Keep the diff small.
```

## Example

```md
We need to integrate Daytona sandboxes into this app.
Search the local Daytona source under `reference/repos/github.com/daytonaio/daytona`
for the current SDK pattern to create a sandbox and run a command.
Then implement only the minimal service function and one calling route.
Report which source files you used.
```

## Common Pitfalls

1. **Dumping a whole repo into chat.** Let Claude search files on disk with Grep/Glob/Explore.
2. **Trusting old docs over current code.** Fast-moving packages change quickly — read the version you actually depend on.
3. **Letting Claude swap in an alternative package** when it can't find an API. Make it search the source first before adding any dependency.
4. **No path convention.** Use a stable folder name and record it in `CLAUDE.md` so every future agent knows where references live.

## Verification Checklist

- [ ] Reference source exists in a stable, named folder (or the exact installed version is targeted).
- [ ] The convention is recorded in `CLAUDE.md`.
- [ ] Claude reported which files/functions it referenced.
- [ ] No random replacement package was installed without approval.
- [ ] The implementation matches current source-code patterns, not stale docs.

---

Related skills: `agentic-engineering-workflow`.
Adapted for Claude Code from David Ondrej / Michael Shimeles interview notes (Micky Podcast).
