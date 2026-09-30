// Loopback-only secret relay for the browser wallet UI.
//
// Why: importing the miner key into a wallet extension requires the key to reach
// the extension's input field. Typing it into a shell command would spill it into
// the session log, so instead the extension page fetches it from 127.0.0.1.
// Serves only files explicitly named on the command line; listens on loopback only.
import http from 'node:http';
import fs from 'node:fs';

const [keyFile, portArg] = process.argv.slice(2);
const PORT = Number(portArg || 8799);

const server = http.createServer((req, res) => {
  const name = (req.url || '/').replace(/^\//, '').split('?')[0];
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('cache-control', 'no-store');
  if (name !== 'key' || !keyFile) {
    res.writeHead(404, { 'content-type': 'text/plain' });
    res.end('no');
    return;
  }
  try {
    const value = fs.readFileSync(keyFile, 'utf8').trim();
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end(value);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain' });
    res.end(String(err.message));
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`secret relay on http://127.0.0.1:${PORT}/key`));
