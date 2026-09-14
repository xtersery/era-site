// The wall for the passage: the whole frontal reference (docs/references/
// wallpapers.png, 1672 × 941 — the first three whole slabs, 1289 px) at native resolution, mirrored
// once vertically so it continues without a seam — laid 9.25 world units wide in
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
  // three whole slabs (to the seam at x 1289), so the sheet's mirror repeat folds on a seam
  const W = 1289, H = img.naturalHeight;
  const sheet = document.createElement('canvas'); sheet.width = W; sheet.height = H * 2;
  const s = sheet.getContext('2d');
  s.drawImage(img, 0, 0, W, H, 0, 0, W, H);
  s.save(); s.translate(0, H * 2); s.scale(1, -1); s.drawImage(img, 0, 0, W, H, 0, 0, W, H); s.restore();
  const lum = document.createElement('canvas'); lum.width = W; lum.height = H * 2;
  const l = lum.getContext('2d'); l.filter = 'grayscale(1)'; l.drawImage(sheet, 0, 0);
  return { sheet: sheet.toDataURL('image/jpeg', 0.88), lum: lum.toDataURL('image/jpeg', 0.84), W, H };
}, { src });
writeFileSync(`${OUT}/wall.jpg`, Buffer.from(out.sheet.split(',')[1], 'base64'));
writeFileSync(`${OUT}/wall-luma.jpg`, Buffer.from(out.lum.split(',')[1], 'base64'));
console.log(`wall.jpg ${out.W} × ${out.H * 2} · wall-luma.jpg`);
await b.close();
