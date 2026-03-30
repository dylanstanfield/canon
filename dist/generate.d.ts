export interface GenerateResult {
    status: 'generated' | 'no-changes';
    ticket?: string;
}
export declare function generate(requirementsDir: string, canonDir: string, prefix: string, name: string): GenerateResult;
