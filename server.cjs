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

// === API: CONNECT (insert into BOTH collections) ===
app.post('/api/connect', async (req, res) => {
  if (!db) return res.json({ ok: false, error: 'DB not ready' });

  const liveCol = db.collection('connections_live');
  const logCol  = db.collection('connections_log');

  const doc = {
    sessionId: req.body.sessionId || 'unknown',
    timestamp: new Date(),
    userAgent: req.headers['user-agent'] || 'unknown'
  };

  try {
    await Promise.all([
      liveCol.insertOne(doc),
      logCol.insertOne(doc)
    ]);
    console.log('Logged session:', doc.sessionId);
    res.json({ ok: true });
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