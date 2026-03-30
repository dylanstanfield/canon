import type { Snapshot } from './types.js';
export interface DiffEntry {
    file: string;
    section: string;
    items: string[];
}
export interface DiffResult {
    added: DiffEntry[];
    modified: {
        file: string;
        section: string;
        old: string[];
        new: string[];
    }[];
    removed: DiffEntry[];
}
export declare function diffSnapshots(prev: Snapshot, curr: Snapshot): DiffResult | null;
export declare function formatChangeFile(ticket: string, name: string, diff: DiffResult): string;
