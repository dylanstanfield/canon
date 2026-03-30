import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { ORIGIN_UUID } from './types.js';
export function checkIntegrity(canonDir, _requirementsDir) {
    const errors = [];
    // Read journal
    let journal;
    try {
        journal = JSON.parse(readFileSync(join(canonDir, 'journal.json'), 'utf-8'));
    }
    catch {
        return { valid: false, errors: ['journal.json not found or invalid'] };
    }
    // Read all snapshots
    let snapshotFiles;
    try {
        snapshotFiles = readdirSync(join(canonDir, 'snapshots'))
            .filter(f => f.endsWith('_snapshot.json'))
            .sort();
    }
    catch {
        snapshotFiles = [];
    }
    const snapshots = snapshotFiles.map(f => JSON.parse(readFileSync(join(canonDir, 'snapshots', f), 'utf-8')));
    const snapshotIdSet = new Set(snapshots.map(s => s.id));
    // Check: journal entries reference existing snapshots
    for (const entry of journal.entries) {
        if (!snapshotIdSet.has(entry.snapshotId)) {
            errors.push(`Journal entry "${entry.ticket}" references missing snapshot: ${entry.snapshotId}`);
        }
    }
    // Check: no orphaned snapshots
    const journalSnapshotIds = new Set(journal.entries.map(e => e.snapshotId));
    for (const snap of snapshots) {
        if (!journalSnapshotIds.has(snap.id)) {
            errors.push(`Orphaned snapshot: ${snap.id} has no journal entry`);
        }
    }
    // Check: no duplicate timestamps
    const timestamps = new Set();
    for (const entry of journal.entries) {
        if (timestamps.has(entry.when)) {
            errors.push(`duplicate timestamp in journal: ${entry.when}`);
        }
        timestamps.add(entry.when);
    }
    // Check: snapshot chain integrity
    if (snapshots.length > 0) {
        if (snapshots[0].prevId !== ORIGIN_UUID) {
            errors.push(`First snapshot's prevId should be origin UUID, got: ${snapshots[0].prevId}`);
        }
        for (let i = 1; i < snapshots.length; i++) {
            if (snapshots[i].prevId !== snapshots[i - 1].id) {
                errors.push(`Broken chain: snapshot ${snapshots[i].id} has prevId ${snapshots[i].prevId}, ` +
                    `expected ${snapshots[i - 1].id}`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [canonDir, requirementsDir] = process.argv.slice(2);
    if (!canonDir || !requirementsDir) {
        console.error('Usage: check <canon-dir> <requirements-dir>');
        process.exit(1);
    }
    const result = checkIntegrity(canonDir, requirementsDir);
    if (result.valid) {
        console.log('All checks passed.');
    }
    else {
        console.error('Integrity errors found:');
        for (const error of result.errors)
            console.error(`  - ${error}`);
        process.exit(1);
    }
}
