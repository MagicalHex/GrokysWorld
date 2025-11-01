// server.cjs
const http = require('http');
let connections = 0;

const server = http.createServer((req, res) => {
  // Log every request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Count connections (simple example)
  if (req.url === '/count') {
    connections++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ connections, timestamp: new Date().toISOString() }));
    return;
  }

  // Health check
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Serve React app for all other routes (optional)
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`<h1>Node.js is running!</h1><p>Connections: ${connections}</p>`);
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Visit /count to increment counter`);
});