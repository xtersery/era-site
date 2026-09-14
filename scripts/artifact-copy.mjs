// Prepares a built spike page or board for publishing as an artifact: drops the
// document wrapper (the host supplies its own) and the <meta> tags of the head.
//
// The <meta> removal is deliberately narrow. An earlier ad-hoc version used the
// pattern `<meta[^>]*>` over the whole head — which also matched
// `<metalnessmap_fragment>` and `<metalnessmap_pars_fragment>` inside the
// inlined three.js source, deleting the chunk names from every physical
// material's `#include` and leaving `'include' : invalid directive` on the
// GPU. Only real tags, only in the markup before the first <style>/<script>.
import { readFileSync, writeFileSync } from 'node:fs';

const [src, dst] = process.argv.slice(2);
if (!src || !dst) throw new Error('usage: node scripts/artifact-copy.mjs <built.html> <artifact.html>');
const html = readFileSync(src, 'utf8');
const head = /<head>([\s\S]*?)<\/head>/.exec(html)?.[1] ?? '';
const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(html)?.[1] ?? html;
// the markup before any inlined code is the only place a <meta> tag can be
const codeAt = head.search(/<(style|script)\b/);
const markup = codeAt < 0 ? head : head.slice(0, codeAt);
const code = codeAt < 0 ? '' : head.slice(codeAt);
const cleanMarkup = markup.replace(/<meta\b[^>]*>/g, '');
const out = cleanMarkup + code + '\n' + body;
// assert nothing that looks like a shader include was touched
const before = (html.match(/#include <[a-z_]+>/g) ?? []).length;
const after = (out.match(/#include <[a-z_]+>/g) ?? []).length;
if (before !== after) throw new Error(`artifact copy would change shader includes: ${before} → ${after}`);
writeFileSync(dst, out);
console.log(dst, Math.round(out.length / 1024), 'KB ·', after, 'shader includes intact');
