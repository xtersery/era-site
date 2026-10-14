// A static server that answers like production on Timeweb (Caddy, as measured
// on era-cosmetology.ru, 14.10): no compression, no Cache-Control, an ETag and
// a Last-Modified — so the browser caches by heuristics, as it does live.
// `node e2e/static-prod.mjs <dist dir> <port> [gzip]`; SPA fallback to index.html.
// `gzip` answers text (JS, CSS, HTML, JSON, SVG) gzipped — the recommended
// Caddy config (`encode zstd gzip`) — to measure the site as it would be.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync } from 'node:zlib';

const [dir = 'dist', port = '4184', mode = ''] = process.argv.slice(2);
const gz = new Map();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.map': 'application/json', '.mp4': 'video/mp4', '.glb': 'model/gltf-binary' };
createServer(async (req, res) => {
  const path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(dir, path);
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
  } catch {
    file = join(dir, 'index.html');
  }
  try {
    const [body, st] = await Promise.all([readFile(file), stat(file)]);
    const etag = `"${st.size.toString(36)}-${st.mtimeMs.toString(36)}"`;
    if (req.headers['if-none-match'] === etag) return res.writeHead(304, { ETag: etag }).end();
    const type = TYPES[extname(file)] ?? 'application/octet-stream';
    const zip = mode === 'gzip' && /text|javascript|json|svg/.test(type) && /gzip/.test(req.headers['accept-encoding'] ?? '');
    const out = zip ? (gz.get(file) ?? gz.set(file, gzipSync(body, { level: 6 })).get(file)) : body;
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': out.length, 'Last-Modified': st.mtime.toUTCString(), ETag: etag, ...(zip ? { 'Content-Encoding': 'gzip', Vary: 'Accept-Encoding' } : { 'Accept-Ranges': 'bytes' }) });
    res.end(out);
  } catch {
    res.writeHead(404).end();
  }
}).listen(+port, () => console.log(`static-prod: ${dir} on :${port}`));
