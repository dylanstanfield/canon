---
name: undo
description: Undo the last /canon generate — removes the most recent snapshot, change file, and journal entry.
user_invocable: true
---

# /canon undo

Undo the last generate operation.

## Steps

1. **Find the project root.** Look for `canon.config.json` in the current directory or parent directories.

2. **Run the undo script:**
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/dist/undo.js <canon-dir>
   ```

3. **Report the result.** Tell the user which ticket was undone, or that there was nothing to undo.
