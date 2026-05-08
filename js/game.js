/**
 * Core Game Engine for Color Lines
 * 
 * Rules:
 * - 9x9 grid, 7 ball colors
 * - Each turn: select a ball, select empty cell, ball moves along BFS path
 * - After moving: check for 5+ in a line (horizontal, vertical, diagonal)
 * - If line found: clear those balls, score points, do NOT spawn new balls
 * - If no line: spawn 3 new balls, then check again for lines from spawned positions
 * - Game over when board is full and no lines can be cleared
 */
class Game {
    constructor() {
        this.boardSize = 9;
        this.grid = [];
        this.score = 0;
        this.nextColors = [];
        this.selectedCell = null;
        this.numColors = 7;
        this.isGameOver = false;
        this.isAnimating = false; // Lock during animations
        this.difficulty = 'medium'; // easy, medium, hard
        this.nextSpawns = []; // Predetermined spawn points for easy mode

        // Callbacks
        this.onStateChange = null;
        this.onGameOver = null;
        this.onLineCleared = null;
        this.onBallMove = null; // NEW: for path animation
    }

    init(difficulty = 'medium') {
        this.difficulty = difficulty;
        // Create empty grid
        this.grid = [];
        for (let r = 0; r < this.boardSize; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.boardSize; c++) {
                this.grid[r][c] = 0;
            }
        }
        this.score = 0;
        this.isGameOver = false;
        this.isAnimating = false;
        this.selectedCell = null;
        this.nextSpawns = [];

        // Spawn initial 5 balls
        this._generateNextColors(5);
        this._spawnBalls();

        // Generate first "next 3"
        this._generateNextColors(3);

        this.notifyStateChange();
    }

    _generateNextColors(count) {
        this.nextColors = [];
        this.nextSpawns = [];
        const empty = this._getEmptyCells();
        
        for (let i = 0; i < count; i++) {
            const color = Math.floor(Math.random() * this.numColors) + 1;
            this.nextColors.push(color);
            
            if (empty.length > 0) {
                const idx = Math.floor(Math.random() * empty.length);
                const cell = empty.splice(idx, 1)[0];
                this.nextSpawns.push({ r: cell.r, c: cell.c, color: color });
            }
        }
    }

    _getEmptyCells() {
        const empty = [];
        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.grid[r][c] === 0) {
                    empty.push({ r: r, c: c });
                }
            }
        }
        return empty;
    }

    _spawnBalls() {
        const spawned = [];

        for (let i = 0; i < this.nextColors.length; i++) {
            const color = this.nextColors[i];
            const preSpawn = this.nextSpawns[i];
            
            let r, c;
            
            if (preSpawn && this.grid[preSpawn.r][preSpawn.c] === 0) {
                r = preSpawn.r;
                c = preSpawn.c;
            } else {
                // If pre-selected cell was taken, pick a new random one
                const empty = this._getEmptyCells();
                if (empty.length === 0) {
                    this._triggerGameOver();
                    return spawned;
                }
                const idx = Math.floor(Math.random() * empty.length);
                const cell = empty[idx];
                r = cell.r;
                c = cell.c;
            }
            
            this.grid[r][c] = color;
            spawned.push({ r: r, c: c, color: color });
        }

        return spawned;
    }

    /**
     * Called when user clicks a cell.
     */
    selectCell(row, col) {
        if (this.isGameOver || this.isAnimating) return;

        const cellValue = this.grid[row][col];

        if (cellValue !== 0) {
            // Clicked on a ball -> select it
            this.selectedCell = { row: row, col: col, color: cellValue };
            this.notifyStateChange();
        } else if (this.selectedCell !== null) {
            // Clicked on empty cell with a ball selected -> try to move
            const path = Pathfinder.findPath(this.grid, this.selectedCell, { row: row, col: col });

            if (path && path.length >= 2) {
                this.isAnimating = true;
                this._animateAndMove(path);
            } else {
                // No valid path - deselect
                this.selectedCell = null;
                this.notifyStateChange();
            }
        }
    }

    /**
     * Triggers the move animation through UI callback, then completes the move in state.
     */
    _animateAndMove(path) {
        const from = path[0];
        const to = path[path.length - 1];
        const color = this.grid[from.row][from.col];

        // Remove ball from old position in state
        this.grid[from.row][from.col] = 0;
        this.selectedCell = null;

        // Tell UI to animate the ball along the path
        if (this.onBallMove) {
            this.onBallMove(path, color, () => {
                // Animation complete callback
                this._completeMoveAt(to, color);
            });
        } else {
            // No animation handler, just place it
            this._completeMoveAt(to, color);
        }
    }

    _completeMoveAt(to, color) {
        // Place ball at destination
        this.grid[to.row][to.col] = color;
        this.notifyStateChange();

        // Check for lines
        const cellsToClear = this._findAllLines();

        if (cellsToClear.length > 0) {
            // Delay to let user see the 5th ball before exploding
            setTimeout(() => {
                this._doClearLines(cellsToClear, () => {
                    this._generateNextColors(3);
                    this.isAnimating = false;
                    this._checkGameOver();
                });
            }, 250);
        } else {
            // No line cleared -> spawn 3 new balls
            const spawned = this._spawnBalls();
            this.notifyStateChange();

            // Check if spawned balls formed a line
            const spawnLines = this._findAllLines();
            if (spawnLines.length > 0) {
                setTimeout(() => {
                    this._doClearLines(spawnLines, () => {
                        this._generateNextColors(3);
                        this.notifyStateChange();
                        this.isAnimating = false;
                        this._checkGameOver();
                    });
                }, 250);
            } else {
                // Generate next 3 colors
                this._generateNextColors(3);
                this.notifyStateChange();
                this.isAnimating = false;
                this._checkGameOver();
            }
        }
    }

    _doClearLines(cells, callback) {
        const count = cells.length;
        this.score += 10 + Math.max(0, count - 5) * 2;

        for (const cell of cells) {
            this.grid[cell.r][cell.c] = 0;
        }

        if (this.onLineCleared) {
            this.onLineCleared(cells);
        }

        setTimeout(() => {
            this.notifyStateChange();
            if (callback) callback();
        }, 500); // 500ms for explosion animation
    }

    _checkGameOver() {
        if (this._getEmptyCells().length === 0) {
            this._triggerGameOver();
        }
    }
    _findAllLines() {
        const toClearSet = new Set();

        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (this.grid[r][c] === 0) continue;
                const found = this._checkLinesFrom(r, c);
                for (const cell of found) {
                    toClearSet.add(r + ',' + c); // Add the center
                    toClearSet.add(cell.r + ',' + cell.c);
                }
            }
        }

        if (toClearSet.size === 0) return [];

        const result = [];
        toClearSet.forEach(key => {
            const parts = key.split(',');
            result.push({ r: parseInt(parts[0]), c: parseInt(parts[1]) });
        });
        return result;
    }

    /**
     * From a given cell, checks all 4 directions for 5+ matching.
     * Returns cells that should be cleared (empty array if no line).
     */
    _checkLinesFrom(row, col) {
        const color = this.grid[row][col];
        if (color === 0) return [];

        const dirPairs = [
            [{ dr: 0, dc: 1 }, { dr: 0, dc: -1 }],   // Horizontal
            [{ dr: 1, dc: 0 }, { dr: -1, dc: 0 }],   // Vertical
            [{ dr: 1, dc: 1 }, { dr: -1, dc: -1 }],   // Diagonal \
            [{ dr: 1, dc: -1 }, { dr: -1, dc: 1 }]    // Diagonal /
        ];

        const allCells = [];

        for (const pair of dirPairs) {
            const line = [{ r: row, c: col }];

            for (const dir of pair) {
                let r = row + dir.dr;
                let c = col + dir.dc;
                while (
                    r >= 0 && r < this.boardSize &&
                    c >= 0 && c < this.boardSize &&
                    this.grid[r][c] === color
                ) {
                    line.push({ r: r, c: c });
                    r += dir.dr;
                    c += dir.dc;
                }
            }

            if (line.length >= 5) {
                for (const cell of line) {
                    allCells.push(cell);
                }
            }
        }

        return allCells;
    }

    _clearLines(cellsToClear) {
        // Score
        const count = cellsToClear.length;
        this.score += 10 + Math.max(0, count - 5) * 2;

        // Clear from grid
        for (const cell of cellsToClear) {
            this.grid[cell.r][cell.c] = 0;
        }

        // Trigger popping animation
        if (this.onLineCleared) {
            this.onLineCleared(cellsToClear);
        }

        // After animation finishes, re-render
        setTimeout(() => {
            this.notifyStateChange();
        }, 500);
    }

    _triggerGameOver() {
        if (this.isGameOver) return;
        this.isGameOver = true;
        if (this.onGameOver) {
            this.onGameOver(this.score);
        }
    }

    notifyStateChange() {
        if (this.onStateChange) {
            this.onStateChange(this);
        }
    }
}
