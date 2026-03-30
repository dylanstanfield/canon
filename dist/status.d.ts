export interface StatusResult {
    initialized: boolean;
    latestTicket?: string;
    latestTag?: string;
    totalChanges: number;
    requirementCount: number;
    pendingChanges: string[];
}
export declare function getStatus(canonDir: string, requirementsDir: string): StatusResult;
