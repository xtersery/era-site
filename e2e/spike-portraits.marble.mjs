// The destination material: the clinic's real wall (docs/references/era-marble-wall.jpg).
// The clean panel right of the screen — two tiles high, book-matched as the wall is laid —
// is cropped, de-foreshortened (the photograph looks along the wall; the tiles are square),
// and book-matched 2 × 2 — the diamond the wall is laid in — so the sheet repeats without a seam.
// No grade: the colour, tone, veining and light are the wall's own.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/portraits/assets';
mkdirSync(OUT, { recursive: true });
const src = 'data:image/jpeg;base64,' + readFileSync('docs/references/era-marble-wall.jpg').toString('base64');
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
const out = await p.evaluate(async ({ src }) => {
  const img = await new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
  // the panel right of the screen: 1.8 tiles wide, 2 tiles high (seams at y ≈ 305 · 565 · 835)
  const crop = { x: 1110, y: 305, w: 330, h: 530 };
  const T = 768; // ×2.3 across, ×1.45 down: the tiles come back to square
  // book-matched both ways — the diamond the wall is laid in — so the sheet
  // repeats without a seam in either direction
  const sheet = document.createElement('canvas'); sheet.width = T * 2; sheet.height = T * 2;
  const s = sheet.getContext('2d');
  const draw = () => s.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, T, T);
  draw();
  s.save(); s.translate(T * 2, 0); s.scale(-1, 1); draw(); s.restore();
  s.save(); s.translate(0, T * 2); s.scale(1, -1); draw(); s.restore();
  s.save(); s.translate(T * 2, T * 2); s.scale(-1, -1); draw(); s.restore();
  // the wall's own luminance, for the veining that first grows out of the quartz
  const lum = document.createElement('canvas'); lum.width = T * 2; lum.height = T * 2;
  const l = lum.getContext('2d');
  l.filter = 'grayscale(1) contrast(1.15)';
  l.drawImage(sheet, 0, 0);
  // the average colour of the slab, for the tone the founder's room stands on
  const d = s.getImageData(0, 0, T, T).data;
  let r = 0, gg = 0, bb = 0, n = 0;
  for (let i = 0; i < d.length; i += 64) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
  return { sheet: sheet.toDataURL('image/jpeg', 0.84), lum: lum.toDataURL('image/jpeg', 0.8), avg: [Math.round(r / n), Math.round(gg / n), Math.round(bb / n)] };
}, { src });
writeFileSync(`${OUT}/marble.jpg`, Buffer.from(out.sheet.split(',')[1], 'base64'));
writeFileSync(`${OUT}/marble-luma.jpg`, Buffer.from(out.lum.split(',')[1], 'base64'));
console.log('marble.jpg 1536² (book-matched 2 × 2) · marble-luma.jpg · average slab colour rgb', out.avg, '#' + out.avg.map((v) => v.toString(16).padStart(2, '0')).join(''));
await b.close();
