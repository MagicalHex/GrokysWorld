// server.cjs — FINAL: TTL (live) + Permanent Log + Rate Limiting
const fs = require('fs');
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());

// === RATE LIMITING (1 connect/sec per IP) ===
const rateLimit = require('express-rate-limit');
const connectLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  message: { error: 'Too many requests, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/connect', connectLimiter);

let db = null;
const BUILD_PATH = path.resolve(__dirname, 'build');

// === LOG STARTUP ===
console.log('Starting server...');
console.log('BUILD_PATH:', BUILD_PATH);
console.log('Files in build/:', fs.readdirSync(BUILD_PATH).join(', '));

// === MONGODB CONNECTION ===
if (process.env.MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI);

  client.connect()
    .then(() => {
      db = client.db('grokysworld');

      const liveCol = db.collection('connections_live');
      const logCol  = db.collection('connections_log');

      // TTL: Delete live entries after 15 minutes
      liveCol.createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 900 }
      ).then(() => console.log('TTL index created on connections_live'))
       .catch(err => console.error('TTL index failed:', err));

      console.log('MongoDB connected');
    })
    .catch(err => {
      console.error('MongoDB connect failed:', err.message);
      db = null;
    });
} else {
  console.warn('MONGODB_URI not set — running without DB');
}
  // === API: CONNECT (deduplicated per sessionId, 10 min cooldown) ===
  app.post('/api/connect', async (req, res) => {
    if (!db) return res.json({ ok: false, error: 'DB not ready' });

    const liveCol = db.collection('connections_live');
    const logCol  = db.collection('connections_log');

    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ ok: false, error: 'Missing sessionId' });
    }

    const now = new Date();
    const cooldownMs = 10 * 60 * 1000; // 10 minutes
    const cutoff = new Date(now.getTime() - cooldownMs);

    try {
      // Check if this sessionId was logged in last 10 minutes
      const recent = await liveCol.findOne({
        sessionId,
        timestamp: { $gt: cutoff }
      });

      if (recent) {
        console.log('Session already logged recently:', sessionId);
        return res.json({ ok: true, alreadyCounted: true });
      }

      // Otherwise, log it
      const doc = {
        sessionId,
        timestamp: now,
        userAgent: req.headers['user-agent'] || 'unknown'
      };

      await Promise.all([
        liveCol.insertOne(doc),
        logCol.insertOne(doc)
      ]);

      console.log('New session logged:', sessionId);
      res.json({ ok: true, alreadyCounted: false });
    } catch (e) {
      console.error('POST /api/connect error:', e);
      res.status(500).json({ error: e.message });
    }
  });

// === API: STATS (live = TTL, today = permanent) ===
app.get('/api/stats', async (req, res) => {
  if (!db) return res.json({ live: 0, today: 0 });

  const liveCol = db.collection('connections_live');
  const logCol  = db.collection('connections_log');

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [live, today] = await Promise.all([
      liveCol.countDocuments({
        timestamp: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
      }),
      logCol.countDocuments({
        timestamp: { $gte: startOfDay }
      })
    ]);

    res.json({ live, today });
  } catch (e) {
    console.error('GET /api/stats error:', e);
    res.json({ live: 0, today: 0 });
  }
});

// === SURVIVAL LEADERBOARD COLLECTION ===
let scoresCol = null;
if (db) {
  scoresCol = db.collection('survival_scores');

  // Index for fast leaderboard + deduplication
  scoresCol.createIndex({ score: -1, timestamp: -1 });
  // scoresCol.createIndex({ sessionId: 1, score: 1 }, { unique: true, sparse: true }); // prevent spam from same session
  console.log('Survival leaderboard collection ready');
}

// === API: SUBMIT SURVIVAL SCORE ===
// === API: SUBMIT SURVIVAL SCORE (NO LOGIN, FULLY ANONYMOUS) ===
app.post('/api/submit-score', async (req, res) => {
  if (!db || !scoresCol) {
    return res.status(503).json({ ok: false, error: 'Leaderboard not ready' });
  }

  const { score, name } = req.body;

  if (!score || typeof score !== 'number' || score < 5000) {
    return res.status(400).json({ ok: false, error: 'Invalid score' });
  }

  const cleanName = String(name || 'Anonymous Legend')
    .trim()
    .slice(0, 25)
    .replace(/[^\w\s#-]/gi, '') || 'Groky Fan';

  try {
    await scoresCol.insertOne({
      score: Math.floor(score),
      name: cleanName,
      userAgent: req.headers['user-agent']?.slice(0, 100) || 'unknown',
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress
    });

    console.log(`LEADERBOARD → ${cleanName}: ${score.toLocaleString()}`);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ ok: true, alreadySubmitted: true });
    }
    console.error('Submit error:', err);
    res.status(500).json({ ok: false });
  }
});

// === API: GET LEADERBOARD ===
app.get('/api/leaderboard', async (req, res) => {
  if (!db || !scoresCol) {
    return res.json({ allTime: [], today: [] });
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [allTime, today] = await Promise.all([
      scoresCol
        .find({})
        .sort({ score: -1, timestamp: 1 })
        .limit(50)
        .project({ name: 1, score: 1, timestamp: 1, _id: 0 })
        .toArray(),

      scoresCol
        .find({ timestamp: { $gte: startOfDay } })
        .sort({ score: -1, timestamp: 1 })
        .limit(20)
        .project({ name: 1, score: 1, timestamp: 1, _id: 0 })
        .toArray()
    ]);

    const format = (arr) => arr.map(entry => ({
      name: entry.name,
      score: entry.score,
      timeAgo: timeAgo(entry.timestamp)
    }));

    res.json({
      allTime: format(allTime),
      today: format(today)
    });
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    res.json({ allTime: [], today: [] });
  }
});

// Helper for "3 minutes ago" style
function timeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// === HEALTH CHECK ===
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// === SERVE STATIC FILES (after API) ===
app.use('/assets', express.static(path.join(BUILD_PATH, 'assets')));
app.use(express.static(BUILD_PATH));

// === SPA FALLBACK (last) ===
app.get(/.*/, (req, res) => {
  const indexPath = path.join(BUILD_PATH, 'index.html');
  fs.access(indexPath, err => {
    if (err) {
      console.error('index.html NOT FOUND at:', indexPath);
      return res.status(500).send('Build folder missing');
    }
    res.sendFile(indexPath);
  });
});

// === START SERVER ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server RUNNING on port ${PORT}`);
});