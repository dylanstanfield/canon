export interface CheckResult {
    valid: boolean;
    errors: string[];
}
export declare function checkIntegrity(canonDir: string, _requirementsDir: string): CheckResult;
