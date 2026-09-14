// Stand-in portraits for Spike D from the ONE test portrait.
//
// HONESTY: the clinic's specialists are real photography (CLAUDE.md Hard rule 3).
// Four crops and grades of one generated test face stand in for four people so
// the staging can be judged; every one is labelled «[Плейсхолдер — заменить на
// реальную съёмку]» in the spike. `eye` is where the subject's nearer eye sits
// in the crop (fractions), used for the focal line.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'spikes/portraits/assets';
mkdirSync(OUT, { recursive: true });
const src = 'data:image/png;base64,' + readFileSync('spikes/hero/assets/portrait-test.png').toString('base64');

// 4 : 5 crops in the 1536 × 1024 source
const CROPS = [
  { id: 'p1', x: 110, y: 0, w: 819, h: 1024, flip: false, grade: 'none' },
  { id: 'p2', x: 60, y: 0, w: 819, h: 1024, flip: true, grade: 'saturate(0.88) contrast(1.03) hue-rotate(4deg)' },
  { id: 'p3', x: 250, y: 40, w: 640, h: 800, flip: false, grade: 'brightness(0.97) saturate(0.92) hue-rotate(8deg)' },
  { id: 'p4', x: 300, y: 0, w: 800, h: 1000, flip: true, grade: 'brightness(1.02) saturate(0.95)' },
];
const TIERS = [
  { suffix: '', w: 1100 },
  { suffix: '@phone', w: 640 },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const out = await page.evaluate(async ({ src, CROPS, TIERS }) => {
  const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
  const files = [];
  for (const c of CROPS) {
    for (const t of TIERS) {
      const w = t.w, h = Math.round((t.w * 5) / 4);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const ctx = cv.getContext('2d');
      ctx.filter = c.grade;
      if (c.flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, w, h);
      files.push({ name: `${c.id}${t.suffix}.jpg`, data: cv.toDataURL('image/jpeg', 0.86), w, h });
    }
  }
  return files;
}, { src, CROPS, TIERS });
for (const f of out) {
  writeFileSync(`${OUT}/${f.name}`, Buffer.from(f.data.split(',')[1], 'base64'));
  console.log(f.name, `${f.w}×${f.h}`, Math.round(Buffer.from(f.data.split(',')[1], 'base64').length / 1024) + ' KB');
}
await browser.close();
