---
name: propose
description: Draft a requirements change from a natural language description. AI reads current requirements and code, then drafts specific markdown changes for the user to review.
user_invocable: true
---

# /canon propose

You are helping the user draft a requirements change. Your job is to translate their natural language request into specific, well-structured markdown changes to the requirement files.

## Steps

1. **Find the project root.** Look for `canon.config.json` in the current directory or parent directories. Read it to understand the mode (single/multi) and project structure.

2. **Understand the request.** The user will describe what they want to change in natural language (e.g., "add MFA support to login" or "update the session TTL to 48 hours").

3. **Read current requirements.** Read the relevant requirement files under `requirements/` to understand what exists today. Use Grep and Read to find the files that relate to the user's request.

4. **Read relevant code** (if applicable). If the change relates to existing functionality, scan the codebase to understand the current implementation. This helps write requirements at the right granularity.

5. **Draft the changes.** Write specific markdown changes to the requirement files:
   - For new requirements: draft the full markdown content for new files or new sections
   - For modifications: show the specific lines that change
   - Follow the existing style (lists and prose by default)
   - Follow the granularity principle: describe observable behavior, not implementation details

6. **Present the draft.** Show the user exactly what will change in each file. Use AskUserQuestion to confirm they're happy with the changes, or iterate on the draft.

7. **Write the changes.** Once the user approves, write the changes to the requirement files using the Write or Edit tools.

8. **Remind them to generate.** Tell the user to run `/canon generate` to snapshot the changes and produce the change file.
