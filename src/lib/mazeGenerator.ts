export interface MazeWalls {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
}

export interface MazeItem {
    r: number;
    c: number;
    type: 'leaf' | 'carrot';
    collected: boolean;
}

export interface MazeGrid {
    rows: number;
    cols: number;
    cells: MazeWalls[][];
    items: MazeItem[];
    exit: { r: number; c: number } | null;
}

export function generateMaze(rows: number, cols: number): MazeGrid {
    const cells: MazeWalls[][] = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => ({
            top: true,
            right: true,
            bottom: true,
            left: true
        }))
    );

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const stack: [number, number][] = [];

    // Start at center or (0,0)
    let currR = Math.floor(rows / 2);
    let currC = Math.floor(cols / 2);
    visited[currR][currC] = true;
    stack.push([currR, currC]);

    while (stack.length > 0) {
        const [r, c] = stack[stack.length - 1];
        const neighbors: [number, number, string][] = [];

        if (r > 0 && !visited[r - 1][c]) neighbors.push([r - 1, c, 'top']);
        if (r < rows - 1 && !visited[r + 1][c]) neighbors.push([r + 1, c, 'bottom']);
        if (c > 0 && !visited[r][c - 1]) neighbors.push([r, c - 1, 'left']);
        if (c < cols - 1 && !visited[r][c + 1]) neighbors.push([r, c + 1, 'right']);

        if (neighbors.length > 0) {
            const [nextR, nextC, dir] = neighbors[Math.floor(Math.random() * neighbors.length)];

            if (dir === 'top') {
                cells[r][c].top = false;
                cells[nextR][nextC].bottom = false;
            } else if (dir === 'bottom') {
                cells[r][c].bottom = false;
                cells[nextR][nextC].top = false;
            } else if (dir === 'left') {
                cells[r][c].left = false;
                cells[nextR][nextC].right = false;
            } else if (dir === 'right') {
                cells[r][c].right = false;
                cells[nextR][nextC].left = false;
            }

            visited[nextR][nextC] = true;
            stack.push([nextR, nextC]);
        } else {
            stack.pop();
        }
    }

    // Ensure at least one exit
    const exits = [
        [0, Math.floor(cols / 2), 'top'],
        [rows - 1, Math.floor(cols / 2), 'bottom'],
        [Math.floor(rows / 2), 0, 'left'],
        [Math.floor(rows / 2), cols - 1, 'right']
    ];
    const [er, ec, edir] = exits[Math.floor(Math.random() * exits.length)] as [number, number, string];
    if (edir === 'top') cells[er][ec].top = false;
    if (edir === 'bottom') cells[er][ec].bottom = false;
    if (edir === 'left') cells[er][ec].left = false;
    if (edir === 'right') cells[er][ec].right = false;

    const exitCell = { r: er, c: ec };

    // Place items (4 leaves, 2 carrots)
    // Every cell is reachable in a perfect maze.
    const items: MazeItem[] = [];
    const allCells: [number, number][] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Avoid starting cell
            if (r === Math.floor(rows / 2) && c === Math.floor(cols / 2)) continue;
            // Avoid exit cell for items
            if (r === er && c === ec) continue;
            allCells.push([r, c]);
        }
    }

    // Shuffle and pick
    for (let i = allCells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allCells[i], allCells[j]] = [allCells[j], allCells[i]];
    }

    for (let i = 0; i < 4; i++) {
        const [r, c] = allCells.pop()!;
        items.push({ r, c, type: 'leaf', collected: false });
    }
    for (let i = 0; i < 2; i++) {
        const [r, c] = allCells.pop()!;
        items.push({ r, c, type: 'carrot', collected: false });
    }

    return { rows, cols, cells, items, exit: exitCell };
}
