import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.env.PORT || 4173);
const root = resolve(import.meta.dirname, '..');
const mimeTypes = {
	'.css': 'text/css; charset=utf-8',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mp3': 'audio/mpeg',
	'.svg': 'image/svg+xml',
	'.wav': 'audio/wav',
};

createServer((request, response) => {
  // Assets are edited in place during development. Prevent browsers from
  // retaining an old SVG/CSS response under the same URL after a reload.
  response.setHeader('Cache-Control', 'no-store, max-age=0');
  const requestedPath = request.url === '/' ? '/index.html' : new URL(request.url, 'http://localhost').pathname;
	const filePath = resolve(root, `.${normalize(requestedPath)}`);
	if (!filePath.startsWith(root) || !existsSync(filePath)) {
		response.writeHead(404);
		response.end('Not found');
		return;
	}

	response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
	createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
	console.log(`Symmetrica is available at http://127.0.0.1:${port}`);
});
