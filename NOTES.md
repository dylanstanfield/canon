# Canon — Product Requirements Document

Structured requirements for AI-native development. Canon builds and maintains a living spec — a machine-readable, human-authored contract that describes what a system does. Git is the backing store. Canon is the spec layer; it doesn't orchestrate implementation.

## 1. Plugin Structure

Canon is a Claude Code plugin. AI operations are skills (markdown). Mechanical operations are TypeScript compiled to JS. Zero runtime dependencies — only Node.js built-ins.

```
canon/
  .claude-plugin/
    plugin.json
    skills/
      init.md
      propose.md
      generate.md
      verify.md
      status.md
      check.md
      undo.md
  src/                     Core logic (TypeScript, each file doubles as a standalone script)
    types.ts
    parse.ts
    diff.ts
    generate.ts            Single atomic operation: parse → diff → write all artifacts
    check.ts
    status.ts
    undo.ts                Removes last snapshot + change file + journal entry
  dist/                    Compiled JS — skills call: node ${CLAUDE_PLUGIN_ROOT}/dist/<name>.js
```

### plugin.json

```json
{
  "name": "canon",
  "version": "0.1.0",
  "description": "Structured requirements for AI-native development"
}
```

## 2. User Project Structure

Canon creates and manages the following in a user's repository.

### Single-repo mode

```
my-app/
  canon.config.json
  .canon/
    journal.json
    snapshots/
      1743091200_snapshot.json
    changes/
      CANON-1743091200_initial_bootstrap.md
  requirements/
    product.md
    _shared/
    architecture.md
    testing.md
    deployment.md
    auth/
      login.md
      session-management.md
    payments/
      invoicing.md
  src/
    ...
```

### Multi-repo mode

```
canon-hub/
  canon.config.json
  .canon/
    journal.json
    snapshots/
    changes/
  requirements/
    _shared/
      conventions.md
      api-standards.md
    authkit-nextjs/
      architecture.md
      testing.md
      session.md
      cookies.md
    cli/
      architecture.md
      commands.md
```

### canon.config.json

Single-repo:

```json
{
  "version": 1,
  "mode": "single",
  "prefix": "CANON"
}
```

Multi-repo:

```json
{
  "version": 1,
  "mode": "multi",
  "prefix": "CANON",
  "projects": {
    "authkit-nextjs": {
      "repo": "org/authkit-nextjs",
      "path": "requirements/authkit-nextjs/",
      "localPath": "~/dev/authkit-nextjs"
    },
    "cli": {
      "repo": "org/cli",
      "path": "requirements/cli/",
      "localPath": "~/dev/cli"
    }
  }
}
```

## 3. Data Formats

### Requirement files

Plain markdown. Canon uses lists and prose by default. If a user prefers numbered lists, Canon doesn't get in the way.

Two categories exist as an authoring convention (not a system boundary):
- **Functional** — observable behavior ("when X happens, the system shall Y")
- **Technical** — architecture, patterns, conventions ("auth uses middleware pattern")

Canon's machinery treats all requirement files identically.

Metadata is derived from the filesystem:
- **Feature** = filename (`login.md` → `login`)
- **Bounded context** = parent directory (`auth/login.md` → `auth`)

Cross-context requirements live in `_shared/`.

**Granularity test**: could an agent implement this requirement in two different languages/frameworks and still satisfy it? If yes, the granularity is right.

### Snapshot (`<timestamp>_snapshot.json`)

Complete JSON representation of all requirements at a point in time. Linked list via `id`/`prevId`.

```json
{
  "version": "1",
  "id": "a1b2c3d4-...",
  "prevId": "00000000-0000-0000-0000-000000000000",
  "generatedAt": 1743091200000,
  "requirements": {
    "auth/login": {
      "title": "Login",
      "sections": {
        "Credential Authentication": [
          "When a user submits valid credentials, the system shall:",
          "  - Create a session token with a 24-hour TTL",
          "  - Return the token in an HTTP-only cookie"
        ]
      }
    },
    "architecture": {
      "title": "Architecture",
      "sections": {
        "Framework": [
          "Next.js 15 with App Router",
          "TypeScript strict mode"
        ],
        "Patterns": [
          "Auth uses middleware pattern in src/middleware.ts"
        ]
      }
    }
  }
}
```

No per-requirement IDs. Snapshots capture complete state. To correct a generated snapshot, run `/canon undo` and regenerate.

### Journal (`journal.json`)

Ordered index of all changes. Each entry has a ticket number (`<prefix>-<timestamp>`) using the generation timestamp to avoid collisions across team members working in parallel.

```json
{
  "version": "1",
  "entries": [
    {
      "ticket": "CANON-1743091200",
      "tag": "initial_bootstrap",
      "when": 1743091200000,
      "snapshotId": "a1b2c3d4-..."
    },
    {
      "ticket": "CANON-1743177600",
      "tag": "add_mfa_requirement",
      "when": 1743177600000,
      "snapshotId": "e5f6a7b8-..."
    }
  ]
}
```

### Change file (`<ticket>_<name>.md`)

Structured diff between two snapshots. Each change file is a ticket — referenceable in commits (`implements CANON-1743177600`), PRs, and conversations. Timestamps avoid collisions when multiple team members generate changes in parallel. Optimized for agent comprehension, secondarily human-readable. XML tags for unambiguous section boundaries. Single format — no redundant representations. Name is auto-generated by AI from the diff content.

```markdown
# CANON-1743177600: Add MFA requirement

<added>
- **auth/login** § Credential Authentication
  - When MFA is enabled for an account, the system shall:
    - Prompt for a TOTP code after credential validation
    - Reject the login if the code is invalid or expired
</added>

<modified>
- **auth/login** § Credential Authentication
  - ~~Return the token in an HTTP-only cookie~~
    → Return the token in an HTTP-only cookie with `SameSite=Strict`
</modified>

<removed>
(none)
</removed>
```

### Requirement lifecycle

```
draft → proposed → approved → implementing → implemented → verified
```

| State | Meaning | Transition trigger |
|-------|---------|-------------------|
| draft | Being written | — |
| proposed | Requirements PR open | Git: PR opened |
| approved | Requirements PR merged | Git: PR merged |
| implementing | Implementation in progress | External / manual |
| implemented | Implementation complete | External / manual |
| verified | Code matches spec | `/canon verify` |

## 4. Scripts

All scripts are TypeScript compiled to JS. Zero runtime dependencies — only Node.js built-ins. Skills call them directly: `node ${CLAUDE_PLUGIN_ROOT}/dist/<name>.js`. Each module doubles as both an importable library (for tests) and a standalone script (main guard at the bottom).

### generate.ts (primary script)

**Input**: `<requirements-dir> <canon-dir> <prefix> <name>`
**Output**: Writes snapshot + change file + journal atomically. Prints ticket or "No changes detected."
**Behavior**:
- Parses all requirements → JSON snapshot
- Loads last snapshot, diffs against new one
- If no changes, exits without writing anything
- Otherwise writes all three artifacts (snapshot, change file, journal) in one operation

### undo.ts

**Input**: `<canon-dir>`
**Output**: Removes last snapshot + change file + journal entry. Prints undone ticket or "Nothing to undo."

### parse.ts

**Input**: `<requirements-dir> [canon-dir]`
**Output**: JSON snapshot to stdout.
**Behavior**: Recursively reads `.md` files, parses h1 → title, h2 → sections, list items/prose → content.

### diff.ts

**Input**: `<prev-snapshot> <curr-snapshot> <ticket> <name>`
**Output**: Structured change file markdown with XML tags, or "No changes detected."

### status.ts

**Input**: `<canon-dir> <requirements-dir>`
**Output**: Formatted status report.

### check.ts

**Input**: `<canon-dir> <requirements-dir>`
**Output**: Validation report. Exit code 0 = valid, 1 = errors.

## 5. Skills

### `/canon init` — Bootstrap requirements (incremental)

Works in two modes:
- `/canon init` — scan codebase, propose hierarchy, create scaffold (empty files)
- `/canon init auth/login` — bootstrap ONE specific context (read related code, interview human, write that file)

Requirement files are the checkpoint. Written files persist across sessions. One context per session is fine. This solves the context window problem — don't try to bootstrap everything at once.

### `/canon propose` — Draft a requirements change

AI-assisted drafting. Reads current requirements and code, drafts markdown changes from natural language, presents for review. After approval, tells user to run `/canon generate`.

### `/canon generate` — Snapshot and diff

Calls `generate.js` atomically. Skill's only job: name the change (short kebab-case slug), then call the script. Script does parse → diff → write all artifacts in one operation. Nothing written on failure.

### `/canon verify` — Drift detection (scoped)

AI-powered. Scoped: `/canon verify auth/login` verifies one context.

Uses code location annotations when present:
```markdown
## Credential Authentication
<!-- code: src/auth/login.ts, src/auth/middleware.ts -->
```
Falls back to grep when no annotations, flagged as low confidence.

### `/canon undo` — Undo last generate

Calls `undo.js`. Removes last snapshot + change file + journal entry. Deterministic.

### `/canon status` — Lifecycle overview

Calls `status.js`. Shows latest snapshot, pending changes, requirement counts.

### `/canon check` — Validate integrity

Calls `check.js`. Validates snapshot chain, journal consistency. Can be wired as pre-commit hook.

## 6. Core Principles

- **Requirements are the source of truth.** Code implements requirements, not the other way around.
- **Task = requirements diff.** A task is the delta between current and desired spec. A bug fix is a zero-diff task — requirements didn't change, code drifted.
- **Git-native.** Diffs are first-class. Full history, blame, branching. CI can validate that code changes have corresponding requirements changes.
- **Enforce mechanically, not rhetorically.** Pre-commit hooks and CI reject malformed requirements. Schema validation ensures machine-readability.
- **Canon doesn't implement.** It produces structured spec diffs that any tool can consume — Claude Code, Agent Teams, Cursor, a human.

## 7. Drizzle Parallel

Canon's snapshot system is modeled after Drizzle ORM's approach to tracking schema changes.

| Drizzle | Canon |
|---------|-------|
| TypeScript schema files | Markdown requirement files |
| `meta/<N>_snapshot.json` | `.canon/snapshots/<N>_snapshot.json` |
| `<N>_<name>.sql` | `.canon/changes/<N>_<name>.md` |
| `meta/_journal.json` | `.canon/journal.json` |
| `drizzle-kit generate` | `/canon generate` |
| `drizzle-kit introspect` | `/canon init` |
| `drizzle-kit check` | `/canon check` |
| `drizzle-kit push` | Direct editing (no formal tracking) |
| `__drizzle_migrations` table | `/canon verify` output |

Key difference: Drizzle's `introspect` is deterministic (reads database catalogs). Canon's `init` requires AI (reads code, understands behavior, interviews human). This is why Canon is a plugin, not a CLI.

## Appendix: Design Decisions

- **No sidecars.** Snapshots replace `.canon.json` companion files. Metadata derived from filesystem paths.
- **No per-requirement IDs.** Snapshots capture complete state. Edit after generating → `/canon undo` and regenerate.
- **No required numbering.** Lists and prose by default. Numbering is the user's choice.
- **Functional = technical in machinery.** Two categories are an authoring convention, not a system boundary.
- **Plugin only.** No CLI/MCP/SDK until a concrete need arises. Skills for AI work, scripts for mechanical work.
- **Change format: structured summary.** XML-tagged `<added>`, `<modified>`, `<removed>` sections. Single format, no redundancy. Research shows structured summaries outperform unified diffs for agent task comprehension.
- **Change names: AI auto-generated.** From diff content, not user-provided or random.
- **Verify: AI analysis.** Deep code reading, not lightweight pattern matching. Output only, not persisted.
- **Cross-context: `_shared/` directory.** For requirements spanning multiple bounded contexts.
- **No changes = skip.** `/canon generate` detects no diff and exits cleanly.
- **product.md format: TBD.** Determined during `/canon init` implementation.
- **Issue tracker integration: deferred.** Build the core first.
- **Atomic generate.** `generate.js` does parse → diff → write all artifacts in one call. Skill only provides the name.
- **Undo.** `undo.js` removes last snapshot + change file + journal entry. No manual file deletion.
- **Incremental init.** `/canon init` scaffolds, `/canon init <context>` bootstraps one context. Files are the checkpoint.
- **Code location annotations.** `<!-- code: src/auth/login.ts -->` in requirements. Verify uses them for high-confidence code mapping, falls back to grep.
- **Scoped verify.** `/canon verify auth/login` instead of verifying everything.
- **Zero runtime deps.** Only Node.js built-ins (fs, path, crypto, url). No npm packages at runtime.
