export interface UndoResult {
    status: 'undone' | 'nothing-to-undo';
    ticket?: string;
}
export declare function undo(canonDir: string): UndoResult;
