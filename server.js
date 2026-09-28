const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');
const LEVELS_FILE = path.join(DATA_DIR, 'custom-levels.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial default high scores if none exist
const DEFAULT_SCORES = [
  { name: 'NOKIA_MASTER', score: 12500, level: 5, date: '2003-08-15' },
  { name: 'RED_BALL_99', score: 9800, level: 4, date: '2004-02-20' },
  { name: 'BOUNCER', score: 7200, level: 3, date: '2004-11-05' },
  { name: 'RETRO_FAN', score: 4500, level: 2, date: '2005-06-12' },
  { name: 'ROOKIE', score: 1500, level: 1, date: '2006-01-01' }
];

if (!fs.existsSync(SCORES_FILE)) {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(DEFAULT_SCORES, null, 2), 'utf8');
}

if (!fs.existsSync(LEVELS_FILE)) {
  fs.writeFileSync(LEVELS_FILE, JSON.stringify([], null, 2), 'utf8');
}

// Middleware
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// API: Get high scores
app.get('/api/scores', (req, res) => {
  try {
    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const scores = JSON.parse(raw);
    scores.sort((a, b) => b.score - a.score);
    res.json({ success: true, scores: scores.slice(0, 20) });
  } catch (err) {
    console.error('Error reading scores:', err);
    res.status(500).json({ success: false, error: 'Failed to read high scores' });
  }
});

// API: Submit a high score
app.post('/api/scores', (req, res) => {
  try {
    const { name, score, level } = req.body;
    if (!name || typeof score !== 'number') {
      return res.status(400).json({ success: false, error: 'Invalid score data' });
    }

    const cleanName = String(name).trim().slice(0, 16) || 'ANONYMOUS';
    const cleanScore = Math.max(0, Math.floor(score));
    const cleanLevel = Math.max(1, Math.floor(level || 1));

    const raw = fs.readFileSync(SCORES_FILE, 'utf8');
    const scores = JSON.parse(raw);

    const newEntry = {
      name: cleanName,
      score: cleanScore,
      level: cleanLevel,
      date: new Date().toISOString().split('T')[0]
    };

    scores.push(newEntry);
    scores.sort((a, b) => b.score - a.score);
    const topScores = scores.slice(0, 50);

    fs.writeFileSync(SCORES_FILE, JSON.stringify(topScores, null, 2), 'utf8');

    const rank = topScores.findIndex(s => s === newEntry) + 1;
    res.json({ success: true, rank, topScores: topScores.slice(0, 10) });
  } catch (err) {
    console.error('Error saving score:', err);
    res.status(500).json({ success: false, error: 'Failed to save score' });
  }
});

// API: Get custom levels
app.get('/api/custom-levels', (req, res) => {
  try {
    const raw = fs.readFileSync(LEVELS_FILE, 'utf8');
    const levels = JSON.parse(raw);
    res.json({ success: true, levels });
  } catch (err) {
    console.error('Error reading levels:', err);
    res.status(500).json({ success: false, error: 'Failed to read custom levels' });
  }
});

// API: Save custom level
app.post('/api/custom-levels', (req, res) => {
  try {
    const { title, author, levelData } = req.body;
    if (!title || !levelData) {
      return res.status(400).json({ success: false, error: 'Title and levelData required' });
    }

    const raw = fs.readFileSync(LEVELS_FILE, 'utf8');
    const levels = JSON.parse(raw);

    const newLevel = {
      id: 'lvl_' + Date.now(),
      title: String(title).trim().slice(0, 30),
      author: String(author || 'Creator').trim().slice(0, 20),
      createdAt: new Date().toISOString(),
      levelData
    };

    levels.unshift(newLevel);
    fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels.slice(0, 50), null, 2), 'utf8');

    res.json({ success: true, level: newLevel });
  } catch (err) {
    console.error('Error saving custom level:', err);
    res.status(500).json({ success: false, error: 'Failed to save level' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.listen(PORT, () => {
  console.log(`Bounce Game server running at http://localhost:${PORT}`);
});
