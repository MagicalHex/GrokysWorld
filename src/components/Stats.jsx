// src/components/Stats.jsx
import React, { useState, useEffect } from 'react';

export default function Stats() {
  const [stats, setStats] = useState({ live: 0, today: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    };
    fetchStats();
    const id = setInterval(fetchStats, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ padding: 20, fontFamily: 'monospace' }}>
      <h2>Live Stats (Dev Only)</h2>
      <p>Active now (15 min): <strong>{stats.live}</strong></p>
      <p>Today total: <strong>{stats.today}</strong></p>
      <small>Only visible in dev or if you share link</small>
    </div>
  );
}