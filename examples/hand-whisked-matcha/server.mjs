import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function createMatchaServer() {
  return createServer(async (request, response) => {
    const { pathname } = new URL(request.url, 'http://localhost');
    const path = pathname === '/' ? '/index.html' : pathname;
    const allowed = /^\/(?:index\.html|(?:tokens|styles)\.css|(?:story|scene|models)\.mjs|events\.json|assets\/[\w.-]+|vendor\/three\.module\.min\.js)$/;
    if (!['GET', 'HEAD'].includes(request.method) || !allowed.test(path) || !mime[extname(path)]) {
      response.writeHead(404).end();
      return;
    }

    const filename = path.startsWith('/vendor/') ? './node_modules/three/build/three.module.min.js' : '.' + path;
    const url = new URL(filename, import.meta.url);
    try {
      const info = await stat(url);
      if (!info.isFile()) return response.writeHead(404).end();
      response.writeHead(200, { 'Content-Type': mime[extname(path)], 'Content-Length': info.size });
      if (request.method === 'HEAD') return response.end();
      createReadStream(url).on('error', () => response.destroy()).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.AOAWA_PORT ?? 4182);
  const server = createMatchaServer();
  server.listen(port, '127.0.0.1', () => console.log('AOAWA · http://127.0.0.1:' + server.address().port));
}
