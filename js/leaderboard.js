/**
 * Leaderboard module
 * Attempts to connect to the backend API.
 * Falls back to LocalStorage if the backend is unreachable.
 */

const API_URL = 'https://colorlinesretrodeluxe.onrender.com/api/leaderboard';

class Leaderboard {
    static async getScores() {
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('Backend unreachable');
            const data = await response.json();
            return data.scores;
        } catch (error) {
            console.log('Using LocalStorage for Leaderboard (Backend unreachable)');
            const localScores = localStorage.getItem('colorLinesLeaderboard');
            return localScores ? JSON.parse(localScores) : [];
        }
    }

    static async submitScore(name, score) {
        const entry = { name: name || 'Anonymous', score, date: new Date().toISOString() };
        
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
            if (!response.ok) throw new Error('Backend unreachable');
            return true;
        } catch (error) {
            // Fallback to local
            const scores = await this.getScores();
            scores.push(entry);
            scores.sort((a, b) => b.score - a.score);
            const top10 = scores.slice(0, 10);
            localStorage.setItem('colorLinesLeaderboard', JSON.stringify(top10));
            return true;
        }
    }
}

// UI bindings
document.addEventListener('DOMContentLoaded', () => {
    const btnLeaderboard = document.getElementById('btn-leaderboard');
    const leaderboardModal = document.getElementById('leaderboard-modal');
    const btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    const leaderboardList = document.getElementById('leaderboard-list');
    
    const btnSubmitScore = document.getElementById('btn-submit-score');
    const playerNameInput = document.getElementById('player-name');
    const finalScoreEl = document.getElementById('final-score');
    const bestScoreEl = document.getElementById('best-score');

    // Load best score on startup
    Leaderboard.getScores().then(scores => {
        if (scores && scores.length > 0) {
            bestScoreEl.textContent = scores[0].score;
            const alisaNameEl = document.getElementById('alisa-name');
            if (alisaNameEl) {
                alisaNameEl.textContent = scores[0].name;
                alisaNameEl.dataset.originalName = scores[0].name;
            }
        }
    });

    btnLeaderboard.addEventListener('click', async () => {
        leaderboardList.innerHTML = '<li>Loading...</li>';
        leaderboardModal.classList.remove('hidden');
        
        const scores = await Leaderboard.getScores();
        leaderboardList.innerHTML = '';
        
        if (scores.length === 0) {
            leaderboardList.innerHTML = '<li>No scores yet!</li>';
        } else {
            scores.forEach((s, i) => {
                const li = document.createElement('li');
                
                const rankName = document.createElement('span');
                rankName.textContent = `${i + 1}. ${s.name}`;
                
                const scoreSpan = document.createElement('span');
                scoreSpan.textContent = s.score;
                
                li.appendChild(rankName);
                li.appendChild(scoreSpan);
                leaderboardList.appendChild(li);
            });
        }
    });

    btnCloseLeaderboard.addEventListener('click', () => {
        leaderboardModal.classList.add('hidden');
    });

    btnSubmitScore.addEventListener('click', async () => {
        const score = parseInt(finalScoreEl.textContent);
        let baseName = playerNameInput.value.trim() || 'Player';
        
        const diffSelect = document.getElementById('difficulty-select');
        const diffVal = diffSelect ? diffSelect.value : 'medium';
        const diffLabels = { 'easy': 'Kolay', 'medium': 'Orta', 'hard': 'Zor' };
        const name = `${baseName} (${diffLabels[diffVal]})`;
        
        btnSubmitScore.disabled = true;
        btnSubmitScore.textContent = 'Submitting...';
        
        await Leaderboard.submitScore(name, score);
        
        // Update best score display
        const scores = await Leaderboard.getScores();
        if (scores && scores.length > 0) {
            bestScoreEl.textContent = scores[0].score;
            const alisaNameEl = document.getElementById('alisa-name');
            if (alisaNameEl) {
                alisaNameEl.textContent = scores[0].name;
                alisaNameEl.dataset.originalName = scores[0].name;
            }
        }

        // Trigger restart from UI
        document.getElementById('btn-restart-only').click();
        btnSubmitScore.disabled = false;
        btnSubmitScore.textContent = 'Submit Score & Restart';
    });
});
