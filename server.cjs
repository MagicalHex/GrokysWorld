// server.cjs — FINAL WORKING VERSION (only this file changed)
const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
app.use(express.json());

let db = null;

// === CONNECT TO MONGODB ===
if (process.env.MONGODB_URI) {
  const client = new MongoClient(process.env.MONGODB_URI);
  client.connect()
    .then(() => {
      db = client.db('grokysworld');
      db.collection('connections').createIndex(
        { timestamp: 1 },
        { expireAfterSeconds: 900 }   // 15 min TTL
      );
      console.log('MongoDB connected');
    })
    .catch(err => console.error('MongoDB connect failed:', err.message));
} else {
  console.warn('MONGODB_URI not set — running without DB');
}

// === API ROUTES (MUST COME BEFORE *) ===
app.post('/api/connect', async (req, res) => {
  if (!db) return res.json({ ok: false, error: 'DB not ready' });
  try {
    await db.collection('connections').insertOne({
      sessionId: req.body.sessionId || 'unknown',
      timestamp: new Date()
    });
    res.json({ ok: true });
  } catch (e) {
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
    res.json({ live: 0 });
  }
});

// === SERVE STATIC FILES — fallback to index.html if file missing ===
const buildPath = path.resolve(__dirname, 'build');   // <-- absolute path
app.use(express.static(buildPath));

// Catch-all must be **after** static middleware
app.get('*', (req, res) => {
  const indexFile = path.join(buildPath, 'index.html');
  res.sendFile(indexFile, err => {
    if (err) {
      console.error('sendFile error:', err);
      res.status(500).send('Server error');
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));