---
name: status
description: Show the current state of Canon requirements — latest snapshot, pending changes, requirement counts.
user-invocable: true
---

# /canon status

Run the status script and report results.

## Steps

1. **Find the project root.** Look for `canon.config.json` in the current directory or parent directories.

2. **Run the status script:**
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/dist/status.js <canon-dir> <requirements-dir>
   ```

3. **Display the output** to the user as-is.
