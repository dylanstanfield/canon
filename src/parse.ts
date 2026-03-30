import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import type { RequirementFile, Snapshot } from './types.js'
import { ORIGIN_UUID, SNAPSHOT_VERSION } from './types.js'

export function parseFile(markdown: string): RequirementFile {
  const lines = markdown.split('\n')
  let title = ''
  let currentSection = ''
  const sections: Record<string, string[]> = {}

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim()
    } else if (line.startsWith('## ')) {
      currentSection = line.slice(3).trim()
      sections[currentSection] = []
    } else if (currentSection && line.trim() !== '') {
      const stripped = line.startsWith('- ') ? line.slice(2) : line
      sections[currentSection].push(stripped)
    }
  }

  return { title, sections }
}

export function parseDirectory(dirPath: string): Record<string, RequirementFile> {
  const results: Record<string, RequirementFile> = {}

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      if (statSync(fullPath).isDirectory()) {
        walk(fullPath)
      } else if (entry.endsWith('.md')) {
        const key = relative(dirPath, fullPath).replace(/\.md$/, '')
        const content = readFileSync(fullPath, 'utf-8')
        results[key] = parseFile(content)
      }
    }
  }

  walk(dirPath)
  return results
}

export function createSnapshot(
  requirements: Record<string, RequirementFile>,
  prevId?: string,
): Snapshot {
  return {
    version: SNAPSHOT_VERSION,
    id: randomUUID(),
    prevId: prevId ?? ORIGIN_UUID,
    generatedAt: Date.now(),
    requirements,
  }
}

export function getLastSnapshotId(canonDir: string): string {
  const snapshotsDir = join(canonDir, 'snapshots')
  let files: string[]
  try {
    files = readdirSync(snapshotsDir).filter(f => f.endsWith('_snapshot.json'))
  } catch {
    return ORIGIN_UUID
  }

  if (files.length === 0) return ORIGIN_UUID

  files.sort()
  const last = files[files.length - 1]
  const snapshot = JSON.parse(readFileSync(join(snapshotsDir, last), 'utf-8'))
  return snapshot.id
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const requirementsDir = process.argv[2]
  const canonDir = process.argv[3]
  if (!requirementsDir) {
    console.error('Usage: parse <requirements-dir> [canon-dir]')
    process.exit(1)
  }
  const requirements = parseDirectory(requirementsDir)
  const prevId = canonDir ? getLastSnapshotId(canonDir) : undefined
  const snapshot = createSnapshot(requirements, prevId)
  console.log(JSON.stringify(snapshot, null, 2))
}
