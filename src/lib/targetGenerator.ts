import type { Grid, Color } from './interpreter';

// Helper to create empty grid
const createEmptyGrid = (rows: number, cols: number): Grid => {
    return Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({ color: null }))
    );
};

export const generateRandomTarget = (): Grid => {
    // Generate random dimensions (between 3 and 12)
    const rows = Math.floor(Math.random() * 10) + 3; // 3 to 12
    const cols = Math.floor(Math.random() * 10) + 3; // 3 to 12

    const grid = createEmptyGrid(rows, cols);

    // Add some random colored strips
    // We want it to be "solvable" with our commands (strips of colors)
    // Our commands are: <count> <color> <row> <col>
    // So we should generate based on these primitives.

    const numCommands = Math.floor(Math.random() * 5) + 3; // 3 to 8 commands

    for (let i = 0; i < numCommands; i++) {
        const color = (['R', 'G', 'B'] as Color[])[Math.floor(Math.random() * 3)];
        const row = Math.floor(Math.random() * rows);
        const col = Math.floor(Math.random() * cols);

        // Random length that fits
        const maxLen = cols - col;
        const count = Math.floor(Math.random() * maxLen) + 1;

        // Apply to grid
        for (let j = 0; j < count; j++) {
            grid[row][col + j] = { color };
        }
    }

    return grid;
};
export const generateChallengeTarget = (): Grid => {
    // Generate random dimensions (Rows must be at least 10, Cols at least 7)
    const rows = Math.floor(Math.random() * 5) + 10; // 10 to 14
    const cols = Math.floor(Math.random() * 8) + 7;  // 7 to 14

    const grid = createEmptyGrid(rows, cols);

    // Pick 10 specific rows to color to guarantee the constraint
    const allRowIndices = Array.from({ length: rows }, (_, i) => i);
    // Shuffle and pick 10
    const selectedRows = allRowIndices.sort(() => Math.random() - 0.5).slice(0, 10);

    for (const row of selectedRows) {
        // Add 1 to 3 random strips of different colors in this row
        const numStrips = Math.floor(Math.random() * 2) + 1; // 1 or 2 strips
        let currentPos = 0;

        for (let s = 0; s < numStrips; s++) {
            const color = (['R', 'G', 'B'] as Color[])[Math.floor(Math.random() * 3)];
            const availableSpace = cols - currentPos;
            if (availableSpace < 2) break;

            const startCol = currentPos + Math.floor(Math.random() * (availableSpace - 1));
            const maxLen = cols - startCol;
            const count = Math.floor(Math.random() * Math.min(maxLen, 3)) + 1;

            for (let j = 0; j < count; j++) {
                grid[row][startCol + j] = { color };
            }
            currentPos = startCol + count;
        }
    }

    // Optionally add a few more random strips on other rows
    const extraStrips = Math.floor(Math.random() * 3);
    for (let i = 0; i < extraStrips; i++) {
        const row = Math.floor(Math.random() * rows);
        const color = (['R', 'G', 'B'] as Color[])[Math.floor(Math.random() * 3)];
        const col = Math.floor(Math.random() * cols);
        const count = Math.floor(Math.random() * (cols - col)) + 1;
        for (let j = 0; j < count; j++) {
            grid[row][col + j] = { color };
        }
    }

    return grid;
};

export const generateMatrixTarget = (): { grid: Grid, code: string } => {
    const rows = 8;
    const cols = 8;
    let grid: Grid;
    let commands: string[] = [];

    // Try until we find a configuration with exactly 40 LEDs
    while (true) {
        grid = createEmptyGrid(rows, cols);
        commands = [];
        const numCommands = Math.floor(Math.random() * 31) + 30; // 30 to 60 commands

        for (let i = 0; i < numCommands; i++) {
            const isRow = Math.random() < 0.5;
            const index = Math.floor(Math.random() * 8);
            const operation = Math.random() < 0.5 ? '+' : '-';

            // Build command string
            // Rows: 1-8, Cols: A-H
            const target = isRow ? (index + 1).toString() : String.fromCharCode(65 + index);
            const cmdStr = `${operation} ${target}`;
            commands.push(cmdStr);

            // Apply to grid
            const colorToSet: Color | null = operation === '+' ? 'W' : null;
            if (isRow) {
                for (let c = 0; c < 8; c++) grid[index][c].color = colorToSet;
            } else {
                for (let r = 0; r < 8; r++) grid[r][index].color = colorToSet;
            }
        }

        // Check strict requirement: Exactly 40 LEDs ON
        let onCount = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c].color !== null) onCount++;
            }
        }

        if (onCount === 40) {
            break;
        }
    }

    return { grid, code: commands.join('\n') };
};

export const generatePixelTarget = (): { grid: Grid, code: string } => {
    const rows = 16;
    const cols = 16;
    const grid = createEmptyGrid(rows, cols);
    let commands: string[] = [];

    // Helper to get color
    const getColor = (s: string) => {
        const up = s.toUpperCase();
        if (up.includes('R') && up.includes('G') && up.includes('B')) return 'W';
        if (up.includes('R') && up.includes('G')) return 'Y';
        if (up.includes('G') && up.includes('B')) return 'C';
        if (up.includes('R') && up.includes('B')) return 'M';
        if (up.includes('R')) return 'R';
        if (up.includes('G')) return 'G';
        if (up.includes('B')) return 'B';
        return null;
    };

    for (let r = 0; r < rows; r++) {
        const patternType = Math.random();

        if (patternType < 0.25) {
            // Fill row with one color or mix
            const cStr = (['R', 'G', 'B', 'RG', 'GB', 'RB', 'RGB'] as string[])[Math.floor(Math.random() * 7)];
            const color = getColor(cStr);
            for (let c = 0; c < cols; c++) grid[r][c] = { color: color as any };
            commands.push(`16 * ( ${cStr} )`);
        } else if (patternType < 0.5) {
            // Alternating two colors
            const c1Str = (['R', 'G', 'B', 'RG'] as string[])[Math.floor(Math.random() * 4)];
            const c2Str = (['GB', 'RB', 'RGB', 'O'] as string[])[Math.floor(Math.random() * 4)];
            const c1 = getColor(c1Str);
            const c2 = c2Str === 'O' ? null : getColor(c2Str);

            for (let c = 0; c < cols; c += 2) {
                grid[r][c] = { color: c1 as any };
                grid[r][c + 1] = { color: c2 as any };
            }
            const c2Cmd = c2Str === 'O' ? 'Off' : c2Str;
            commands.push(`8 * ( ${c1Str} + ${c2Cmd} )`);
        } else if (patternType < 0.75) {
            // 4 chunks of 4 pixels
            const colorsStr = [];
            for (let k = 0; k < 4; k++) colorsStr.push((['R', 'G', 'B', 'RG', 'GB', 'RB', 'O'] as string[])[Math.floor(Math.random() * 7)]);

            let rowCode = '4 * ( ';
            for (let k = 0; k < 4; k++) {
                const cStr = colorsStr[k];
                rowCode += cStr === 'O' ? 'Off' : cStr;
                if (k < 3) rowCode += ' + ';

            }
            rowCode += ' )';

            for (let repeat = 0; repeat < 4; repeat++) {
                for (let k = 0; k < 4; k++) {
                    const cStr = colorsStr[k];
                    const color = cStr === 'O' ? null : getColor(cStr);
                    grid[r][repeat * 4 + k] = { color: color as any };
                }
            }
            commands.push(rowCode);
        } else {
            // Split row: 8 + 8
            const c1Str = (['R', 'G', 'B'] as string[])[Math.floor(Math.random() * 3)];
            const c2Str = (['C', 'M', 'Y'] as string[])[Math.floor(Math.random() * 3)];
            const c1 = getColor(c1Str);
            const c2 = getColor(c2Str);

            for (let c = 0; c < 8; c++) grid[r][c] = { color: c1 as any };
            for (let c = 8; c < 16; c++) grid[r][c] = { color: c2 as any };
            commands.push(`8 * ( ${c1Str} ) + 8 * ( ${c2Str} )`);
        }
    }

    return { grid, code: commands.join('\n') };
};
