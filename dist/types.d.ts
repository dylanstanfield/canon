export interface RequirementFile {
    title: string;
    sections: Record<string, string[]>;
}
export interface Snapshot {
    version: string;
    id: string;
    prevId: string;
    generatedAt: number;
    requirements: Record<string, RequirementFile>;
}
export interface JournalEntry {
    ticket: string;
    tag: string;
    when: number;
    snapshotId: string;
}
export interface Journal {
    version: string;
    entries: JournalEntry[];
}
export declare const ORIGIN_UUID = "00000000-0000-0000-0000-000000000000";
export declare const SNAPSHOT_VERSION = "1";
