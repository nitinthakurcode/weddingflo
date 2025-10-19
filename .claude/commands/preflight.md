---
description: Pre-flight checklist verification before code changes
---

STOP. Before proceeding with any code changes, you MUST:

1. **Read the preflight checklist file:**
   - Path: `docs/CLAUDE_PREFLIGHT_CHECKLIST.md`
   - This file contains critical rules and verification steps

2. **Verify against the checklist:**
   - Check if the user's request would modify any critical files
   - Verify database schema before DB operations
   - Apply the decision matrix (Is it broken? Does it work?)
   - Check for anti-patterns

3. **Report your findings:**
   - List any potential issues found
   - Warn about any checklist violations
   - Ask clarifying questions if needed

4. **Only then proceed** with the user's actual request

Remember: This checklist exists to prevent breaking working code, especially authentication.
