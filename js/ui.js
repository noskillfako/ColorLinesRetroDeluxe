/**
 * UI module — handles rendering, click events, path animation, and sound.
 */
document.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    const boardEl = document.getElementById('game-board');
    const scoreEl = document.getElementById('current-score');
    const nextColorsEl = document.getElementById('next-colors');
    const gameOverModal = document.getElementById('game-over-modal');
    const finalScoreEl = document.getElementById('final-score');
    const btnRestart = document.getElementById('btn-restart');
    const btnRestartOnly = document.getElementById('btn-restart-only');

    // Menu references
    const mainMenu = document.getElementById('main-menu');
    const difficultySelect = document.getElementById('difficulty-select');
    const btnStartGame = document.getElementById('btn-start-game');
    const btnMenu = document.getElementById('btn-menu');
    const btnMenuSound = document.getElementById('btn-menu-sound');
    const btnMenuLeaderboard = document.getElementById('btn-menu-leaderboard');

    // ─── Audio ───────────────────────────────────────────────
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let soundEnabled = true;

    function ensureAudio() {
        if (soundEnabled && audioCtx.state === 'suspended') audioCtx.resume();
    }

    function playTone(freq, type, duration, vol) {
        if (!soundEnabled) return;
        ensureAudio();
        try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol || 0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch (e) { /* ignore audio errors */ }
    }

    function playMoveStep() {
        playTone(500, 'square', 0.05, 0.04);
    }

    function playExplosion() {
        if (!soundEnabled) return;
        ensureAudio();
        try {
            const len = audioCtx.sampleRate * 0.15;
            const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
            const src = audioCtx.createBufferSource();
            src.buffer = buf;
            const g = audioCtx.createGain();
            g.gain.setValueAtTime(0.15, audioCtx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            src.connect(g);
            g.connect(audioCtx.destination);
            src.start();
        } catch (e) { /* ignore */ }
    }

    document.getElementById('btn-sound').addEventListener('click', (e) => {
        soundEnabled = !soundEnabled;
        e.target.textContent = soundEnabled ? '🔊' : '🔇';
        if (soundEnabled) ensureAudio();
    });

    // ─── Board Initialisation ────────────────────────────────
    function initUI() {
        boardEl.innerHTML = '';
        for (let r = 0; r < game.boardSize; r++) {
            for (let c = 0; c < game.boardSize; c++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', handleCellClick);
                boardEl.appendChild(cell);
            }
        }

        game.onStateChange = renderState;
        game.onLineCleared = handleLineCleared;
        game.onGameOver = handleGameOver;
        game.onBallMove = handleBallMove;

        mainMenu.classList.remove('hidden');
    }

    // ─── Cell Click ──────────────────────────────────────────
    function handleCellClick(e) {
        ensureAudio();
        const r = parseInt(e.currentTarget.dataset.row);
        const c = parseInt(e.currentTarget.dataset.col);

        if (game.grid[r][c] !== 0) {
            playTone(400, 'square', 0.08);
        }

        game.selectCell(r, c);
    }

    // ─── Helpers ─────────────────────────────────────────────
    function getCellEl(row, col) {
        return boardEl.children[row * game.boardSize + col];
    }

    // ─── Render ──────────────────────────────────────────────
    function renderState(gameState) {
        for (let r = 0; r < gameState.boardSize; r++) {
            for (let c = 0; c < gameState.boardSize; c++) {
                const cellEl = getCellEl(r, c);
                const value = gameState.grid[r][c];

                // Don't touch cells with popping animation
                if (cellEl.querySelector('.popping')) continue;
                // Don't touch cells with moving ball
                if (cellEl.querySelector('.moving-ball')) continue;

                cellEl.classList.remove('selected');

                let ball = cellEl.querySelector('.ball:not(.ghost-ball)');
                let ghost = cellEl.querySelector('.ghost-ball');

                if (value !== 0) {
                    if (ghost) ghost.remove();
                    if (!ball) {
                        ball = document.createElement('div');
                        cellEl.appendChild(ball);
                    }
                    ball.className = 'ball color-' + value;

                    if (
                        gameState.selectedCell &&
                        gameState.selectedCell.row === r &&
                        gameState.selectedCell.col === c
                    ) {
                        cellEl.classList.add('selected');
                    }
                } else {
                    if (ball) ball.remove();
                    
                    // Ghost balls for easy mode
                    if (gameState.difficulty === 'easy' && gameState.nextSpawns) {
                        const spawn = gameState.nextSpawns.find(s => s.r === r && s.c === c);
                        if (spawn) {
                            if (!ghost) {
                                ghost = document.createElement('div');
                                cellEl.appendChild(ghost);
                            }
                            ghost.className = 'ball ghost-ball color-' + spawn.color;
                        } else if (ghost) {
                            ghost.remove();
                        }
                    } else if (ghost) {
                        ghost.remove();
                    }
                }
            }
        }

        // Score
        scoreEl.textContent = gameState.score;

        // Next colors
        nextColorsEl.innerHTML = '';
        if (gameState.difficulty === 'hard') {
            const slot = document.createElement('div');
            slot.className = 'ball-slot';
            slot.textContent = '?';
            slot.style.color = '#fff';
            slot.style.display = 'flex';
            slot.style.justifyContent = 'center';
            slot.style.alignItems = 'center';
            slot.style.fontWeight = 'bold';
            nextColorsEl.appendChild(slot);
        } else {
            gameState.nextColors.forEach(color => {
                const slot = document.createElement('div');
                slot.className = 'ball-slot';
                const miniBall = document.createElement('div');
                miniBall.className = 'ball small color-' + color;
                slot.appendChild(miniBall);
                nextColorsEl.appendChild(slot);
            });
        }

        // ─── Dynamic Pillar Heights ───
        const bestScoreStr = document.getElementById('best-score').textContent;
        let bestScore = parseInt(bestScoreStr) || 0;

        // Base value so Pretender can climb even if best score is 0
        const targetScore = Math.max(bestScore, 100);

        const maxPillarHeight = 250; // Max pixels for Alisa's pillar
        const alisaPillar = document.getElementById('pillar-alisa');
        const pretenderPillar = document.getElementById('pillar-pretender');

        if (alisaPillar && pretenderPillar) {
            const charAlisa = document.getElementById('char-alisa');
            const charPretender = document.getElementById('char-pretender');
            const alisaName = document.getElementById('alisa-name');
            const pretenderName = document.querySelector('.right-panel .character-name');

            if (gameState.score <= bestScore || bestScore === 0) {
                // Normal state: Alisa is King
                alisaPillar.style.height = maxPillarHeight + 'px';

                // Pretender climbs relative to his score vs the Best Score
                let pretenderHeight = (gameState.score / targetScore) * maxPillarHeight;
                if (pretenderHeight < 20) pretenderHeight = 20;
                pretenderPillar.style.height = pretenderHeight + 'px';

                // Restore original visuals
                if (charAlisa) charAlisa.style.backgroundImage = "url('assets/alisa.png')";
                if (charPretender) charPretender.style.backgroundImage = "url('assets/pretender.png')";
                
                if (alisaName && alisaName.dataset.originalName) {
                    alisaName.textContent = alisaName.dataset.originalName;
                } else if (alisaName && !alisaName.dataset.originalName) {
                    // Fallback if not loaded yet
                    if (alisaName.textContent === "") alisaName.textContent = "Alisa";
                }
                if (pretenderName) pretenderName.textContent = "Pretender";
                
            } else {
                // High score beaten! 
                // Left side becomes the player (Pretender), Right side resets
                let extraGrowth = (gameState.score - bestScore) / 2; // Grow slightly per point
                if (extraGrowth > 100) extraGrowth = 100;
                alisaPillar.style.height = (maxPillarHeight + extraGrowth) + 'px';

                // Pretender (right side) resets to the beginning height
                pretenderPillar.style.height = '20px';

                // Swap images: Player is now King, so they get the red King (Alisa) appearance!
                if (charAlisa) charAlisa.style.backgroundImage = "url('assets/alisa.png')";
                if (charPretender) charPretender.style.backgroundImage = "url('assets/pretender.png')"; // New challenger

                // Leave the left name blank (as requested), and reset the right name
                if (alisaName) alisaName.textContent = ""; 
                if (pretenderName) pretenderName.textContent = "Pretender";
            }
        }
    }

    // ─── Path Animation ─────────────────────────────────────
    /**
     * Animate a ball moving step-by-step along the BFS path.
     * @param {Array} path - Array of {row, col}
     * @param {number} color - Ball color index
     * @param {Function} onComplete - Called when animation finishes
     */
    function handleBallMove(path, color, onComplete) {
        if (path.length < 2) {
            onComplete();
            return;
        }

        const startCell = getCellEl(path[0].row, path[0].col);
        // Clear the start cell visually (the game already cleared it in state)
        startCell.innerHTML = '';
        startCell.classList.remove('selected');

        let stepIndex = 0;

        // Create the moving ball in the first cell
        const ball = document.createElement('div');
        ball.className = 'ball moving-ball color-' + color;
        const firstCell = getCellEl(path[0].row, path[0].col);
        firstCell.appendChild(ball);

        const STEP_SPEED = 50; // ms per cell

        function nextStep() {
            stepIndex++;
            if (stepIndex >= path.length) {
                // Remove the moving ball from its last temporary cell
                if (ball.parentNode) ball.parentNode.removeChild(ball);
                onComplete();
                return;
            }

            // Remove from previous cell
            const prevCell = getCellEl(path[stepIndex - 1].row, path[stepIndex - 1].col);
            if (prevCell.contains(ball)) prevCell.removeChild(ball);

            // Add to next cell
            const nextCell = getCellEl(path[stepIndex].row, path[stepIndex].col);
            nextCell.appendChild(ball);

            playMoveStep();

            setTimeout(nextStep, STEP_SPEED);
        }

        // Start moving after a tiny delay
        setTimeout(nextStep, STEP_SPEED);
    }

    // ─── Line Cleared ────────────────────────────────────────
    function handleLineCleared(clearedCells) {
        playExplosion();

        for (const pos of clearedCells) {
            const cellEl = getCellEl(pos.r, pos.c);
            const ball = cellEl.querySelector('.ball');
            if (ball) {
                ball.classList.add('popping');
                setTimeout(() => {
                    if (cellEl.contains(ball)) {
                        cellEl.removeChild(ball);
                    }
                }, 500);
            }
        }
    }

    // ─── Game Over ───────────────────────────────────────────
    function handleGameOver(score) {
        playTone(150, 'sawtooth', 0.8, 0.15);
        setTimeout(() => playTone(100, 'sawtooth', 1.0, 0.15), 400);

        finalScoreEl.textContent = score;
        gameOverModal.classList.remove('hidden');
    }

    // ─── Controls ────────────────────────────────────────────
    btnStartGame.addEventListener('click', () => {
        mainMenu.classList.add('hidden');
        document.getElementById('game-container').classList.remove('hidden');
        game.init(difficultySelect.value);
    });

    btnMenu.addEventListener('click', () => {
        document.getElementById('game-container').classList.add('hidden');
        mainMenu.classList.remove('hidden');
    });

    // Link menu buttons to existing buttons
    btnMenuSound.addEventListener('click', (e) => {
        document.getElementById('btn-sound').click();
        e.target.textContent = soundEnabled ? '🔊' : '🔇';
    });

    btnMenuLeaderboard.addEventListener('click', () => {
        document.getElementById('btn-leaderboard').click();
    });

    btnRestart.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        game.init(game.difficulty);
    });

    btnRestartOnly.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        game.init(game.difficulty);
    });

    // ─── Go ──────────────────────────────────────────────────
    initUI();
});
