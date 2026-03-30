---
name: check
description: Validate the integrity of Canon's snapshot chain, journal, and requirement files.
user_invocable: true
---

# /canon check

Run the integrity check script and report results.

## Steps

1. **Find the project root.** Look for `canon.config.json` in the current directory or parent directories.

2. **Run the check script:**
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/dist/check.js <canon-dir> <requirements-dir>
   ```

3. **Report the results.** If the script exits 0, tell the user all checks passed. If it exits 1, show the errors and suggest how to fix each one.
