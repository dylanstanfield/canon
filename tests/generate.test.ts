import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { generate } from '../src/generate.js'
import { ORIGIN_UUID } from '../src/types.js'
import type { Snapshot, Journal } from '../src/types.js'

const TMP = join(import.meta.dirname, 'fixtures/_tmp_generate')
const CANON_DIR = join(TMP, '.canon')
const REQ_DIR = join(TMP, 'requirements')

function writeReq(path: string, content: string) {
  const full = join(REQ_DIR, path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

beforeEach(() => {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(CANON_DIR, 'snapshots'), { recursive: true })
  mkdirSync(join(CANON_DIR, 'changes'), { recursive: true })
  mkdirSync(REQ_DIR, { recursive: true })
})

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('generate', () => {
  it('creates initial snapshot, change file, and journal on first run', () => {
    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n')

    const result = generate(REQ_DIR, CANON_DIR, 'CANON', 'initial-bootstrap')

    expect(result.status).toBe('generated')
    expect(result.ticket).toMatch(/^CANON-\d+$/)

    // Snapshot written
    const snapshots = readdirSync(join(CANON_DIR, 'snapshots')).filter(f => f.endsWith('_snapshot.json'))
    expect(snapshots).toHaveLength(1)

    // Change file written
    const changes = readdirSync(join(CANON_DIR, 'changes')).filter(f => f.endsWith('.md'))
    expect(changes).toHaveLength(1)
    expect(changes[0]).toContain('initial-bootstrap')

    // Journal created
    const journal: Journal = JSON.parse(readFileSync(join(CANON_DIR, 'journal.json'), 'utf-8'))
    expect(journal.entries).toHaveLength(1)
    expect(journal.entries[0].ticket).toBe(result.ticket)
    expect(journal.entries[0].tag).toBe('initial-bootstrap')
  })

  it('detects changes and appends to existing journal', async () => {
    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n')

    // First generate
    const result1 = generate(REQ_DIR, CANON_DIR, 'CANON', 'initial-bootstrap')

    // Edit requirements (wait for distinct timestamp)
    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n- Lock after 5 failures\n')

    // Ensure distinct second-level timestamp
    await new Promise(r => setTimeout(r, 1100))

    // Second generate
    const result2 = generate(REQ_DIR, CANON_DIR, 'CANON', 'add-account-lockout')

    expect(result2.status).toBe('generated')
    expect(result2.ticket).not.toBe(result1.ticket)

    // Journal has 2 entries
    const journal: Journal = JSON.parse(readFileSync(join(CANON_DIR, 'journal.json'), 'utf-8'))
    expect(journal.entries).toHaveLength(2)

    // 2 snapshots
    const snapshots = readdirSync(join(CANON_DIR, 'snapshots')).filter(f => f.endsWith('_snapshot.json'))
    expect(snapshots).toHaveLength(2)

    // Change file contains the diff
    const changes = readdirSync(join(CANON_DIR, 'changes'))
    const changeFile = changes.find(f => f.includes('add-account-lockout'))!
    const content = readFileSync(join(CANON_DIR, 'changes', changeFile), 'utf-8')
    expect(content).toContain('<modified>')
    expect(content).toContain('Lock after 5 failures')
  })

  it('returns no-changes when requirements have not changed', () => {
    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n')
    generate(REQ_DIR, CANON_DIR, 'CANON', 'initial-bootstrap')

    // Run again without editing
    const result = generate(REQ_DIR, CANON_DIR, 'CANON', 'no-op')

    expect(result.status).toBe('no-changes')

    // Still only 1 snapshot
    const snapshots = readdirSync(join(CANON_DIR, 'snapshots')).filter(f => f.endsWith('_snapshot.json'))
    expect(snapshots).toHaveLength(1)
  })

  it('creates .canon directories if they do not exist', () => {
    rmSync(CANON_DIR, { recursive: true, force: true })
    writeReq('auth/login.md', '# Login\n\n## Auth\n\n- Validate credentials\n')

    const result = generate(REQ_DIR, CANON_DIR, 'CANON', 'initial-bootstrap')

    expect(result.status).toBe('generated')
    expect(existsSync(join(CANON_DIR, 'snapshots'))).toBe(true)
    expect(existsSync(join(CANON_DIR, 'changes'))).toBe(true)
    expect(existsSync(join(CANON_DIR, 'journal.json'))).toBe(true)
  })
})
