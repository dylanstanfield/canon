---
name: init
description: Bootstrap Canon requirements from an existing codebase. Use /canon init to scaffold the hierarchy, or /canon init <context> to bootstrap a specific context.
user_invocable: true
---

# /canon init

Bootstrap Canon requirements. This skill works in two modes:

- `/canon init` — scan the codebase, propose a hierarchy, create the scaffold
- `/canon init auth/login` — bootstrap requirements for one specific context

Requirement files are the checkpoint. If a file has content, that context is done. If it's empty, it still needs work. Sessions can end at any time — progress is saved in the files.

## Mode 1: Scaffold (`/canon init` with no arguments)

### Steps

1. **Check for existing setup.** If `canon.config.json` already exists, ask the user if they want to re-initialize or if they meant to bootstrap a specific context (`/canon init <context>`).

2. **Scan the codebase.** Use Grep, Read, and Glob to:
   - Identify the tech stack (framework, language, key libraries)
   - Find logical groupings: bounded contexts, feature areas, modules
   - Focus on the project's directory structure — don't read every file

3. **Propose a hierarchy.** Present it using AskUserQuestion:
   ```
   requirements/
     product.md
     architecture.md
     testing.md
     auth/
       login.md
       session-management.md
     payments/
       invoicing.md
   ```
   Ask the user to confirm, rename, merge, split, or remove contexts. Incremental adoption is fine — they don't have to document everything.

4. **Ask for the prefix.** Default is `"CANON"`. The user might want something project-specific.

5. **Scaffold.** Create:
   - `canon.config.json` with version, mode, and prefix
   - `requirements/` directory with empty `.md` files matching the approved hierarchy
   - `.canon/` directory (empty)

6. **Tell the user what's next.** They should run `/canon init <context>` for each context they want to document, starting with the most important one.

## Mode 2: Bootstrap one context (`/canon init <context>`)

### Steps

1. **Find the project root.** Look for `canon.config.json`.

2. **Identify the target file.** The argument maps to a file under `requirements/`. For example, `auth/login` maps to `requirements/auth/login.md`.

3. **Read relevant source code.** This is the focused step — read only the code that relates to this specific context. Use Grep to find related files. Read at most 10-15 source files to stay within context limits.

4. **Draft requirements.** Based on what you see the code doing, draft requirements for this context. Use lists and prose. Follow the granularity principle: describe observable behavior, not implementation details.

5. **Interview the human.** Present the draft and ask:
   - "Here's what I see this code doing. Is this correct?"
   - "Are there edge cases I'm missing?"
   - "What's the expected behavior when [X] happens?"
   - "Is there behavior in the code that shouldn't exist?"
   Use AskUserQuestion. Be relentless — don't accept vague answers.

6. **Write the file.** Write the finalized requirements to the target file.

7. **Optionally add code location annotations.** If you found the relevant source files, add them as comments:
   ```markdown
   ## Credential Authentication
   <!-- code: src/auth/login.ts, src/auth/middleware.ts -->
   ```
   These help `/canon verify` find the right code later.

8. **Suggest next steps.** Tell the user which contexts still have empty files (need bootstrapping) and suggest running `/canon generate` when they're ready to snapshot.

## Important

- **One context per session is fine.** Don't try to bootstrap everything at once.
- **Files are the checkpoint.** Written files persist across sessions. If a session crashes, restart with the same context.
- **Technical requirements (architecture, testing).** For these, extract patterns from the codebase and ask the human to confirm. These tend to be faster to bootstrap.
- **Don't rush.** A good initial spec saves enormous time later.
