/**
 * Leaderboard module
 * Connects to Firebase Realtime Database dynamically.
 * Falls back to LocalStorage if unreachable.
 */

const firebaseConfig = {
    apiKey: "AIzaSyATkSNiHO9Y95zgg43FZ1EN87qniqu0NRE",
    authDomain: "colorlinesretro.firebaseapp.com",
    databaseURL: "https://colorlinesretro-default-rtdb.firebaseio.com",
    projectId: "colorlinesretro",
    storageBucket: "colorlinesretro.firebasestorage.app",
    messagingSenderId: "379311752072",
    appId: "1:379311752072:web:c7c4e40988e2352b5b703d"
};

class Leaderboard {
    static db = null;
    static fb = null; // Firebase DB methods

    static async initFirebase() {
        if (this.db) return;
        try {
            const appMod = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
            const dbMod = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");

            const app = appMod.initializeApp(firebaseConfig);
            this.db = dbMod.getDatabase(app);
            this.fb = dbMod; // store reference to ref, set, get, child
        } catch (e) {
            console.error("Failed to load Firebase", e);
            throw e;
        }
    }

    static async getScores() {
        try {
            await this.initFirebase();
            const dbRef = this.fb.ref(this.db);
            const snapshot = await this.fb.get(this.fb.child(dbRef, `scores`));

            if (snapshot.exists()) {
                const data = snapshot.val();
                let scores = Array.isArray(data) ? data : Object.values(data);
                scores.sort((a, b) => b.score - a.score);
                return scores;
            } else {
                return [];
            }
        } catch (error) {
            console.error('Firebase error, using LocalStorage', error);
            const localScores = localStorage.getItem('colorLinesLeaderboard');
            return localScores ? JSON.parse(localScores) : [];
        }
    }

    static async submitScore(name, score) {
        const entry = { name: name || 'Anonymous', score, date: new Date().toISOString() };

        try {
            let scores = await this.getScores();
            scores.push(entry);
            scores.sort((a, b) => b.score - a.score);
            const top50 = scores.slice(0, 50);

            await this.initFirebase();
            await this.fb.set(this.fb.ref(this.db, 'scores'), top50);
            return true;
        } catch (error) {
            console.error('Error submitting to Firebase', error);
            const localScores = localStorage.getItem('colorLinesLeaderboard');
            let scores = localScores ? JSON.parse(localScores) : [];
            scores.push(entry);
            scores.sort((a, b) => b.score - a.score);
            const top10 = scores.slice(0, 10);
            localStorage.setItem('colorLinesLeaderboard', JSON.stringify(top10));
            return true;
        }
    }
}

// Expose globally so ui.js and game.js can use it
window.Leaderboard = Leaderboard;

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
