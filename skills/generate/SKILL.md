---
name: generate
description: Snapshot current requirements and produce a structured change file (the task brief). Run this after editing requirement files.
user-invocable: true
---

# /canon generate

You are generating a Canon snapshot and change file.

## Steps

1. **Find the project root.** Look for `canon.config.json` in the current directory or parent directories. Read it to get the `prefix` (default: `"CANON"`).

2. **Name the change.** Read the requirements files that were modified (use `git diff --name-only` on the `requirements/` directory, or ask the user). Generate a short descriptive slug (3-5 words, kebab-case) for the change.

3. **Run the generate script:**
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/dist/generate.js <requirements-dir> <canon-dir> <prefix> <name>
   ```

4. **Report the result.** If the script outputs "No changes detected.", tell the user. Otherwise, report:
   - The ticket number
   - Suggest they commit the snapshot, change file, and journal together

If the user wants to correct the generated output, tell them to run `/canon undo` and then edit and re-generate.
