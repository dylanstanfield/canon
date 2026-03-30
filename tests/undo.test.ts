import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { undo } from '../src/undo.js'
import { generate } from '../src/generate.js'
import type { Journal } from '../src/types.js'

const TMP = join(import.meta.dirname, 'fixtures/_tmp_undo')
const CANON_DIR = join(TMP, '.canon')
const REQ_DIR = join(TMP, 'requirements')

function writeReq(path: string, content: string) {
  const full = join(REQ_DIR, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(REQ_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('undo', () => {
  it('removes the last snapshot, change file, and journal entry', async () => {
    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n')
    generate(REQ_DIR, CANON_DIR, 'CANON', 'initial-bootstrap')

    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n- Lock after 5 failures\n')
    await new Promise(r => setTimeout(r, 1100))
    const result2 = generate(REQ_DIR, CANON_DIR, 'CANON', 'add-lockout')

    // Verify we have 2 of everything
    expect(readdirSync(join(CANON_DIR, 'snapshots'))).toHaveLength(2)
    expect(readdirSync(join(CANON_DIR, 'changes'))).toHaveLength(2)

    // Undo
    const undoResult = undo(CANON_DIR)

    expect(undoResult.status).toBe('undone')
    expect(undoResult.ticket).toBe(result2.ticket)

    // Now 1 of everything
    expect(readdirSync(join(CANON_DIR, 'snapshots'))).toHaveLength(1)
    expect(readdirSync(join(CANON_DIR, 'changes'))).toHaveLength(1)
    const journal: Journal = JSON.parse(readFileSync(join(CANON_DIR, 'journal.json'), 'utf-8'))
    expect(journal.entries).toHaveLength(1)
  })

  it('returns nothing-to-undo when journal is empty', () => {
    mkdirSync(CANON_DIR, { recursive: true })
    writeFileSync(join(CANON_DIR, 'journal.json'), JSON.stringify({ version: '1', entries: [] }))

    const result = undo(CANON_DIR)
    expect(result.status).toBe('nothing-to-undo')
  })

  it('returns nothing-to-undo when no journal exists', () => {
    mkdirSync(CANON_DIR, { recursive: true })

    const result = undo(CANON_DIR)
    expect(result.status).toBe('nothing-to-undo')
  })
})
