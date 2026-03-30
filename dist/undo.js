import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
export function undo(canonDir) {
    const journalPath = join(canonDir, 'journal.json');
    if (!existsSync(journalPath)) {
        return { status: 'nothing-to-undo' };
    }
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    if (journal.entries.length === 0) {
        return { status: 'nothing-to-undo' };
    }
    const last = journal.entries[journal.entries.length - 1];
    // Delete corresponding snapshot
    const snapshotsDir = join(canonDir, 'snapshots');
    for (const file of readdirSync(snapshotsDir)) {
        if (!file.endsWith('_snapshot.json'))
            continue;
        const snap = JSON.parse(readFileSync(join(snapshotsDir, file), 'utf-8'));
        if (snap.id === last.snapshotId) {
            unlinkSync(join(snapshotsDir, file));
            break;
        }
    }
    // Delete corresponding change file
    const changesDir = join(canonDir, 'changes');
    for (const file of readdirSync(changesDir)) {
        if (file.startsWith(last.ticket)) {
            unlinkSync(join(changesDir, file));
            break;
        }
    }
    // Remove journal entry
    journal.entries.pop();
    writeFileSync(journalPath, JSON.stringify(journal, null, 2));
    return { status: 'undone', ticket: last.ticket };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const canonDir = process.argv[2];
    if (!canonDir) {
        console.error('Usage: undo <canon-dir>');
        process.exit(1);
    }
    const result = undo(canonDir);
    if (result.status === 'nothing-to-undo') {
        console.log('Nothing to undo.');
    }
    else {
        console.log(`Undone: ${result.ticket}`);
    }
}
