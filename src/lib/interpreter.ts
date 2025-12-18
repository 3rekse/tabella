import { create } from 'zustand';

// Constants
export const MAX_ROWS = 16;
export const MAX_COLS = 16;

// Types
export type Color = 'R' | 'G' | 'B';

export interface Cell {
    color: Color | null;
}

export type Grid = Cell[][];

export type CommandType = 'START' | 'COLOR';

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

export type Command = StartCommand | ColorCommand;

export interface ProgramState {
    sourceCode: string;
    commands: Command[];
    targetGrid: Grid | null; // The goal
    currentGrid: Grid | null; // The current state during execution
    pc: number; // Program Counter (current line index in commands array, NOT source line)
    isRunning: boolean;
    error: string | null;
    completionStatus: 'idle' | 'success' | 'failure';
}

interface InterpreterActions {
    setSourceCode: (code: string) => void;
    setTargetGrid: (grid: Grid) => void;
    reset: () => void;
    step: () => void;
    run: () => void;
    stop: () => void;
    loadProgram: (code: string) => void;
}

// Helpers
const createEmptyGrid = (rows: number, cols: number): Grid => {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ color: null }))
    );
};

// Parser
const parseLine = (line: string, lineNumber: number): Command | null => {
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

    // Color Command: count color row col
    // <numero celle da colorare> <colore R/G/B <numero riga da colorare > >numero colonna da colorare>
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

    throw new Error(`Syntax Error on line ${lineNumber + 1}: Invalid command format.`);
};

export const useInterpreterStore = create<ProgramState & InterpreterActions>((set, get) => ({
    sourceCode: '',
    commands: [],
    targetGrid: null,
    currentGrid: null,
    pc: 0,
    isRunning: false,
    error: null,
    completionStatus: 'idle',

    setSourceCode: (code) => {
        set({ sourceCode: code });
    },

    setTargetGrid: (grid) => set({ targetGrid: grid }),

    loadProgram: (code) => {
        try {
            const lines = code.split('\n');
            const commands: Command[] = [];
            let startCmdFound = false;

            for (let i = 0; i < lines.length; i++) {
                const cmd = parseLine(lines[i], i);
                if (cmd) {
                    if (cmd.type === 'START') {
                        if (startCmdFound) {
                            throw new Error(`Error on line ${i + 1}: Multiple definition of table dimensions.`);
                        }
                        if (cmd.rows > MAX_ROWS || cmd.cols > MAX_COLS) {
                            throw new Error(`Error on line ${i + 1}: Table dimensions exceed max ${MAX_ROWS}x${MAX_COLS}.`);
                        }
                        startCmdFound = true;
                    } else if (cmd.type === 'COLOR') {
                        if (!startCmdFound) {
                            throw new Error(`Error on line ${i + 1}: Color command before table definition.`);
                        }
                    }
                    commands.push(cmd);
                }
            }

            set({ sourceCode: code, commands, error: null, pc: 0, currentGrid: null, completionStatus: 'idle' });
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    reset: () => {
        // Re-initialize grid based on start command if exists
        const { commands } = get();
        const startCmd = commands.find(c => c.type === 'START') as StartCommand | undefined;

        if (startCmd) {
            set({
                currentGrid: createEmptyGrid(startCmd.rows, startCmd.cols),
                pc: 0,
                error: null,
                isRunning: false,
                completionStatus: 'idle'
            });
        } else {
            set({ currentGrid: null, pc: 0, error: null, isRunning: false, completionStatus: 'idle' });
        }
    },

    step: () => {
        const { commands, currentGrid, pc, error } = get();

        if (error || pc >= commands.length) {
            set({ isRunning: false });
            // Check win condition functionality could go here or be a separate check
            return;
        }

        const cmd = commands[pc];

        try {
            let nextGrid = currentGrid;

            // If it's the first command (START), initialize the grid
            if (cmd.type === 'START') {
                nextGrid = createEmptyGrid(cmd.rows, cmd.cols);
            } else if (cmd.type === 'COLOR') {
                if (!nextGrid) throw new Error("Internal Error: Grid not initialized.");

                // Validate bounds
                if (cmd.row >= nextGrid.length) throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Row ${cmd.row} out of bounds.`);
                if (cmd.col >= nextGrid[0].length) throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Column ${cmd.col} out of bounds.`);

                // Validate filling logic
                // "if the numbers of cells to color + the initial column exceeds the number of defined columns"
                if (cmd.col + cmd.count > nextGrid[0].length) {
                    throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Filling exceeds column bounds.`);
                }

                // Apply Color
                // We need to clone the grid to maintain immutability for React
                nextGrid = nextGrid.map(row => [...row]);
                for (let i = 0; i < cmd.count; i++) {
                    nextGrid[cmd.row][cmd.col + i] = { color: cmd.color };
                }
            }

            set({
                currentGrid: nextGrid,
                pc: pc + 1,
                // Automatically stop if we reached the end
                isRunning: pc + 1 < commands.length
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
    }
}));
