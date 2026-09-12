// Turns the Vite output of one spike page into a single HTML file: the module
// script and the stylesheet are inlined (assets were already inlined by the
// build). Writes dist-spike/<spike>.html — the file published as the artifact.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const spike = process.argv[2] ?? 'radial';
const root = 'dist-spike';
const htmlPath = join(root, 'spikes', spike, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
const assets = join(root, 'assets');
const files = readdirSync(assets);
const js = files.find((f) => f.endsWith('.js'));
const css = files.find((f) => f.endsWith('.css'));
if (!js) throw new Error('no js bundle');
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');
html = html.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>/, () => `<script type="module">${readFileSync(join(assets, js), 'utf8').replace(/<\/script/g, '<\\/script')}</script>`);
if (css) html = html.replace(/<link rel="stylesheet"[^>]*href="[^"]*"[^>]*>/, () => `<style>${readFileSync(join(assets, css), 'utf8')}</style>`);
html = html.replace(/<link rel="icon"[^>]*>/, '');
writeFileSync(join(root, `${spike}.html`), html);
console.log(join(root, `${spike}.html`), Math.round(html.length / 1024), 'KB');
