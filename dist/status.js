import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { parseDirectory } from './parse.js';
import { diffSnapshots } from './diff.js';
export function getStatus(canonDir, requirementsDir) {
    // Read journal
    let journal;
    try {
        journal = JSON.parse(readFileSync(join(canonDir, 'journal.json'), 'utf-8'));
    }
    catch {
        return { initialized: false, totalChanges: 0, requirementCount: 0, pendingChanges: [] };
    }
    if (journal.entries.length === 0) {
        return { initialized: false, totalChanges: 0, requirementCount: 0, pendingChanges: [] };
    }
    // Get latest entry
    const latest = journal.entries[journal.entries.length - 1];
    // Read latest snapshot
    let snapshotFiles;
    try {
        snapshotFiles = readdirSync(join(canonDir, 'snapshots'))
            .filter(f => f.endsWith('_snapshot.json'))
            .sort();
    }
    catch {
        snapshotFiles = [];
    }
    let latestSnapshot = null;
    if (snapshotFiles.length > 0) {
        const lastFile = snapshotFiles[snapshotFiles.length - 1];
        latestSnapshot = JSON.parse(readFileSync(join(canonDir, 'snapshots', lastFile), 'utf-8'));
    }
    const requirementCount = latestSnapshot
        ? Object.keys(latestSnapshot.requirements).length
        : 0;
    // Detect pending changes
    const pendingChanges = [];
    if (latestSnapshot) {
        const current = parseDirectory(requirementsDir);
        const tempSnapshot = {
            ...latestSnapshot,
            id: 'temp',
            prevId: latestSnapshot.id,
            requirements: current,
        };
        const diff = diffSnapshots(latestSnapshot, tempSnapshot);
        if (diff) {
            const files = new Set();
            for (const e of [...diff.added, ...diff.removed])
                files.add(e.file);
            for (const e of diff.modified)
                files.add(e.file);
            pendingChanges.push(...files);
        }
    }
    return {
        initialized: true,
        latestTicket: latest.ticket,
        latestTag: latest.tag,
        totalChanges: journal.entries.length,
        requirementCount,
        pendingChanges,
    };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [canonDir, requirementsDir] = process.argv.slice(2);
    if (!canonDir || !requirementsDir) {
        console.error('Usage: status <canon-dir> <requirements-dir>');
        process.exit(1);
    }
    const status = getStatus(canonDir, requirementsDir);
    if (!status.initialized) {
        console.log('Canon is not initialized. Run /canon init to get started.');
    }
    else {
        console.log(`Latest: ${status.latestTicket} (${status.latestTag})`);
        console.log(`Total changes: ${status.totalChanges}`);
        console.log(`Requirements: ${status.requirementCount}`);
        if (status.pendingChanges.length > 0) {
            console.log('\nPending changes (run /canon generate):');
            for (const f of status.pendingChanges)
                console.log(`  - ${f}`);
        }
        else {
            console.log('\nNo pending changes.');
        }
    }
}
