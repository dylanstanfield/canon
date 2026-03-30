import { describe, it, expect } from 'vitest'
import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { parseFile, parseDirectory, createSnapshot, getLastSnapshotId } from '../src/parse.ts'
import { ORIGIN_UUID, SNAPSHOT_VERSION } from '../src/types.ts'

const FIXTURES = join(import.meta.dirname, 'fixtures')

describe('parseFile', () => {
  it('parses a single file with one section', () => {
    const markdown = `# Login

## Credential Authentication

- When a user submits valid credentials, the system shall:
  - Create a session token with a 24-hour TTL
  - Return the token in an HTTP-only cookie`

    const result = parseFile(markdown)

    expect(result).toEqual({
      title: 'Login',
      sections: {
        'Credential Authentication': [
          'When a user submits valid credentials, the system shall:',
          '  - Create a session token with a 24-hour TTL',
          '  - Return the token in an HTTP-only cookie',
        ],
      },
    })
  })

  it('parses a file with multiple sections', () => {
    const markdown = `# Login

## Credential Authentication

- Validate username and password

## Account Recovery

- Send password reset email
- Reset link expires after 1 hour`

    const result = parseFile(markdown)

    expect(result.title).toBe('Login')
    expect(Object.keys(result.sections)).toEqual([
      'Credential Authentication',
      'Account Recovery',
    ])
    expect(result.sections['Credential Authentication']).toEqual([
      'Validate username and password',
    ])
    expect(result.sections['Account Recovery']).toEqual([
      'Send password reset email',
      'Reset link expires after 1 hour',
    ])
  })

  it('preserves nested list hierarchy', () => {
    const markdown = `# Auth

## Rules

- When invalid credentials:
  - Return a 401
  - Increment failed attempt counter
    - After 5 failures, lock for 15 minutes`

    const result = parseFile(markdown)

    expect(result.sections['Rules']).toEqual([
      'When invalid credentials:',
      '  - Return a 401',
      '  - Increment failed attempt counter',
      '    - After 5 failures, lock for 15 minutes',
    ])
  })

  it('captures prose content under sections', () => {
    const markdown = `# Architecture

## Framework

The application uses Next.js 15 with App Router.
TypeScript strict mode is enabled.

## Patterns

All API routes follow the envelope pattern.`

    const result = parseFile(markdown)

    expect(result.sections['Framework']).toEqual([
      'The application uses Next.js 15 with App Router.',
      'TypeScript strict mode is enabled.',
    ])
    expect(result.sections['Patterns']).toEqual([
      'All API routes follow the envelope pattern.',
    ])
  })
})

describe('parseDirectory', () => {
  it('parses all markdown files keyed by relative path', () => {
    const result = parseDirectory(join(FIXTURES, 'basic/requirements'))

    expect(Object.keys(result).sort()).toEqual([
      '_shared/mfa-flow',
      'architecture',
      'auth/login',
    ])
    expect(result['auth/login'].title).toBe('Login')
    expect(result['architecture'].title).toBe('Architecture')
    expect(result['_shared/mfa-flow'].title).toBe('MFA Flow')
  })
})

describe('createSnapshot', () => {
  it('builds a snapshot with metadata and origin prevId', () => {
    const requirements = { 'auth/login': { title: 'Login', sections: {} } }
    const snapshot = createSnapshot(requirements)

    expect(snapshot.version).toBe(SNAPSHOT_VERSION)
    expect(snapshot.id).toMatch(/^[0-9a-f]{8}-/)
    expect(snapshot.prevId).toBe(ORIGIN_UUID)
    expect(snapshot.generatedAt).toBeGreaterThan(0)
    expect(snapshot.requirements).toBe(requirements)
  })

  it('uses provided prevId', () => {
    const requirements = { 'auth/login': { title: 'Login', sections: {} } }
    const snapshot = createSnapshot(requirements, 'abc-123')

    expect(snapshot.prevId).toBe('abc-123')
  })
})

describe('getLastSnapshotId', () => {
  const tmpDir = join(FIXTURES, '_tmp_snapshots')

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns the id of the most recent snapshot', () => {
    const snapshotsDir = join(tmpDir, 'snapshots')
    mkdirSync(snapshotsDir, { recursive: true })

    const snapshot = { version: '1', id: 'snap-abc', prevId: ORIGIN_UUID, generatedAt: 1743091200000, requirements: {} }
    writeFileSync(join(snapshotsDir, '1743091200_snapshot.json'), JSON.stringify(snapshot))

    expect(getLastSnapshotId(tmpDir)).toBe('snap-abc')
  })

  it('returns origin UUID when no snapshots exist', () => {
    mkdirSync(tmpDir, { recursive: true })
    expect(getLastSnapshotId(tmpDir)).toBe(ORIGIN_UUID)
  })
})
