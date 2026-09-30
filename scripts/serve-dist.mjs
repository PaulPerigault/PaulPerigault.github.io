// Serveur statique minimal pour les tests e2e : sert `dist/` comme GitHub Pages
// (index de répertoire, 404.html, pas de réécriture SPA), sans dépendance.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = join(import.meta.dirname, '..', 'dist');
const PORT = Number(process.env.PORT ?? 4201);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
};

function resolveFile(urlPath) {
  const safe = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/, '');
  const target = join(ROOT, safe);
  if (existsSync(target) && statSync(target).isDirectory()) return join(target, 'index.html');
  return target;
}

createServer((req, res) => {
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  let file = resolveFile(pathname);
  let status = 200;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    file = join(ROOT, '404.html');
    status = 404;
  }
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found');
    return;
  }
  res.writeHead(status, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(PORT, () => process.stdout.write(`dist servi sur http://localhost:${PORT}\n`));
