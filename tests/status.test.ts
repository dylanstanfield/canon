import { describe, it, expect, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { getStatus } from '../src/status.ts'
import { ORIGIN_UUID } from '../src/types.ts'

const TMP = join(import.meta.dirname, 'fixtures/_tmp_status')

function setup() {
  rmSync(TMP, { recursive: true, force: true })
  mkdirSync(join(TMP, '.canon/snapshots'), { recursive: true })
  mkdirSync(join(TMP, 'requirements'), { recursive: true })
}

afterEach(() => {
  rmSync(TMP, { recursive: true, force: true })
})

describe('getStatus', () => {
  it('reports latest snapshot info', () => {
    setup()
    const snapshot = {
      version: '1', id: 'snap-1', prevId: ORIGIN_UUID, generatedAt: 1743091200000,
      requirements: {
        'auth/login': { title: 'Login', sections: { 'Auth': ['Validate credentials'] } },
        'architecture': { title: 'Architecture', sections: { 'Framework': ['Next.js'] } },
      },
    }
    writeFileSync(join(TMP, '.canon/snapshots/1743091200_snapshot.json'), JSON.stringify(snapshot))
    writeFileSync(join(TMP, '.canon/journal.json'), JSON.stringify({
      version: '1',
      entries: [{ ticket: 'CANON-1743091200', tag: 'initial_bootstrap', when: 1743091200000, snapshotId: 'snap-1' }],
    }))
    mkdirSync(join(TMP, 'requirements/auth'), { recursive: true })
    writeFileSync(join(TMP, 'requirements/auth/login.md'), '# Login\n\n## Auth\n\n- Validate credentials\n')
    writeFileSync(join(TMP, 'requirements/architecture.md'), '# Architecture\n\n## Framework\n\n- Next.js\n')

    const status = getStatus(join(TMP, '.canon'), join(TMP, 'requirements'))

    expect(status.initialized).toBe(true)
    expect(status.latestTicket).toBe('CANON-1743091200')
    expect(status.latestTag).toBe('initial_bootstrap')
    expect(status.totalChanges).toBe(1)
    expect(status.requirementCount).toBe(2)
  })

  it('detects pending changes', () => {
    setup()
    const snapshot = {
      version: '1', id: 'snap-1', prevId: ORIGIN_UUID, generatedAt: 1743091200000,
      requirements: {
        'auth/login': { title: 'Login', sections: { 'Auth': ['Validate credentials'] } },
      },
    }
    writeFileSync(join(TMP, '.canon/snapshots/1743091200_snapshot.json'), JSON.stringify(snapshot))
    writeFileSync(join(TMP, '.canon/journal.json'), JSON.stringify({
      version: '1',
      entries: [{ ticket: 'CANON-1743091200', tag: 'init', when: 1743091200000, snapshotId: 'snap-1' }],
    }))
    mkdirSync(join(TMP, 'requirements/auth'), { recursive: true })
    writeFileSync(join(TMP, 'requirements/auth/login.md'), '# Login\n\n## Auth\n\n- Validate credentials AND MFA\n')

    const status = getStatus(join(TMP, '.canon'), join(TMP, 'requirements'))

    expect(status.pendingChanges).toContain('auth/login')
  })

  it('reports not initialized when no snapshots exist', () => {
    setup()

    const status = getStatus(join(TMP, '.canon'), join(TMP, 'requirements'))

    expect(status.initialized).toBe(false)
  })
})
