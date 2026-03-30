# Canon

Structured requirements for AI-native development. Canon builds and maintains a living spec — requirements are the source of truth, not code.

## Architecture

Canon is a Claude Code plugin. AI operations are plugin skills (markdown). Mechanical operations are TypeScript compiled to JS. Zero runtime dependencies — only Node.js built-ins.

```
.claude-plugin/
  plugin.json            Only the manifest goes here
skills/                  Markdown skill files (at plugin root, NOT inside .claude-plugin/)
src/                     Core logic (TypeScript, each file doubles as a standalone script)
dist/                    Compiled JS (run npm run build)
tests/                   Vitest tests
  fixtures/              Test requirement files
```

## Development

```bash
npm run build      # compile src/ → dist/
npm test           # run all tests
npm run test:watch # watch mode
```

Source is TypeScript, compiled to JS via `tsc`. Each `src/` module doubles as a standalone script (main guard at the bottom). Skills call them directly: `node ${CLAUDE_PLUGIN_ROOT}/dist/<name>.js`. Tests use Vitest which runs TypeScript directly.

## TDD

This project is built with red-green TDD. When adding new functionality:
1. Write a failing test first
2. Write the minimal code to make it pass
3. Refactor

## Key conventions

- **Zero runtime dependencies.** Only Node.js built-ins (fs, path, crypto, url). No npm packages at runtime.
- **Source imports use `.js` extensions.** Standard Node16 ESM convention — TypeScript resolves `.js` to `.ts` at compile time. Vitest handles it natively.
- **`src/` modules are both libraries and scripts.** Each has a main guard at the bottom. Tests import them as modules. Skills call them via `node dist/<name>.js`.
- **Skills are markdown.** They contain instructions for Claude, not executable code. Don't unit test them.
- **Fixtures live in `tests/fixtures/`.** Tests that need filesystem state create temp directories under `tests/fixtures/_tmp_*` and clean up in `afterEach`.
- **Snapshot format.** See `src/types.ts` for the `Snapshot`, `Journal`, and `RequirementFile` interfaces.
- **Change files use XML tags.** `<added>`, `<modified>`, `<removed>` for agent-optimized parsing.
- **Timestamps, not sequential IDs.** Ticket numbers use unix timestamps (`CANON-1743177600`) to avoid collisions across team members.
- **Build before testing scripts.** Run `npm run build` after changing `src/` to update dist/.
