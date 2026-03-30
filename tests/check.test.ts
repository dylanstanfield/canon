import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { checkIntegrity } from '../src/check.ts'
import { ORIGIN_UUID } from '../src/types.ts'

const TMP = join(import.meta.dirname, 'fixtures/_tmp_check')

function setup() {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(TMP, '.canon/snapshots'), { recursive: true })
  mkdirSync(join(TMP, 'requirements'), { recursive: true })
}

function writeSnapshot(filename: string, data: object) {
  writeFileSync(join(TMP, '.canon/snapshots', filename), JSON.stringify(data))
}

function writeJournal(entries: object[]) {
  writeFileSync(
    join(TMP, '.canon/journal.json'),
    JSON.stringify({ version: '1', entries }),
  )
}

function writeRequirement(path: string, content: string) {
  const full = join(TMP, 'requirements', path)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('checkIntegrity', () => {
  it('passes for a valid snapshot chain', () => {
    setup()
    writeSnapshot('1743091200_snapshot.json', {
      version: '1', id: 'snap-1', prevId: ORIGIN_UUID, generatedAt: 1743091200000, requirements: {},
    })
    writeSnapshot('1743177600_snapshot.json', {
      version: '1', id: 'snap-2', prevId: 'snap-1', generatedAt: 1743177600000, requirements: {},
    })
    writeJournal([
      { ticket: 'CANON-1743091200', tag: 'init', when: 1743091200000, snapshotId: 'snap-1' },
      { ticket: 'CANON-1743177600', tag: 'update', when: 1743177600000, snapshotId: 'snap-2' },
    ])
    writeRequirement('product.md', '# Product')

    const result = checkIntegrity(join(TMP, '.canon'), join(TMP, 'requirements'))
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('detects a broken snapshot chain', () => {
    setup()
    writeSnapshot('1743091200_snapshot.json', {
      version: '1', id: 'snap-1', prevId: ORIGIN_UUID, generatedAt: 1743091200000, requirements: {},
    })
    writeSnapshot('1743177600_snapshot.json', {
      version: '1', id: 'snap-2', prevId: 'wrong-id', generatedAt: 1743177600000, requirements: {},
    })
    writeJournal([
      { ticket: 'CANON-1743091200', tag: 'init', when: 1743091200000, snapshotId: 'snap-1' },
      { ticket: 'CANON-1743177600', tag: 'update', when: 1743177600000, snapshotId: 'snap-2' },
    ])

    const result = checkIntegrity(join(TMP, '.canon'), join(TMP, 'requirements'))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('chain'))).toBe(true)
  })

  it('detects journal referencing missing snapshot', () => {
    setup()
    writeJournal([
      { ticket: 'CANON-1743091200', tag: 'init', when: 1743091200000, snapshotId: 'snap-missing' },
    ])

    const result = checkIntegrity(join(TMP, '.canon'), join(TMP, 'requirements'))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('snap-missing'))).toBe(true)
  })

  it('detects orphaned snapshot files', () => {
    setup()
    writeSnapshot('1743091200_snapshot.json', {
      version: '1', id: 'snap-orphan', prevId: ORIGIN_UUID, generatedAt: 1743091200000, requirements: {},
    })
    writeJournal([])

    const result = checkIntegrity(join(TMP, '.canon'), join(TMP, 'requirements'))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('orphan'))).toBe(true)
  })

  it('detects duplicate timestamps in journal', () => {
    setup()
    writeSnapshot('1743091200_snapshot.json', {
      version: '1', id: 'snap-1', prevId: ORIGIN_UUID, generatedAt: 1743091200000, requirements: {},
    })
    writeJournal([
      { ticket: 'CANON-1743091200', tag: 'init', when: 1743091200000, snapshotId: 'snap-1' },
      { ticket: 'CANON-1743091200', tag: 'dupe', when: 1743091200000, snapshotId: 'snap-1' },
    ])

    const result = checkIntegrity(join(TMP, '.canon'), join(TMP, 'requirements'))
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true)
  })
})
