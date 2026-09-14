// The destination material: the ERA clinic's wall, from the frontal reference
// docs/references/wallpapers.png (slabs ≈ 452 px square, seams at x 384 · 836 ·
// 1289, y 456). A window 836 px wide — the slab whose pale centre will sit
// under the typography column and the graphite band that will pass through the
// stone — is cut at native resolution, never stretched, and mirrored once
// vertically (the wall is book-matched) so the next section continues it
// without a seam. No grade: colour, tone, seams and light are the wall's.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/portraits/assets';
mkdirSync(OUT, { recursive: true });
const src = 'data:image/png;base64,' + readFileSync('docs/references/wallpapers.png').toString('base64');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const out = await p.evaluate(async ({ src }) => {
  const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const crop = { x: 784, y: 0, w: 836, h: 941 }; // the graphite band lands on the stone (x 45 %), the pale centre on the column
  const sheet = document.createElement('canvas'); sheet.width = crop.w; sheet.height = crop.h * 2;
  const s = sheet.getContext('2d');
  s.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  s.save(); s.translate(0, crop.h * 2); s.scale(1, -1); s.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h); s.restore();
  // the wall's own luminance: the veining as structure, and the surface's relief
  const lum = document.createElement('canvas'); lum.width = crop.w; lum.height = crop.h * 2;
  const l = lum.getContext('2d');
  l.filter = 'grayscale(1)';
  l.drawImage(sheet, 0, 0);
  const d = s.getImageData(0, 0, crop.w, crop.h).data;
  let r = 0, gg = 0, bb = 0, n = 0;
  for (let i = 0; i < d.length; i += 64) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
  return { sheet: sheet.toDataURL('image/jpeg', 0.9), lum: lum.toDataURL('image/jpeg', 0.86), avg: [Math.round(r / n), Math.round(gg / n), Math.round(bb / n)] };
}, { src });
writeFileSync(`${OUT}/marble.jpg`, Buffer.from(out.sheet.split(',')[1], 'base64'));
writeFileSync(`${OUT}/marble-luma.jpg`, Buffer.from(out.lum.split(',')[1], 'base64'));
console.log('marble.jpg 836 × 1882 (native, mirror pair) · marble-luma.jpg · average slab colour rgb', out.avg, '#' + out.avg.map((v) => v.toString(16).padStart(2, '0')).join(''));
await b.close();
