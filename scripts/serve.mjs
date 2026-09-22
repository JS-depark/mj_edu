import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const allowed = new Set(['/index.html', '/styles.css', '/app.js', '/engine.js', '/favicon.svg']);
createServer(async (request, response) => {
  try {
    const route = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const target = route === '/' ? '/index.html' : route;
    if (!allowed.has(target) && !/^\/assets\/tiles\/(?:(?:Man|Pin|Sou)[1-9]|Ton|Nan|Shaa|Pei|Haku|Hatsu|Chun)\.svg$/.test(target)) { response.writeHead(404); response.end('Not found'); return; }
    const path = resolve(root, `.${target}`);
    if (!path.startsWith(resolve(root) + sep)) { response.writeHead(403); response.end(); return; }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
}).listen(port, '127.0.0.1', () => {
  console.log(`차곡 (이 PC에서만 접속): http://127.0.0.1:${port}`);
});
