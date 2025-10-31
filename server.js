// server.js
require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve React build (Azure expects this)
app.use(express.static(path.join(__dirname, 'build')));

// === MONGODB CONNECTION ===
let db;
const client = new MongoClient(process.env.MONGODB_URI);

client.connect()
  .then(() => {
    db = client.db('grokysworld');
    console.log('Connected to MongoDB');
    // Create TTL index: auto-delete after 15 min
    db.collection('connections').createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 900 } // 15 min
    );
  })
  .catch(err => console.error('MongoDB connect error:', err));

// === API: Log a real connection (called when PLAY is clicked) ===
app.post('/api/connect', async (req, res) => {
  try {
    const { sessionId, userId = 'anon', ip, userAgent } = req.body;

    await db.collection('connections').insertOne({
      sessionId,
      userId,
      ip: ip || req.ip,
      userAgent: userAgent || req.get('User-Agent'),
      type: 'play',
      timestamp: new Date()
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log connection' });
  }
});

// === API: Get live stats ===
app.get('/api/stats', async (req, res) => {
  try {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [live, today] = await Promise.all([
      db.collection('connections').countDocuments({
        timestamp: { $gt: fifteenMinAgo }
      }),
      db.collection('connections').countDocuments({
        timestamp: { $gte: todayStart }
      })
    ]);

    res.json({ live, today });
  } catch (err) {
    res.status(500).json({ error: 'Stats error' });
  }
});

// === Serve React app for all other routes ===
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});