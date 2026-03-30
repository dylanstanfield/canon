import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { parseDirectory, createSnapshot, getLastSnapshotId } from '../src/parse.ts'
import { diffSnapshots, formatChangeFile } from '../src/diff.ts'
import { checkIntegrity } from '../src/check.ts'
import { getStatus } from '../src/status.ts'
import { ORIGIN_UUID } from '../src/types.ts'
import type { Journal } from '../src/types.ts'

const TMP = join(import.meta.dirname, 'fixtures/_tmp_integration')
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

describe('end-to-end flow', () => {
  it('bootstrap → edit → generate → check → status', () => {
    // 1. Create initial requirements
    writeReq('product.md', '# My App\n\n## Overview\n\n- A project management tool\n')
    writeReq('auth/login.md', '# Login\n\n## Credential Authentication\n\n- Validate username and password\n- Return session token on success\n')
    writeReq('architecture.md', '# Architecture\n\n## Framework\n\n- Next.js 15\n- TypeScript strict mode\n')

    // 2. Parse and create initial snapshot
    const reqs1 = parseDirectory(REQ_DIR)
    const snapshot1 = createSnapshot(reqs1)

    const ts1 = Math.floor(snapshot1.generatedAt / 1000)
    writeFileSync(join(CANON_DIR, `snapshots/${ts1}_snapshot.json`), JSON.stringify(snapshot1, null, 2))

    const journal: Journal = {
      version: '1',
      entries: [{
        ticket: `CANON-${ts1}`,
        tag: 'initial_bootstrap',
        when: snapshot1.generatedAt,
        snapshotId: snapshot1.id,
      }],
    }
    writeFileSync(join(CANON_DIR, 'journal.json'), JSON.stringify(journal, null, 2))
    writeFileSync(
      join(CANON_DIR, `changes/CANON-${ts1}_initial_bootstrap.md`),
      `# CANON-${ts1}: Initial bootstrap\n\n<added>\n(all requirements)\n</added>\n`,
    )

    // 3. Verify initial state is clean
    const check1 = checkIntegrity(CANON_DIR, REQ_DIR)
    expect(check1.valid).toBe(true)

    const status1 = getStatus(CANON_DIR, REQ_DIR)
    expect(status1.initialized).toBe(true)
    expect(status1.requirementCount).toBe(3)
    expect(status1.pendingChanges).toHaveLength(0)

    // 4. Edit a requirement
    writeReq('auth/login.md', '# Login\n\n## Credential Authentication\n\n- Validate username and password\n- Return session token on success\n- Lock account after 5 failed attempts\n')

    // 5. Status should detect pending changes
    const status2 = getStatus(CANON_DIR, REQ_DIR)
    expect(status2.pendingChanges).toContain('auth/login')

    // 6. Generate new snapshot and diff
    const reqs2 = parseDirectory(REQ_DIR)
    const prevId = getLastSnapshotId(CANON_DIR)
    expect(prevId).toBe(snapshot1.id)

    const snapshot2 = createSnapshot(reqs2, prevId)
    // Ensure distinct timestamp from snapshot1
    snapshot2.generatedAt = snapshot1.generatedAt + 1000
    const diff = diffSnapshots(snapshot1, snapshot2)

    expect(diff).not.toBeNull()
    expect(diff!.modified).toHaveLength(1)
    expect(diff!.modified[0].file).toBe('auth/login')

    // 7. Write the new artifacts
    const ts2 = Math.floor(snapshot2.generatedAt / 1000)
    writeFileSync(join(CANON_DIR, `snapshots/${ts2}_snapshot.json`), JSON.stringify(snapshot2, null, 2))

    const changeContent = formatChangeFile(`CANON-${ts2}`, 'add-account-lockout', diff!)
    writeFileSync(join(CANON_DIR, `changes/CANON-${ts2}_add-account-lockout.md`), changeContent)

    journal.entries.push({
      ticket: `CANON-${ts2}`,
      tag: 'add-account-lockout',
      when: snapshot2.generatedAt,
      snapshotId: snapshot2.id,
    })
    writeFileSync(join(CANON_DIR, 'journal.json'), JSON.stringify(journal, null, 2))

    // 8. Verify chain is still valid
    const check2 = checkIntegrity(CANON_DIR, REQ_DIR)
    expect(check2.valid).toBe(true)

    // 9. Status should show no pending changes
    const status3 = getStatus(CANON_DIR, REQ_DIR)
    expect(status3.pendingChanges).toHaveLength(0)
    expect(status3.totalChanges).toBe(2)
    expect(status3.latestTicket).toBe(`CANON-${ts2}`)

    // 10. Verify change file content
    const changeFile = readFileSync(join(CANON_DIR, `changes/CANON-${ts2}_add-account-lockout.md`), 'utf-8')
    expect(changeFile).toContain('<modified>')
    expect(changeFile).toContain('auth/login')
    expect(changeFile).toContain('Lock account after 5 failed attempts')
  })
})
