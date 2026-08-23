import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const indexFile = path.join(root, 'index.html');
const MIME = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webm': 'video/webm',
  '.webp': 'image/webp'
};

function sendFile(req, res, file) {
  const stat = fs.statSync(file);
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(file);
  stream.on('error', () => {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  });
  stream.pipe(res);
}

export function serve(port = 8321, host = '127.0.0.1') {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      return res.end('Method Not Allowed');
    }

    let pathname;
    try {
      pathname = decodeURIComponent((req.url || '/').split('?')[0]).replaceAll('\\', '/');
    } catch {
      res.writeHead(400);
      return res.end('Bad Request');
    }

    const candidate = path.resolve(root, '.' + (pathname.startsWith('/') ? pathname : '/' + pathname));
    const relative = path.relative(root, candidate);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return sendFile(req, res, candidate);
    }

    // Only extensionless application routes receive the SPA fallback.
    if (!path.extname(pathname)) return sendFile(req, res, indexFile);
    res.writeHead(404);
    res.end('Not Found');
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const address = server.address();
      server.port = typeof address === 'object' && address ? address.port : port;
      resolve(server);
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.argv[2] || 8321);
  serve(port).then(server => console.log(`MİHENK: http://127.0.0.1:${server.port}`));
}
