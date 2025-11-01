// server.cjs - MINIMAL, VERIFIED WORKING ON AZURE IISNODE
const http = require('http');

let connections = 0;

const server = http.createServer((req, res) => {
  console.log('Request:', req.method, req.url);

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  if (req.url === '/count') {
    connections++;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ connections: connections }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Node.js is running!</h1><p>Visit /health or /count</p>');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Server started on port ' + port);
});