const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'scores.json');

app.use(cors());
app.use(express.json());

// Initialize database file
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
}

// Get top scores
app.get('/api/leaderboard', (req, res) => {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        let scores = JSON.parse(data);
        res.json({ scores });
    } catch (error) {
        console.error('Error reading scores:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Submit new score
app.post('/api/leaderboard', (req, res) => {
    try {
        const { name, score, date } = req.body;
        
        if (typeof score !== 'number' || !name) {
            return res.status(400).json({ error: 'Invalid score data' });
        }

        const data = fs.readFileSync(DATA_FILE, 'utf8');
        let scores = JSON.parse(data);

        scores.push({
            name: name.substring(0, 20), // Max 20 chars
            score: score,
            date: date || new Date().toISOString()
        });

        // Sort descending and keep top 100
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 100);

        fs.writeFileSync(DATA_FILE, JSON.stringify(scores, null, 2));
        
        res.status(201).json({ message: 'Score saved successfully' });
    } catch (error) {
        console.error('Error saving score:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Color Lines Leaderboard server running on port ${PORT}`);
});
