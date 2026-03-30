import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { parseDirectory, createSnapshot } from './parse.js'
import { diffSnapshots, formatChangeFile } from './diff.js'
import type { Journal, Snapshot } from './types.js'

export interface GenerateResult {
  status: 'generated' | 'no-changes'
  ticket?: string
}

export function generate(
  requirementsDir: string,
  canonDir: string,
  prefix: string,
  name: string,
): GenerateResult {
  // Ensure directories exist
  mkdirSync(join(canonDir, 'snapshots'), { recursive: true })
  mkdirSync(join(canonDir, 'changes'), { recursive: true })

  // Parse current requirements
  const requirements = parseDirectory(requirementsDir)

  // Load previous snapshot
  let prevSnapshot: Snapshot | null = null
  const snapshotsDir = join(canonDir, 'snapshots')
  const snapshotFiles = readdirSync(snapshotsDir)
    .filter(f => f.endsWith('_snapshot.json'))
    .sort()

  if (snapshotFiles.length > 0) {
    const lastFile = snapshotFiles[snapshotFiles.length - 1]
    prevSnapshot = JSON.parse(readFileSync(join(snapshotsDir, lastFile), 'utf-8'))
  }

  // Create new snapshot
  const prevId = prevSnapshot?.id
  const newSnapshot = createSnapshot(requirements, prevId)

  // Diff
  if (prevSnapshot) {
    const diff = diffSnapshots(prevSnapshot, newSnapshot)
    if (!diff) {
      return { status: 'no-changes' }
    }

    // Generate ticket
    const timestamp = Math.floor(newSnapshot.generatedAt / 1000)
    const ticket = `${prefix}-${timestamp}`

    // Write snapshot
    writeFileSync(
      join(snapshotsDir, `${timestamp}_snapshot.json`),
      JSON.stringify(newSnapshot, null, 2),
    )

    // Write change file
    const changeContent = formatChangeFile(ticket, name, diff)
    writeFileSync(
      join(canonDir, 'changes', `${ticket}_${name}.md`),
      changeContent,
    )

    // Update journal
    const journal = loadJournal(canonDir)
    journal.entries.push({
      ticket,
      tag: name,
      when: newSnapshot.generatedAt,
      snapshotId: newSnapshot.id,
    })
    writeFileSync(join(canonDir, 'journal.json'), JSON.stringify(journal, null, 2))

    return { status: 'generated', ticket }
  }

  // First snapshot — no diff needed
  const timestamp = Math.floor(newSnapshot.generatedAt / 1000)
  const ticket = `${prefix}-${timestamp}`

  writeFileSync(
    join(snapshotsDir, `${timestamp}_snapshot.json`),
    JSON.stringify(newSnapshot, null, 2),
  )

  // Write initial change file
  const allEntries = Object.entries(requirements).map(([file, req]) =>
    Object.entries(req.sections).map(([section, items]) =>
      ({ file, section, items })
    )
  ).flat()

  const changeContent = formatChangeFile(ticket, name, {
    added: allEntries,
    modified: [],
    removed: [],
  })
  writeFileSync(
    join(canonDir, 'changes', `${ticket}_${name}.md`),
    changeContent,
  )

  // Create journal
  const journal: Journal = {
    version: '1',
    entries: [{
      ticket,
      tag: name,
      when: newSnapshot.generatedAt,
      snapshotId: newSnapshot.id,
    }],
  }
  writeFileSync(join(canonDir, 'journal.json'), JSON.stringify(journal, null, 2))

  return { status: 'generated', ticket }
}

function loadJournal(canonDir: string): Journal {
  const journalPath = join(canonDir, 'journal.json')
  if (existsSync(journalPath)) {
    return JSON.parse(readFileSync(journalPath, 'utf-8'))
  }
  return { version: '1', entries: [] }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [requirementsDir, canonDir, prefix, name] = process.argv.slice(2)
  if (!requirementsDir || !canonDir || !prefix || !name) {
    console.error('Usage: generate <requirements-dir> <canon-dir> <prefix> <name>')
    process.exit(1)
  }
  const result = generate(requirementsDir, canonDir, prefix, name)
  if (result.status === 'no-changes') {
    console.log('No changes detected.')
  } else {
    console.log(`Generated ${result.ticket}`)
  }
}
