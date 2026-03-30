import type { RequirementFile, Snapshot } from './types.js';
export declare function parseFile(markdown: string): RequirementFile;
export declare function parseDirectory(dirPath: string): Record<string, RequirementFile>;
export declare function createSnapshot(requirements: Record<string, RequirementFile>, prevId?: string): Snapshot;
export declare function getLastSnapshotId(canonDir: string): string;
