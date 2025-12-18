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
