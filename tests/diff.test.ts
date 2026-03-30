import { describe, it, expect } from 'vitest'
import { diffSnapshots, formatChangeFile } from '../src/diff.ts'
import type { Snapshot } from '../src/types.ts'

function makeSnapshot(requirements: Snapshot['requirements'], overrides?: Partial<Snapshot>): Snapshot {
  return {
    version: '1',
    id: 'snap-new',
    prevId: 'snap-old',
    generatedAt: Date.now(),
    requirements,
    ...overrides,
  }
}

describe('diffSnapshots', () => {
  it('returns null when snapshots are identical', () => {
    const reqs = {
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Validate credentials'] },
      },
    }
    const prev = makeSnapshot(reqs, { id: 'snap-old' })
    const curr = makeSnapshot(reqs, { id: 'snap-new', prevId: 'snap-old' })

    expect(diffSnapshots(prev, curr)).toBeNull()
  })

  it('detects an added file', () => {
    const prev = makeSnapshot({})
    const curr = makeSnapshot({
      'auth/mfa': {
        title: 'MFA',
        sections: { 'TOTP': ['Prompt for TOTP code'] },
      },
    })

    const diff = diffSnapshots(prev, curr)!
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0]).toEqual({
      file: 'auth/mfa',
      section: 'TOTP',
      items: ['Prompt for TOTP code'],
    })
    expect(diff.removed).toHaveLength(0)
    expect(diff.modified).toHaveLength(0)
  })

  it('detects a removed file', () => {
    const prev = makeSnapshot({
      'auth/mfa': {
        title: 'MFA',
        sections: { 'TOTP': ['Prompt for TOTP code'] },
      },
    })
    const curr = makeSnapshot({})

    const diff = diffSnapshots(prev, curr)!
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0].file).toBe('auth/mfa')
    expect(diff.added).toHaveLength(0)
  })

  it('detects an added section in an existing file', () => {
    const prev = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Validate credentials'] },
      },
    })
    const curr = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: {
          'Auth': ['Validate credentials'],
          'Recovery': ['Send reset email'],
        },
      },
    })

    const diff = diffSnapshots(prev, curr)!
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0]).toEqual({
      file: 'auth/login',
      section: 'Recovery',
      items: ['Send reset email'],
    })
  })

  it('detects a removed section', () => {
    const prev = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: {
          'Auth': ['Validate credentials'],
          'Recovery': ['Send reset email'],
        },
      },
    })
    const curr = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Validate credentials'] },
      },
    })

    const diff = diffSnapshots(prev, curr)!
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0].section).toBe('Recovery')
  })

  it('detects modified content in a section', () => {
    const prev = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Return token in cookie'] },
      },
    })
    const curr = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Return token in cookie with SameSite=Strict'] },
      },
    })

    const diff = diffSnapshots(prev, curr)!
    expect(diff.modified).toHaveLength(1)
    expect(diff.modified[0]).toEqual({
      file: 'auth/login',
      section: 'Auth',
      old: ['Return token in cookie'],
      new: ['Return token in cookie with SameSite=Strict'],
    })
  })

  it('handles mixed changes across multiple files', () => {
    const prev = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Validate credentials'] },
      },
      'payments/billing': {
        title: 'Billing',
        sections: { 'Invoices': ['Generate monthly invoice'] },
      },
    })
    const curr = makeSnapshot({
      'auth/login': {
        title: 'Login',
        sections: { 'Auth': ['Validate credentials and MFA'] },
      },
      'auth/mfa': {
        title: 'MFA',
        sections: { 'TOTP': ['Prompt for code'] },
      },
    })

    const diff = diffSnapshots(prev, curr)!
    expect(diff.added).toHaveLength(1)
    expect(diff.added[0].file).toBe('auth/mfa')
    expect(diff.removed).toHaveLength(1)
    expect(diff.removed[0].file).toBe('payments/billing')
    expect(diff.modified).toHaveLength(1)
    expect(diff.modified[0].file).toBe('auth/login')
  })
})

describe('formatChangeFile', () => {
  it('generates markdown with XML tags from diff result', () => {
    const diff = {
      added: [{ file: 'auth/login', section: 'MFA', items: ['Prompt for TOTP code'] }],
      modified: [{
        file: 'auth/login',
        section: 'Auth',
        old: ['Return token in cookie'],
        new: ['Return token in cookie with SameSite=Strict'],
      }],
      removed: [],
    }

    const output = formatChangeFile('CANON-1743177600', 'Add MFA requirement', diff)

    expect(output).toContain('# CANON-1743177600: Add MFA requirement')
    expect(output).toContain('<added>')
    expect(output).toContain('**auth/login** § MFA')
    expect(output).toContain('Prompt for TOTP code')
    expect(output).toContain('</added>')
    expect(output).toContain('<modified>')
    expect(output).toContain('~~Return token in cookie~~')
    expect(output).toContain('Return token in cookie with SameSite=Strict')
    expect(output).toContain('</modified>')
    expect(output).toContain('<removed>')
    expect(output).toContain('(none)')
    expect(output).toContain('</removed>')
  })
})
