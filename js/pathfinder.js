/**
 * Pathfinder module for Color Lines
 * Uses Breadth-First Search (BFS) to find the shortest path between two cells.
 * Only allows horizontal and vertical movement (no diagonal).
 * The starting cell (where the ball is) is treated as passable since the ball will leave it.
 */
class Pathfinder {
    /**
     * Finds the shortest path from start to end on the grid.
     * @param {Array} grid - 2D array (0 = empty, >0 = ball)
     * @param {Object} start - {row, col} where the ball currently is
     * @param {Object} end - {row, col} destination (must be empty)
     * @returns {Array|null} Array of {row, col} from start to end, or null if no path
     */
    static findPath(grid, start, end) {
        const rows = grid.length;
        const cols = grid[0].length;

        // Validate inputs
        if (start.row < 0 || start.row >= rows || start.col < 0 || start.col >= cols) return null;
        if (end.row < 0 || end.row >= rows || end.col < 0 || end.col >= cols) return null;

        // Start must have a ball
        if (grid[start.row][start.col] === 0) return null;
        // End must be empty
        if (grid[end.row][end.col] !== 0) return null;
        // Same cell
        if (start.row === end.row && start.col === end.col) return null;

        // BFS
        const visited = [];
        for (let r = 0; r < rows; r++) {
            visited[r] = [];
            for (let c = 0; c < cols; c++) {
                visited[r][c] = false;
            }
        }

        const parent = [];
        for (let r = 0; r < rows; r++) {
            parent[r] = [];
            for (let c = 0; c < cols; c++) {
                parent[r][c] = null;
            }
        }

        // Mark start as visited
        visited[start.row][start.col] = true;

        const queue = [{ row: start.row, col: start.col }];

        // 4 directions only: up, down, left, right
        const dirs = [
            { dr: -1, dc: 0 },
            { dr: 1, dc: 0 },
            { dr: 0, dc: -1 },
            { dr: 0, dc: 1 }
        ];

        let found = false;

        while (queue.length > 0) {
            const curr = queue.shift();

            if (curr.row === end.row && curr.col === end.col) {
                found = true;
                break;
            }

            for (const d of dirs) {
                const nr = curr.row + d.dr;
                const nc = curr.col + d.dc;

                // Bounds check
                if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
                // Already visited
                if (visited[nr][nc]) continue;
                // Cell must be empty (a ball blocks the path)
                if (grid[nr][nc] !== 0) continue;

                visited[nr][nc] = true;
                parent[nr][nc] = { row: curr.row, col: curr.col };
                queue.push({ row: nr, col: nc });
            }
        }

        if (!found) return null;

        // Reconstruct path from end to start
        const path = [];
        let node = { row: end.row, col: end.col };
        while (node !== null) {
            path.push({ row: node.row, col: node.col });
            node = parent[node.row][node.col];
        }
        path.reverse(); // Now it's start -> end

        return path;
    }
}
