import { create } from 'zustand';
import { generateChallengeTarget } from './targetGenerator';

// Constants
export const MAX_ROWS = 16;
export const MAX_COLS = 16;

// Types
export type Color = 'R' | 'G' | 'B';

export interface Cell {
    color: Color | null;
}

export type Grid = Cell[][];

export type CommandType = 'START' | 'COLOR' | 'GRID_COLOR';

export interface StartCommand {
    type: 'START';
    rows: number;
    cols: number;
    originalLine: string;
    lineNumber: number;
}

export interface ColorCommand {
    type: 'COLOR';
    count: number;
    color: Color;
    row: number;
    col: number;
    originalLine: string;
    lineNumber: number;
}

export interface GridColorCommand {
    type: 'GRID_COLOR';
    count: number;
    color: Color;
    deltaX: number;
    deltaY: number;
    originalLine: string;
    lineNumber: number;
}

export type Command = StartCommand | ColorCommand | GridColorCommand;

export interface ProgramState {
    mode: 'TABLE' | 'GRID';
    sourceCode: string;
    commands: Command[];
    targetGrid: Grid | null; // The goal
    currentGrid: Grid | null; // The current state during execution
    pc: number; // Program Counter (current line index in commands array, NOT source line)
    isRunning: boolean;
    error: string | null;
    completionStatus: 'idle' | 'success' | 'failure';
    lastPos: { r: number, c: number };
    totalMovements: number;
    timeLeft: number; // in seconds
    isChallengeActive: boolean;
    isLocked: boolean;
    showCertificateModal: boolean;
    lastChallengeTime: number | null; // Timestamp
}

interface InterpreterActions {
    setMode: (mode: 'TABLE' | 'GRID') => void;
    setSourceCode: (code: string) => void;
    setTargetGrid: (grid: Grid) => void;
    reset: () => void;
    step: () => void;
    run: () => void;
    stop: () => void;
    loadProgram: (code: string, updateTarget?: boolean) => void;
    startChallenge: () => void;
    stopChallenge: () => void;
    tickTimer: () => void;
    calculateScore: () => number;
    closeCertificateModal: () => void;
}

// Helpers
const createEmptyGrid = (rows: number, cols: number): Grid => {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ color: null }))
    );
};

// Parser
const parseLine = (line: string, lineNumber: number, mode: 'TABLE' | 'GRID'): Command | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Start Command: rows#cols
    const startMatch = trimmed.match(/^(\d+)#(\d+)$/);
    if (startMatch) {
        return {
            type: 'START',
            rows: parseInt(startMatch[1], 10),
            cols: parseInt(startMatch[2], 10),
            originalLine: line,
            lineNumber,
        };
    }

    if (mode === 'TABLE') {
        // Color Command: count color row col
        const colorMatch = trimmed.match(/^(\d+)\s+([RGB])\s+(\d+)\s+(\d+)$/i);
        if (colorMatch) {
            return {
                type: 'COLOR',
                count: parseInt(colorMatch[1], 10),
                color: colorMatch[2].toUpperCase() as Color,
                row: parseInt(colorMatch[3], 10),
                col: parseInt(colorMatch[4], 10),
                originalLine: line,
                lineNumber,
            };
        }
    } else {
        // GRID Color Command: count color deltaX deltaY
        const gridColorMatch = trimmed.match(/^(\d+)\s+([RGB])\s+([+-]?\d+)\s+([+-]?\d+)$/i);
        if (gridColorMatch) {
            return {
                type: 'GRID_COLOR',
                count: parseInt(gridColorMatch[1], 10),
                color: gridColorMatch[2].toUpperCase() as Color,
                deltaX: parseInt(gridColorMatch[3], 10),
                deltaY: parseInt(gridColorMatch[4], 10),
                originalLine: line,
                lineNumber,
            };
        }
    }

    throw new Error(`Syntax Error on line ${lineNumber + 1}: Invalid command format.`);
};

/**
 * Executes a sequence of commands on a fresh grid to determine the final result.
 * Used for deriving the "Objective" grid from code.
 */
const executeCommandsSilently = (commands: Command[]): Grid | null => {
    let grid: Grid | null = null;
    let lastPos = { r: -1, c: -1 };

    for (const cmd of commands) {
        try {
            if (cmd.type === 'START') {
                grid = createEmptyGrid(cmd.rows, cmd.cols);
                lastPos = { r: -1, c: -1 };
            } else if (cmd.type === 'COLOR' || cmd.type === 'GRID_COLOR') {
                if (!grid) continue;

                let targetRow, targetCol;
                if (cmd.type === 'COLOR') {
                    targetRow = cmd.row;
                    targetCol = cmd.col;
                } else {
                    targetRow = lastPos.r + cmd.deltaY;
                    targetCol = lastPos.c + cmd.deltaX;
                }

                // Basic validation for simulation
                if (targetRow < 0 || targetRow >= grid.length || targetCol < 0 || targetCol >= grid[0].length) {
                    continue; // Skip invalid commands in simulation
                }

                const count = Math.min(cmd.count, grid[0].length - targetCol);
                for (let i = 0; i < count; i++) {
                    grid[targetRow][targetCol + i] = { color: cmd.color };
                }
                lastPos = { r: targetRow, c: targetCol + count - 1 };
            }
        } catch (e) {
            // Ignore errors in simulation
        }
    }
    return grid;
};

export const useInterpreterStore = create<ProgramState & InterpreterActions>((set, get) => ({
    mode: 'TABLE',
    sourceCode: '',
    commands: [],
    targetGrid: null,
    currentGrid: null,
    pc: 0,
    isRunning: false,
    error: null,
    completionStatus: 'idle',
    lastPos: { r: -1, c: -1 },
    totalMovements: 0,
    timeLeft: 0,
    isChallengeActive: false,
    isLocked: false,
    showCertificateModal: false,
    lastChallengeTime: localStorage.getItem('tabella_last_challenge')
        ? parseInt(localStorage.getItem('tabella_last_challenge') || '0')
        : null,

    setMode: (mode) => {
        set({ mode });
        get().loadProgram(get().sourceCode);
    },

    setTargetGrid: (grid) => set({
        targetGrid: grid,
        isChallengeActive: false,
        isLocked: false,
        showCertificateModal: false,
        timeLeft: 0
    }),

    setSourceCode: (code) => {
        set({ sourceCode: code });
    },

    loadProgram: (code, updateTarget = false) => {
        try {
            const mode = get().mode;
            const lines = code.split('\n');
            const commands: Command[] = [];
            let startCmdFound = false;

            for (let i = 0; i < lines.length; i++) {
                const cmd = parseLine(lines[i], i, mode);
                if (cmd) {
                    if (cmd.type === 'START') {
                        if (startCmdFound) {
                            throw new Error(`Error on line ${i + 1}: Multiple definition of table dimensions.`);
                        }
                        if (cmd.rows > MAX_ROWS || cmd.cols > MAX_COLS) {
                            throw new Error(`Error on line ${i + 1}: Table dimensions exceed max ${MAX_ROWS}x${MAX_COLS}.`);
                        }
                        startCmdFound = true;
                    } else if (cmd.type === 'COLOR' || cmd.type === 'GRID_COLOR') {
                        if (!startCmdFound) {
                            throw new Error(`Error on line ${i + 1}: Color command before table definition.`);
                        }
                    }
                    commands.push(cmd);
                }
            }

            const newState: Partial<ProgramState> = {
                sourceCode: code,
                commands,
                error: null,
                pc: 0,
                currentGrid: null,
                completionStatus: 'idle',
                lastPos: { r: -1, c: -1 },
                totalMovements: 0
            };

            if (updateTarget) {
                const simulatedGrid = executeCommandsSilently(commands);
                if (simulatedGrid) {
                    newState.targetGrid = simulatedGrid;
                }
            }

            set(newState as ProgramState);
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    reset: () => {
        const { commands, isChallengeActive, isLocked, timeLeft } = get();
        const startCmd = commands.find(c => c.type === 'START') as StartCommand | undefined;

        const newState: Partial<ProgramState> = {
            pc: 0,
            error: null,
            isRunning: false,
            completionStatus: 'idle',
            lastPos: { r: -1, c: -1 },
            totalMovements: 0
        };

        if (startCmd) {
            newState.currentGrid = createEmptyGrid(startCmd.rows, startCmd.cols);
        } else {
            newState.currentGrid = null;
        }

        // Explicitly preserve challenge state if active
        if (isChallengeActive) {
            newState.isChallengeActive = isChallengeActive;
            newState.isLocked = isLocked;
            newState.timeLeft = timeLeft;
        }

        set(newState as ProgramState);
    },

    step: () => {
        const state = get();
        const { commands, currentGrid, pc, error, lastPos, totalMovements, isRunning } = state;

        if (error || pc >= commands.length) {
            set({ isRunning: false });
            return;
        }

        const cmd = commands[pc];

        try {
            let nextGrid = currentGrid;
            let nextLastPos = lastPos;
            let nextTotalMovements = totalMovements;

            if (cmd.type === 'START') {
                nextGrid = createEmptyGrid(cmd.rows, cmd.cols);
                nextLastPos = { r: -1, c: -1 };
                nextTotalMovements = 0;
            } else if (cmd.type === 'COLOR' || cmd.type === 'GRID_COLOR') {
                if (!nextGrid) throw new Error("Internal Error: Grid not initialized.");

                let targetRow, targetCol;
                if (cmd.type === 'COLOR') {
                    targetRow = cmd.row;
                    targetCol = cmd.col;
                } else {
                    targetRow = lastPos.r + cmd.deltaY;
                    targetCol = lastPos.c + cmd.deltaX;
                    nextTotalMovements += Math.abs(cmd.deltaX) + Math.abs(cmd.deltaY) + (cmd.count > 0 ? cmd.count - 1 : 0);
                }

                // Validate bounds
                if (targetRow < 0 || targetRow >= nextGrid.length) {
                    throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Row ${targetRow} out of bounds.`);
                }
                if (targetCol < 0 || targetCol >= nextGrid[0].length) {
                    throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Column ${targetCol} out of bounds.`);
                }
                if (targetCol + cmd.count > nextGrid[0].length) {
                    throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Filling exceeds column bounds.`);
                }

                // Apply Color
                nextGrid = nextGrid.map(row => [...row]);
                for (let i = 0; i < cmd.count; i++) {
                    nextGrid[targetRow][targetCol + i] = { color: cmd.color };
                }

                // Update last position to the LAST colored cell
                nextLastPos = { r: targetRow, c: targetCol + cmd.count - 1 };
            }

            set({
                currentGrid: nextGrid,
                lastPos: nextLastPos,
                totalMovements: nextTotalMovements,
                pc: pc + 1,
                isRunning: isRunning && pc + 1 < commands.length
            });

        } catch (e: any) {
            set({ error: e.message, isRunning: false, completionStatus: 'failure' });
        }
    },

    run: () => {
        set({ isRunning: true });
        // In a real generic interpreter we might use a interval, 
        // but for this simple logic we can execute all remaining steps immediately 
        // or set an interval in a useEffect in the component. 
        // For now, let's just mark it as running so the UI can drive the loop.
    },

    stop: () => {
        set({ isRunning: false });
    },

    startChallenge: () => {
        const { lastChallengeTime } = get();
        const now = Date.now();
        const LOCKOUT_PERIOD = 30 * 60 * 1000; // 30 mins

        if (lastChallengeTime && (now - lastChallengeTime < LOCKOUT_PERIOD)) {
            const remaining = Math.ceil((LOCKOUT_PERIOD - (now - lastChallengeTime)) / 60000);
            set({ error: `Sfida bloccata. Riprova tra ${remaining} minuti.` });
            return;
        }

        // Import generateChallengeTarget dynamically or just use the imported one (better)
        const challengeTarget = generateChallengeTarget();

        // Count rows that have at least one colored cell in the NEW target
        const coloredRows = challengeTarget.reduce((count, row) => {
            const hasColor = row.some(cell => cell.color !== null);
            return count + (hasColor ? 1 : 0);
        }, 0);

        set({
            targetGrid: challengeTarget,
            timeLeft: coloredRows * 60,
            isChallengeActive: true,
            isLocked: false,
            showCertificateModal: false,
            lastChallengeTime: now,
            pc: 0,
            currentGrid: null,
            error: null,
            completionStatus: 'idle',
            lastPos: { r: -1, c: -1 },
            totalMovements: 0
        });

        localStorage.setItem('tabella_last_challenge', now.toString());

        // Also reset the grid to match the start command
        get().reset();
    },

    stopChallenge: () => {
        set({
            isChallengeActive: false,
            isLocked: true,
            showCertificateModal: true,
            isRunning: false
        });
    },

    tickTimer: () => {
        const { timeLeft, isChallengeActive } = get();
        if (!isChallengeActive) return;

        if (timeLeft <= 1) {
            set({ timeLeft: 0, isChallengeActive: false, isLocked: true, isRunning: false, showCertificateModal: true });
        } else {
            set({ timeLeft: timeLeft - 1 });
        }
    },

    calculateScore: () => {
        const { targetGrid, currentGrid } = get();
        if (!targetGrid || !currentGrid) return 0;

        let correctRows = 0;
        const rows = targetGrid.length;
        const cols = targetGrid[0].length;

        for (let r = 0; r < rows; r++) {
            const hasColorInTarget = targetGrid[r].some(cell => cell.color !== null);

            // If target row is empty, we don't count it for score
            if (!hasColorInTarget) continue;

            let rowMatch = true;
            for (let c = 0; c < cols; c++) {
                const targetColor = targetGrid[r][c].color;
                const currentColor = currentGrid[r][c]?.color || null;
                if (targetColor !== currentColor) {
                    rowMatch = false;
                    break;
                }
            }
            if (rowMatch) {
                correctRows++;
            }
        }
        return correctRows;
    },

    closeCertificateModal: () => set({ showCertificateModal: false })
}));
