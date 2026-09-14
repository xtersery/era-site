// The wall for the passage: the whole frontal reference (docs/references/
// wallpapers.png, 1672 × 941, four slabs across) at native resolution, mirrored
// once vertically so it continues without a seam — laid 12 world units wide in
// the scene, so a slab is 3.24 units and the final view holds 2.65 of them.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/mineral/assets';
mkdirSync(OUT, { recursive: true });
const src = 'data:image/png;base64,' + readFileSync('docs/references/wallpapers.png').toString('base64');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const out = await p.evaluate(async ({ src }) => {
  const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  const W = img.naturalWidth, H = img.naturalHeight;
  const sheet = document.createElement('canvas'); sheet.width = W; sheet.height = H * 2;
  const s = sheet.getContext('2d');
  s.drawImage(img, 0, 0);
  s.save(); s.translate(0, H * 2); s.scale(1, -1); s.drawImage(img, 0, 0); s.restore();
  const lum = document.createElement('canvas'); lum.width = W; lum.height = H * 2;
  const l = lum.getContext('2d'); l.filter = 'grayscale(1)'; l.drawImage(sheet, 0, 0);
  return { sheet: sheet.toDataURL('image/jpeg', 0.88), lum: lum.toDataURL('image/jpeg', 0.84), W, H };
}, { src });
writeFileSync(`${OUT}/wall.jpg`, Buffer.from(out.sheet.split(',')[1], 'base64'));
writeFileSync(`${OUT}/wall-luma.jpg`, Buffer.from(out.lum.split(',')[1], 'base64'));
console.log(`wall.jpg ${out.W} × ${out.H * 2} · wall-luma.jpg`);
await b.close();
