const fs = require('fs');
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());

let db = null;
const BUILD_PATH = path.resolve(__dirname, 'build');

// === LOG STARTUP ===
console.log('Starting server...');
console.log('BUILD_PATH:', BUILD_PATH);
console.log('Files in build/:', fs.readdirSync(BUILD_PATH).join(', '));

// === MONGODB ===
if (process.env.MONGODB_URI) {
  console.log('Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI);
  client.connect()
    .then(() => {
      db = client.db('grokysworld');
      db.collection('connections').createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 900 }
      ).catch(err => console.error('Index creation failed:', err));
      console.log('MongoDB connected');
    })
    .catch(err => {
      console.error('MongoDB connect failed:', err.message);
      db = null;
    });
} else {
  console.warn('MONGODB_URI not set — running without DB');
}

// === API ROUTES (FIRST) ===
app.post('/api/connect', async (req, res) => {
  if (!db) return res.json({ ok: false, error: 'DB not ready' });
  try {
    await db.collection('connections').insertOne({
      sessionId: req.body.sessionId || 'unknown',
      timestamp: new Date()
    });
    console.log('Inserted connection:', req.body.sessionId); // ← ADD THIS
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/connect error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stats', async (req, res) => {
  if (!db) return res.json({ live: 0 });
  try {
    const live = await db.collection('connections').countDocuments({
      timestamp: { $gt: new Date(Date.now() - 15 * 60 * 1000) }
    });
    res.json({ live });
  } catch (e) {
    console.error('GET /api/stats error:', e);
    res.json({ live: 0 });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// === STATIC FILES (AFTER API) ===
app.use('/assets', express.static(path.join(BUILD_PATH, 'assets')));
app.use(express.static(BUILD_PATH));

// === SPA FALLBACK (LAST) ===
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

// === START ===
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server RUNNING on port ${PORT}`);
});