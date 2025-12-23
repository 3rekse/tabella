import { create } from 'zustand';
import { generateChallengeTarget } from './targetGenerator';
import { generateMaze, type MazeGrid } from './mazeGenerator';

// Constants
export const MAX_ROWS = 16;
export const MAX_COLS = 16;

// Types
export type Color = 'R' | 'G' | 'B';

export interface Cell {
    color: Color | null;
}

export type Grid = Cell[][];

export type CommandType = 'START' | 'COLOR' | 'GRID_COLOR' | 'RUOTA' | 'MUOVI';

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

export interface RuotaCommand {
    type: 'RUOTA';
    degrees: number; // 90, 180, 270
    originalLine: string;
    lineNumber: number;
}

export interface MuoviCommand {
    type: 'MUOVI';
    steps: number;
    originalLine: string;
    lineNumber: number;
}

export type Command = StartCommand | ColorCommand | GridColorCommand | RuotaCommand | MuoviCommand;

export interface ProgramState {
    mode: 'TABLE' | 'GRID' | 'MAZE';
    sourceCode: string;
    commands: Command[];
    targetGrid: Grid | null; // The goal
    currentGrid: Grid | null; // The current state during execution
    mazeState: {
        walls: MazeGrid['cells'];
        items: MazeGrid['items'];
        exit: { r: number; c: number; } | null;
        visited: { r: number; c: number; }[];
        turtle: { r: number; c: number; dir: number; }; // dir in degrees: 0(right), 90(up), 180(left), 270(down)
    } | null;
    mazeScore: number;
    pc: number; // Program Counter
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
    setMode: (mode: 'TABLE' | 'GRID' | 'MAZE') => void;
    setSourceCode: (code: string) => void;
    setTargetGrid: (grid: Grid) => void;
    reset: (forceNewMaze?: boolean) => void;
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

// Deep copy maze state to prevent reference issues
const deepCopyMazeState = (mazeState: ProgramState['mazeState']): ProgramState['mazeState'] => {
    if (!mazeState) return null;
    return {
        walls: mazeState.walls.map(row => row.map(cell => ({ ...cell }))),
        items: mazeState.items.map(item => ({ ...item })),
        exit: mazeState.exit ? { ...mazeState.exit } : null,
        visited: mazeState.visited.map(v => ({ ...v })),
        turtle: { ...mazeState.turtle }
    };
};

// Parser
const parseLine = (line: string, lineNumber: number, mode: 'TABLE' | 'GRID' | 'MAZE'): Command | null => {
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
    } else if (mode === 'GRID') {
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
    } else if (mode === 'MAZE') {
        const ruotaMatch = trimmed.match(/^ruota\s+([123])$/i);
        if (ruotaMatch) {
            return {
                type: 'RUOTA',
                degrees: parseInt(ruotaMatch[1], 10) * 90,
                originalLine: line,
                lineNumber,
            };
        }

        const muoviMatch = trimmed.match(/^muovi\s+(\d+)$/i);
        if (muoviMatch) {
            return {
                type: 'MUOVI',
                steps: parseInt(muoviMatch[1], 10),
                originalLine: line,
                lineNumber,
            };
        }
    }

    throw new Error(`Syntax Error on line ${lineNumber + 1}: Invalid command format.`);
};

const executeCommandsSilently = (commands: Command[], mode: 'TABLE' | 'GRID' | 'MAZE'): Grid | null => {
    if (mode === 'MAZE') return null; // Logic is different
    let grid: Grid | null = null;
    let lastPos = { r: -1, c: -1 };

    for (const cmd of commands) {
        try {
            if (cmd.type === 'START') {
                grid = createEmptyGrid(cmd.rows, cmd.cols);
                lastPos = { r: -1, c: -1 };
            } else if (cmd.type === 'COLOR') {
                if (!grid) continue;
                const targetRow = cmd.row;
                const targetCol = cmd.col;
                if (targetRow < 0 || targetRow >= grid.length || targetCol < 0 || targetCol >= grid[0].length) continue;
                const count = Math.min(cmd.count, grid[0].length - targetCol);
                for (let i = 0; i < count; i++) {
                    grid[targetRow][targetCol + i] = { color: cmd.color };
                }
                lastPos = { r: targetRow, c: targetCol + count - 1 };
            } else if (cmd.type === 'GRID_COLOR') {
                if (!grid) continue;
                const targetRow = lastPos.r + cmd.deltaY;
                const targetCol = lastPos.c + cmd.deltaX;
                if (targetRow < 0 || targetRow >= grid.length || targetCol < 0 || targetCol >= grid[0].length) continue;
                const count = Math.min(cmd.count, grid[0].length - targetCol);
                for (let i = 0; i < count; i++) {
                    grid[targetRow][targetCol + i] = { color: cmd.color };
                }
                lastPos = { r: targetRow, c: targetCol + count - 1 };
            }
        } catch (e) { }
    }
    return grid;
};

export const useInterpreterStore = create<ProgramState & InterpreterActions>((set, get) => ({
    mode: 'TABLE',
    sourceCode: '',
    commands: [],
    targetGrid: null,
    currentGrid: null,
    mazeState: null,
    mazeScore: 0,
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
        const s = useInterpreterStore.getState();
        s.reset();
        s.loadProgram(s.sourceCode);
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
            const currentMode = get().mode;
            const lines = code.split('\n');
            const commands: Command[] = [];
            let startCmdFound = false;

            for (let i = 0; i < lines.length; i++) {
                const cmd = parseLine(lines[i], i, currentMode);
                if (cmd) {
                    if (cmd.type === 'START') {
                        if (startCmdFound) throw new Error(`Error on line ${i + 1}: Multiple definition of table dimensions.`);
                        if (cmd.rows > MAX_ROWS || cmd.cols > MAX_COLS) throw new Error(`Error on line ${i + 1}: Table dimensions exceed max ${MAX_ROWS}x${MAX_COLS}.`);
                        startCmdFound = true;
                    } else if (cmd.type === 'COLOR' || cmd.type === 'GRID_COLOR') {
                        if (!startCmdFound) throw new Error(`Error on line ${i + 1}: Color command before table definition.`);
                    }
                    commands.push(cmd);
                }
            }

            const newState: Partial<ProgramState> = {
                sourceCode: code,
                commands,
                error: null,
                pc: 0,
                completionStatus: 'idle',
                lastPos: { r: -1, c: -1 },
                totalMovements: 0
            };

            // In MAZE mode, preserve mazeState and currentGrid to prevent regeneration
            if (currentMode === 'MAZE') {
                const currentMazeState = get().mazeState;
                const currentGridState = get().currentGrid;
                if (currentMazeState) {
                    newState.mazeState = deepCopyMazeState(currentMazeState);
                }
                if (currentGridState) {
                    newState.currentGrid = currentGridState;
                }
            } else {
                newState.currentGrid = null;
            }

            if (updateTarget) {
                const simulatedGrid = executeCommandsSilently(commands, currentMode);
                if (simulatedGrid) newState.targetGrid = simulatedGrid;
            }

            set(newState as ProgramState);
        } catch (e: any) {
            set({ error: e.message });
        }
    },

    reset: (forceNewMaze = false) => {
        const { commands, isChallengeActive, isLocked, timeLeft, mode } = get();

        const newState: Partial<ProgramState> = {
            pc: 0,
            error: null,
            isRunning: false,
            completionStatus: 'idle',
            lastPos: { r: -1, c: -1 },
            totalMovements: 0
        };

        if (mode === 'MAZE') {
            const currentMazeState = get().mazeState;
            if (!currentMazeState || forceNewMaze) {
                const maze = generateMaze(16, 16);
                newState.mazeState = {
                    walls: maze.cells,
                    items: maze.items,
                    exit: maze.exit,
                    visited: [{ r: 8, c: 8 }],
                    turtle: { r: 8, c: 8, dir: 0 }
                };
            } else {
                // Preserve the maze structure but reset the game state using deep copy
                const copiedMaze = deepCopyMazeState(currentMazeState);
                if (copiedMaze) {
                    copiedMaze.items = copiedMaze.items.map(item => ({ ...item, collected: false }));
                    copiedMaze.visited = [{ r: 8, c: 8 }];
                    copiedMaze.turtle = { r: 8, c: 8, dir: 0 };
                    newState.mazeState = copiedMaze;
                }
            }
            newState.mazeScore = 0;
            newState.currentGrid = createEmptyGrid(16, 16);
        } else {
            const startCmd = commands.find(c => c.type === 'START') as StartCommand | undefined;
            if (startCmd) {
                newState.currentGrid = createEmptyGrid(startCmd.rows, startCmd.cols);
            } else {
                newState.currentGrid = null;
            }
        }

        if (isChallengeActive) {
            newState.isChallengeActive = isChallengeActive;
            newState.isLocked = isLocked;
            newState.timeLeft = timeLeft;
        }

        set(newState as ProgramState);
    },

    step: () => {
        const state = get();
        const { commands, currentGrid, pc, error, lastPos, totalMovements, isRunning, mode, mazeState } = state;

        if (error || pc >= commands.length) {
            set({ isRunning: false });
            return;
        }

        const cmd = commands[pc];

        try {
            if (mode === 'MAZE') {
                if (!mazeState) throw new Error("Internal Error: Maze not initialized.");
                const { dir, r, c } = mazeState.turtle;

                if (cmd.type === 'RUOTA') {
                    set({
                        mazeState: {
                            ...mazeState,
                            turtle: { ...mazeState.turtle, dir: (dir + cmd.degrees) % 360 }
                        },
                        pc: pc + 1
                    });
                } else if (cmd.type === 'MUOVI') {
                    let currR = r;
                    let currC = c;
                    const steps = cmd.steps;
                    let currItems = [...mazeState.items];
                    let currScore = state.mazeScore;

                    let nextVisited = [...mazeState.visited];

                    for (let s = 0; s < steps; s++) {
                        const currentDir = mazeState.turtle.dir;
                        let nextR = currR;
                        let nextC = currC;
                        let wallToCheck: 'top' | 'right' | 'bottom' | 'left' = 'top';

                        if (currentDir === 0) { nextC++; wallToCheck = 'right'; }
                        else if (currentDir === 90) { nextR--; wallToCheck = 'top'; }
                        else if (currentDir === 180) { nextC--; wallToCheck = 'left'; }
                        else if (currentDir === 270) { nextR++; wallToCheck = 'bottom'; }

                        const currentWalls = mazeState.walls[currR][currC];
                        if (currentWalls[wallToCheck]) {
                            throw new Error(`Collisione con muro rosso alla cella [${currR}, ${currC}].`);
                        }

                        if (nextR < 0 || nextR >= 16 || nextC < 0 || nextC >= 16) {
                            set({ completionStatus: 'success', isRunning: false, mazeScore: currScore });
                            return;
                        }

                        currR = nextR;
                        currC = nextC;

                        if (!nextVisited.some(v => v.r === currR && v.c === currC)) {
                            nextVisited.push({ r: currR, c: currC });
                        }

                        const itemIdx = currItems.findIndex(item => item.r === currR && item.c === currC && !item.collected);
                        if (itemIdx !== -1) {
                            const item = currItems[itemIdx];
                            currScore += (item.type === 'leaf' ? 1 : 2);
                            currItems[itemIdx] = { ...item, collected: true };
                        }
                    }

                    set({
                        mazeState: {
                            ...mazeState,
                            items: currItems,
                            visited: nextVisited,
                            turtle: { ...mazeState.turtle, r: currR, c: currC }
                        },
                        mazeScore: currScore,
                        pc: pc + 1,
                        isRunning: isRunning && pc + 1 < commands.length
                    });
                } else if (cmd.type === 'START') {
                    set({ pc: pc + 1 });
                } else {
                    throw new Error(`Comando ${cmd.type} non supportato in modalità MAZE.`);
                }

            } else {
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
                        targetRow = lastPos.r + (cmd as GridColorCommand).deltaY;
                        targetCol = lastPos.c + (cmd as GridColorCommand).deltaX;
                        nextTotalMovements += Math.abs((cmd as GridColorCommand).deltaX) + Math.abs((cmd as GridColorCommand).deltaY) + (cmd.count > 0 ? cmd.count - 1 : 0);
                    }

                    if (targetRow < 0 || targetRow >= nextGrid.length || targetCol < 0 || targetCol >= nextGrid[0].length) {
                        throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Position out of bounds.`);
                    }
                    if (targetCol + cmd.count > nextGrid[0].length) {
                        throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Filling exceeds column bounds.`);
                    }

                    nextGrid = nextGrid.map(row => [...row]);
                    for (let i = 0; i < cmd.count; i++) {
                        nextGrid[targetRow][targetCol + i] = { color: cmd.color };
                    }
                    nextLastPos = { r: targetRow, c: targetCol + cmd.count - 1 };
                }

                set({
                    currentGrid: nextGrid,
                    lastPos: nextLastPos,
                    totalMovements: nextTotalMovements,
                    pc: pc + 1,
                    isRunning: isRunning && pc + 1 < commands.length
                });
            }
        } catch (e: any) {
            set({ error: e.message, isRunning: false, completionStatus: 'failure' });
        }
    },

    run: () => set({ isRunning: true }),
    stop: () => set({ isRunning: false }),

    startChallenge: () => {
        const { lastChallengeTime } = get();
        const now = Date.now();
        const LOCKOUT_PERIOD = 30 * 60 * 1000;

        if (lastChallengeTime && (now - lastChallengeTime < LOCKOUT_PERIOD)) {
            const remaining = Math.ceil((LOCKOUT_PERIOD - (now - lastChallengeTime)) / 60000);
            set({ error: `Sfida bloccata. Riprova tra ${remaining} minuti.` });
            return;
        }

        const challengeTarget = generateChallengeTarget();
        const coloredRows = challengeTarget.reduce((count, row) => count + (row.some(cell => cell.color !== null) ? 1 : 0), 0);

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
        get().reset();
    },

    stopChallenge: () => set({ isChallengeActive: false, isLocked: true, showCertificateModal: true, isRunning: false }),

    tickTimer: () => {
        const { timeLeft, isChallengeActive } = get();
        if (!isChallengeActive) return;
        if (timeLeft <= 1) set({ timeLeft: 0, isChallengeActive: false, isLocked: true, isRunning: false, showCertificateModal: true });
        else set({ timeLeft: timeLeft - 1 });
    },

    calculateScore: () => {
        const { targetGrid, currentGrid, mode, mazeScore } = get();
        if (mode === 'MAZE') return mazeScore;
        if (!targetGrid || !currentGrid) return 0;

        let correctRows = 0;
        for (let r = 0; r < targetGrid.length; r++) {
            if (!targetGrid[r].some(cell => cell.color !== null)) continue;
            let rowMatch = true;
            for (let c = 0; c < targetGrid[0].length; c++) {
                if (targetGrid[r][c].color !== (currentGrid[r][c]?.color || null)) {
                    rowMatch = false;
                    break;
                }
            }
            if (rowMatch) correctRows++;
        }
        return correctRows;
    },

    closeCertificateModal: () => set({ showCertificateModal: false })
}));
