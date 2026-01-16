import { create } from 'zustand';
import { generateChallengeTarget, generateMatrixTarget } from './targetGenerator';
import { generateMaze, type MazeGrid } from './mazeGenerator';

// Constants
export const MAX_ROWS = 16;
export const MAX_COLS = 16;

// Types
export type Color = 'R' | 'G' | 'B' | 'W' | 'Y' | 'C' | 'M';

export interface Cell {
    color: Color | null;
}

export type Grid = Cell[][];

export type CommandType = 'START' | 'COLOR' | 'GRID_COLOR' | 'RUOTA' | 'MUOVI' | 'MATRIX' | 'PIXEL_CMD';

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

export interface MatrixCommand {
    type: 'MATRIX';
    operation: '+' | '-';
    target: string; // '1'-'8' or 'A'-'H'
    isRow: boolean; // true if target is number
    index: number; // 0-7
    originalLine: string;
    lineNumber: number;
}

export interface PixelCommand {
    type: 'PIXEL_CMD';
    action: 'PAINT' | 'SKIP' | 'LOOP';
    color?: Color; // For PAINT
    loopCount?: number; // For LOOP
    loopCommands?: PixelCommand[]; // For LOOP
    originalLine: string;
    lineNumber: number;
}

export type Command = StartCommand | ColorCommand | GridColorCommand | RuotaCommand | MuoviCommand | MatrixCommand | PixelCommand;

export interface ProgramState {
    mode: 'TABLE' | 'GRID' | 'MAZE' | 'MATRIX' | 'PIXEL';
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
    solutionCode: string | null;
}

interface InterpreterActions {
    setMode: (mode: 'TABLE' | 'GRID' | 'MAZE' | 'MATRIX' | 'PIXEL') => void;
    setSourceCode: (code: string) => void;
    setTargetGrid: (grid: Grid, solutionCode?: string | null) => void;
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

// Helper for mixed colors
const getMixedColor = (str: string): Color | undefined => {
    const s = str.toUpperCase();
    const hasR = s.includes('R');
    const hasG = s.includes('G');
    const hasB = s.includes('B');

    if (hasR && hasG && hasB) return 'W';
    if (hasR && hasG) return 'Y'; // Yellow
    if (hasG && hasB) return 'C'; // Cyan
    if (hasR && hasB) return 'M'; // Magenta
    if (hasR) return 'R';
    if (hasG) return 'G';
    if (hasB) return 'B';
    return undefined;
};

const parsePixelSequence = (text: string, lineNumber: number): PixelCommand[] => {
    const commands: PixelCommand[] = [];
    let remaining = text.trim();

    while (remaining.length > 0) {
        // Skip separators
        if (remaining.startsWith('+')) {
            remaining = remaining.substring(1).trim();
            continue;
        }

        // Check for Loop: N * ( ... )
        const loopMatch = remaining.match(/^(\d+)\s*\*\s*\((.*)/s); // Check for start of loop
        if (loopMatch) {
            const count = parseInt(loopMatch[1], 10);
            let innerContent = loopMatch[2];

            // Need to find matching parenthesis
            let depth = 1;
            let endIdx = -1;
            for (let i = 0; i < innerContent.length; i++) {
                if (innerContent[i] === '(') depth++;
                if (innerContent[i] === ')') depth--;
                if (depth === 0) {
                    endIdx = i;
                    break;
                }
            }

            if (endIdx === -1) {
                throw new Error(`Syntax Error on line ${lineNumber + 1}: Unbalanced parenthesis in loop.`);
            }

            const loopBodyStr = innerContent.substring(0, endIdx);
            remaining = innerContent.substring(endIdx + 1).trim();

            const nestedCommands = parsePixelSequence(loopBodyStr, lineNumber);
            commands.push({
                type: 'PIXEL_CMD',
                action: 'LOOP',
                loopCount: count,
                loopCommands: nestedCommands,
                originalLine: text,
                lineNumber
            });
            continue;
        }

        // Check for Off
        let match = remaining.match(/^(OFF|O)(?![A-Z])/i);
        if (!match) match = remaining.match(/^(OFF|O)/i);

        if (match) {
            commands.push({
                type: 'PIXEL_CMD',
                action: 'SKIP',
                originalLine: text,
                lineNumber
            });
            remaining = remaining.substring(match[0].length).trim();
            continue;
        }

        // Check for Mixed Colors: R, G, B combinations
        const tokenMatch = remaining.match(/^([RGB]+)(.*)/i);
        if (tokenMatch) {
            const colorStr = tokenMatch[1];
            remaining = tokenMatch[2].trim();

            const color = getMixedColor(colorStr);
            if (color) {
                commands.push({
                    type: 'PIXEL_CMD',
                    action: 'PAINT',
                    color,
                    originalLine: text,
                    lineNumber
                });
            } else {
                throw new Error(`Syntax Error on line ${lineNumber + 1}: Invalid color string.`);
            }
        } else {
            const wordMatch = remaining.match(/^([a-zA-Z]+)(.*)/);
            if (wordMatch) {
                throw new Error(`Syntax Error on line ${lineNumber + 1}: Unknown command '${wordMatch[1]}'.`);
            }
            throw new Error(`Syntax Error on line ${lineNumber + 1}: Unexpected character.`);
        }
    }
    return commands;
};

// Parser
const parseLine = (line: string, lineNumber: number, mode: 'TABLE' | 'GRID' | 'MAZE' | 'MATRIX' | 'PIXEL'): Command | Command[] | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    if (mode === 'PIXEL') {
        const lineCommands = parsePixelSequence(trimmed, lineNumber);
        // We return an array, but the main loop expects single Command usually. 
        // We will adapt the caller or return a flat list if possible, but the signature says Command | null.
        // Let's change return type to Command | Command[] | null and flatten in caller.
        return lineCommands.length > 0 ? lineCommands : null;
    }

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
    } else if (mode === 'MATRIX') {
        const matrixMatch = trimmed.match(/^([+-])\s*([1-8]|[A-H])$/i);
        if (matrixMatch) {
            const operation = matrixMatch[1] as '+' | '-';
            const targetChar = matrixMatch[2].toUpperCase();
            const isRow = /[1-8]/.test(targetChar);
            // Rows 1-8 -> index 0-7
            // Cols A-H -> index 0-7 ('A'.charCodeAt(0) == 65)
            const index = isRow
                ? parseInt(targetChar, 10) - 1
                : targetChar.charCodeAt(0) - 65;

            return {
                type: 'MATRIX',
                operation,
                target: targetChar,
                isRow,
                index,
                originalLine: line,
                lineNumber
            };
        }
    }

    throw new Error(`Syntax Error on line ${lineNumber + 1}: Invalid command format.`);
};

const executePixelCommandsOnGrid = (grid: Grid, commands: Command[], startPos: { r: number, c: number }): { r: number, c: number } => {
    let cursor = { ...startPos };
    let currentLine = -1;

    const paint = (color: Color | null, cmdLine: number) => {
        // Enforce Row Sync
        if (cmdLine !== currentLine) {
            cursor.r = cmdLine;
            cursor.c = 0;
            currentLine = cmdLine;
        }

        if (cursor.r < 16 && cursor.c < 16) {
            grid[cursor.r][cursor.c].color = color;
        }
        cursor.c++;
    };

    const runCmds = (cmds: Command[]) => {
        for (const cmd of cmds) {
            if (cmd.type === 'PIXEL_CMD') {
                const pCmd = cmd as PixelCommand;
                if (pCmd.action === 'PAINT') {
                    paint(pCmd.color || null, pCmd.lineNumber);
                } else if (pCmd.action === 'SKIP') {
                    paint(null, pCmd.lineNumber);
                } else if (pCmd.action === 'LOOP' && pCmd.loopCommands) {
                    for (let i = 0; i < (pCmd.loopCount || 0); i++) {
                        runCmds(pCmd.loopCommands as Command[]);
                    }
                }
            }
        }
    };

    runCmds(commands);
    return cursor;
};

const executeCommandsSilently = (commands: Command[], mode: 'TABLE' | 'GRID' | 'MAZE' | 'MATRIX' | 'PIXEL'): Grid | null => {
    if (mode === 'MAZE') return null; // Logic is different
    let grid: Grid | null = null;
    let lastPos = { r: -1, c: -1 };

    if (mode === 'MATRIX') {
        grid = createEmptyGrid(8, 8);
    } else if (mode === 'PIXEL') {
        grid = createEmptyGrid(16, 16);
        executePixelCommandsOnGrid(grid, commands, { r: 0, c: 0 });
        return grid;
    }

    for (const cmd of commands) {
        try {
            if (cmd.type === 'START') {
                // Start is only for TABLE/GRID mode basically
                grid = createEmptyGrid(cmd.rows, cmd.cols);
                lastPos = { r: -1, c: -1 };
            } else if (cmd.type === 'MATRIX' && grid) {
                const colorToSet: Color | null = cmd.operation === '+' ? 'W' : null; // Warm White for ON
                if (cmd.isRow) {
                    for (let c = 0; c < 8; c++) grid[cmd.index][c].color = colorToSet;
                } else {
                    for (let r = 0; r < 8; r++) grid[r][cmd.index].color = colorToSet;
                }
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

    solutionCode: null,

    setMode: (mode) => {
        set({ mode });
        const s = useInterpreterStore.getState();
        s.reset();
        s.loadProgram(s.sourceCode);
    },

    setTargetGrid: (grid, solutionCode = null) => set({
        targetGrid: grid,
        solutionCode: solutionCode,
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
            let commands: Command[] = [];
            let startCmdFound = false;

            for (let i = 0; i < lines.length; i++) {
                const result = parseLine(lines[i], i, currentMode);
                if (result) {
                    const cmds = Array.isArray(result) ? result : [result];

                    for (const cmd of cmds) {
                        // Validate START/COLOR ordering for TABLE/GRID
                        if (cmd.type === 'START') {
                            if (startCmdFound) throw new Error(`Error on line ${i + 1}: Multiple definition of table dimensions.`);
                            if (cmd.rows > MAX_ROWS || cmd.cols > MAX_COLS) throw new Error(`Error on line ${i + 1}: Table dimensions exceed max ${MAX_ROWS}x${MAX_COLS}.`);
                            startCmdFound = true;
                        } else if (cmd.type === 'COLOR' || cmd.type === 'GRID_COLOR') {
                            if (!startCmdFound && (currentMode === 'TABLE' || currentMode === 'GRID')) {
                                throw new Error(`Error on line ${i + 1}: Color command before table definition.`);
                            }
                        }
                        commands.push(cmd);
                    }
                }
            }

            // Flatten loops for PIXEL mode to support step-by-step
            if (currentMode === 'PIXEL') {
                const flatten = (cmds: Command[]): Command[] => {
                    let flat: Command[] = [];
                    for (const cmd of cmds) {
                        if (cmd.type === 'PIXEL_CMD' && (cmd as PixelCommand).action === 'LOOP' && (cmd as PixelCommand).loopCommands) {
                            const loopBody = flatten((cmd as PixelCommand).loopCommands!);
                            for (let k = 0; k < ((cmd as PixelCommand).loopCount || 0); k++) {
                                flat = [...flat, ...loopBody];
                            }
                        } else {
                            flat.push(cmd);
                        }
                    }
                    return flat;
                };
                commands = flatten(commands);
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
            } else if (currentMode === 'MATRIX') {
                newState.currentGrid = createEmptyGrid(8, 8);
            } else if (currentMode === 'PIXEL') {
                newState.currentGrid = createEmptyGrid(16, 16);
                newState.lastPos = { r: 0, c: 0 }; // Use lastPos as cursor for PIXEL
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
                    newState.mazeState = copiedMaze;
                }
            }
            newState.mazeScore = 0;
            newState.currentGrid = createEmptyGrid(16, 16);
        } else if (mode === 'MATRIX') {
            newState.currentGrid = createEmptyGrid(8, 8);
            newState.completionStatus = 'idle'; // Reset completion status
            newState.error = null;
        } else if (mode === 'PIXEL') {
            newState.currentGrid = createEmptyGrid(16, 16);
            newState.completionStatus = 'idle';
            newState.error = null;
            newState.lastPos = { r: 0, c: 0 };
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
        let { commands, pc, mode, isRunning, mazeState, mazeScore, currentGrid, lastPos, totalMovements } = get();

        if (!isRunning || pc >= commands.length) {
            set({ isRunning: false });
            return;
        }

        const startLine = commands[pc].lineNumber;

        // Clone state
        let nextMazeState = deepCopyMazeState(mazeState);
        let nextMazeScore = mazeScore;
        let nextGrid = currentGrid ? currentGrid.map(row => row.map(cell => ({ ...cell }))) : null;
        let nextLastPos = { ...lastPos };
        let nextTotalMovements = totalMovements;
        let nextPc = pc;

        // Pixel Mode Strict Reset at start of line
        if (mode === 'PIXEL') {
            nextLastPos.r = startLine; // Assuming line number maps to row for pixel cursor
            nextLastPos.c = 0;
        }

        let keepRunning = true;
        let error: string | null = null;

        try {
            while (keepRunning && nextPc < commands.length && commands[nextPc].lineNumber === startLine) {
                const cmd = commands[nextPc];

                if (mode === 'MAZE') {
                    if (cmd.type === 'START') {
                        // No-op
                    } else if (cmd.type === 'RUOTA') {
                        const deg = (cmd as RuotaCommand).degrees;
                        let newDir = nextMazeState!.turtle.dir;

                        // Normalize degrees to be within [0, 270]
                        let currentDirNormalized = (newDir % 360 + 360) % 360;

                        if (deg === 90) { // Clockwise
                            newDir = (currentDirNormalized + 90) % 360;
                        } else if (deg === -90 || deg === 270) { // Counter-clockwise
                            newDir = (currentDirNormalized - 90 + 360) % 360;
                        } else if (deg === 180) { // Flip
                            newDir = (currentDirNormalized + 180) % 360;
                        }
                        nextMazeState!.turtle.dir = newDir;
                    } else if (cmd.type === 'MUOVI') {
                        const steps = (cmd as MuoviCommand).steps;
                        const { r, c, dir } = nextMazeState!.turtle;
                        let currR = r, currC = c;
                        let currScore = nextMazeScore;
                        let currItems = [...nextMazeState!.items];
                        let nextVisited = [...nextMazeState!.visited];

                        for (let s = 0; s < steps; s++) {
                            let nextR = currR, nextC = currC;

                            // 0: East, 90: North, 180: West, 270: South
                            if (dir === 90) nextR--; // North
                            else if (dir === 270) nextR++; // South
                            else if (dir === 0) nextC++; // East
                            else if (dir === 180) nextC--; // West

                            // Wall collision or bounds
                            // Assuming maze is 16x16, and walls are stored in mazeState.walls[r][c]
                            if (nextR < 0 || nextR >= 16 || nextC < 0 || nextC >= 16) {
                                throw new Error(`Hai sbattuto contro un muro o sei uscito dai bordi!`);
                            }

                            // Check for wall between current and next position
                            const currentWalls = nextMazeState!.walls[currR][currC];
                            let wallCollision = false;
                            if (dir === 90 && currentWalls.top) wallCollision = true; // Moving North, check top wall
                            else if (dir === 270 && currentWalls.bottom) wallCollision = true; // Moving South, check bottom wall
                            else if (dir === 0 && currentWalls.right) wallCollision = true; // Moving East, check right wall
                            else if (dir === 180 && currentWalls.left) wallCollision = true; // Moving West, check left wall

                            if (wallCollision) {
                                throw new Error(`Hai sbattuto contro un muro!`);
                            }

                            currR = nextR;
                            currC = nextC;

                            // Add to visited if not already there
                            if (!nextVisited.some(v => v.r === currR && v.c === currC)) {
                                nextVisited.push({ r: currR, c: currC });
                            }

                            // Check items
                            const itemIdx = currItems.findIndex(i => i.r === currR && i.c === currC && !i.collected);
                            if (itemIdx !== -1) {
                                const item = currItems[itemIdx];
                                currScore += (item.type === 'leaf' ? 1 : 2);
                                currItems[itemIdx] = { ...item, collected: true };
                            }
                        }
                        nextMazeState!.items = currItems;
                        nextMazeState!.visited = nextVisited;
                        nextMazeState!.turtle = { ...nextMazeState!.turtle, r: currR, c: currC };
                        nextMazeScore = currScore;
                    } else {
                        throw new Error(`Comando ${cmd.type} non supportato in modalità MAZE.`);
                    }

                } else if (mode === 'MATRIX') {
                    if (cmd.type === 'START') {
                        // No-op
                    } else if (cmd.type === 'MATRIX') {
                        if (!nextGrid) throw new Error("Internal Error: Grid not initialized.");
                        const matrixCmd = cmd as MatrixCommand;
                        const colorToSet: Color | null = matrixCmd.operation === '+' ? 'W' : null;
                        if (matrixCmd.isRow) {
                            for (let c = 0; c < 8; c++) nextGrid[matrixCmd.index][c].color = colorToSet;
                        } else {
                            for (let r = 0; r < 8; r++) nextGrid[r][matrixCmd.index].color = colorToSet;
                        }
                    } else {
                        throw new Error(`Comando ${cmd.type} non supportato in modalità MATRIX.`);
                    }

                } else if (mode === 'PIXEL') {
                    if (!nextGrid) throw new Error("Internal Error: Grid not initialized.");
                    if (cmd.type !== 'PIXEL_CMD') throw new Error("Invalid command for PIXEL mode");

                    const pCmd = cmd as PixelCommand;
                    if (pCmd.action === 'PAINT') {
                        if (nextLastPos.r < 16 && nextLastPos.c < 16) {
                            nextGrid[nextLastPos.r][nextLastPos.c].color = pCmd.color || null;
                        }
                    } else if (pCmd.action === 'SKIP') {
                        if (nextLastPos.r < 16 && nextLastPos.c < 16) {
                            nextGrid[nextLastPos.r][nextLastPos.c].color = null;
                        }
                    }
                    nextLastPos.c++;
                    if (nextLastPos.c >= 16) {
                        nextLastPos.c = 0;
                        nextLastPos.r++;
                    }

                } else {
                    // TABLE or GRID
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
                            targetRow = nextLastPos.r + (cmd as GridColorCommand).deltaY;
                            targetCol = nextLastPos.c + (cmd as GridColorCommand).deltaX;
                            nextTotalMovements += Math.abs((cmd as GridColorCommand).deltaX) + Math.abs((cmd as GridColorCommand).deltaY) + (cmd.count > 0 ? cmd.count - 1 : 0);
                        }

                        if (targetRow < 0 || targetRow >= nextGrid.length || targetCol < 0 || targetCol >= nextGrid[0].length) {
                            throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Position out of bounds.`);
                        }
                        if (targetCol + cmd.count > nextGrid[0].length) {
                            throw new Error(`Runtime Error on line ${cmd.lineNumber + 1}: Filling exceeds column bounds.`);
                        }

                        // Apply
                        for (let i = 0; i < cmd.count; i++) {
                            nextGrid[targetRow][targetCol + i] = { color: cmd.color };
                        }
                        nextLastPos = { r: targetRow, c: targetCol + cmd.count - 1 };
                    }
                }

                nextPc++;
            }
        } catch (e: any) {
            error = e.message;
            keepRunning = false;
        }

        set({
            mazeState: nextMazeState,
            mazeScore: nextMazeScore,
            currentGrid: nextGrid,
            lastPos: nextLastPos,
            totalMovements: nextTotalMovements,
            pc: nextPc,
            isRunning: keepRunning && isRunning && nextPc < commands.length,
            error: error || null,
            completionStatus: error ? 'failure' : 'idle'
        });
    },
    run: () => {
        const s = get();
        s.reset();
        set({ isRunning: true });
    },
    stop: () => set({ isRunning: false }),

    startChallenge: () => {
        const { lastChallengeTime, mode } = get();
        const now = Date.now();
        const LOCKOUT_PERIOD = 30 * 60 * 1000;

        if (lastChallengeTime && (now - lastChallengeTime < LOCKOUT_PERIOD)) {
            const remaining = Math.ceil((LOCKOUT_PERIOD - (now - lastChallengeTime)) / 60000);
            set({ error: `Sfida bloccata. Riprova tra ${remaining} minuti.` });
            return;
        }

        let challengeTarget: Grid;
        let solutionCode: string | null = null;

        if (mode === 'MATRIX') {
            const result = generateMatrixTarget();
            challengeTarget = result.grid;
            solutionCode = result.code;
        } else {
            challengeTarget = generateChallengeTarget();
        }

        const coloredRows = challengeTarget.reduce((count, row) => count + (row.some(cell => cell.color !== null) ? 1 : 0), 0);

        set({
            targetGrid: challengeTarget,
            solutionCode: solutionCode,
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
        const { mode, mazeScore, currentGrid, targetGrid } = get();

        if (mode === 'MAZE') {
            return mazeScore;
        }

        if (!currentGrid || !targetGrid) return 0;

        if (mode === 'MATRIX') {
            // +0.25 correct ON, -0.25 wrong ON.
            // Loop 8x8
            let score = 0;
            for (let r = 0; r < 8; r++) {
                for (let c = 0; c < 8; c++) {
                    const isTargetOn = targetGrid[r][c].color !== null;
                    const isCurrentOn = currentGrid[r][c].color !== null;

                    if (isTargetOn && isCurrentOn) score += 0.25;
                    else if (!isTargetOn && isCurrentOn) score -= 0.25;
                }
            }
            return Math.max(0, score);
        } else if (mode === 'PIXEL') {
            let pxOK = 0;
            // 16x16
            for (let r = 0; r < 16; r++) {
                for (let c = 0; c < 16; c++) {
                    if (currentGrid[r][c].color === targetGrid[r][c].color) {
                        pxOK++;
                    }
                }
            }
            // Formula: int(pxOK * 5 / 32) / 4
            const factor = Math.floor((pxOK * 5) / 32);
            return factor / 4;
        }

        return 0;
    },

    closeCertificateModal: () => set({ showCertificateModal: false }),
}));
