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
