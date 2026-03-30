---
name: verify
description: Check if the codebase matches the current requirements. Optionally scope to a specific context with /canon verify auth/login.
user_invocable: true
---

# /canon verify

Verify that the codebase matches the current requirements. This is an AI-powered analysis — you read both the requirements and the code, then judge compliance.

## Scoping

- `/canon verify` — verify all requirements (warn if the set is large)
- `/canon verify auth/login` — verify only the `auth/login` context

## Steps

1. **Find the project root.** Look for `canon.config.json`. Read it for mode and project structure.

2. **Load requirements.** If scoped, read only the specified file. Otherwise, read all requirement files under `requirements/`.

3. **Find relevant code.** For each requirement file, use this priority:

   **a. Code location annotations (best).** Look for `<!-- code: ... -->` comments in the requirement file. These point directly to the source files.
   ```markdown
   ## Credential Authentication
   <!-- code: src/auth/login.ts, src/auth/middleware.ts -->
   ```
   If annotations exist, read those files. This is the fastest and most accurate path.

   **b. Grep fallback (when no annotations).** Use Grep to search for keywords from the requirements. Flag results as **low confidence** — tell the user you're guessing at which code implements these requirements.

4. **Assess compliance.** For each requirement, judge:
   - **Satisfied** — the code implements this requirement correctly
   - **Partially implemented** — some aspects are present but incomplete
   - **Drifted** — the code does something different from what the requirement specifies
   - **Missing** — no implementation found

5. **Produce the drift report:**

   ```
   ## Drift Report

   ### Satisfied
   - auth/login § Credential Authentication — all requirements met

   ### Drifted
   - auth/login § Session Management
     - "Create a session token with a 24-hour TTL"
       Drift: Token TTL is set to 1 hour in src/auth/session.ts:42
       Severity: behavioral mismatch

   ### Missing
   - auth/login § MFA
     - No MFA implementation found in the codebase
     - Severity: missing entirely
   ```

6. **Summarize.** One-line: "X of Y requirements satisfied, Z drifted, W missing."

7. **Suggest annotations.** If you used the grep fallback and found the right files, suggest adding `<!-- code: ... -->` annotations to the requirement files so future verifications are faster and more accurate.

## Important

- Be specific about WHERE drift occurs (file + line).
- Don't guess — if you can't find relevant code, say "no implementation found" rather than assuming.
- Annotated requirements are high confidence. Grep-discovered requirements are low confidence — say so.
- The output is conversational only — do not write files.
- For large requirement sets (20+ files), warn the user about token cost and suggest scoped verify.
