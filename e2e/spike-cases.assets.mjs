// Builds the before/after stand-in pairs for Spike C from the ONE test portrait.
//
// HONESTY: these are not clinical results and not simulated treatment outcomes.
// Each pair is the SAME pixels in the same frame; «до» differs from «после» by a
// colour grade only (duller, cooler, lower local contrast, slightly softer) —
// no geometry is touched — not one pixel moves — so the reveal device can be
// proved to distort nothing. «до» is cooler and duller; «после» is the plate as shot.
// Every case is labelled «Визуализация» in the UI. Real consented photography
// replaces them at launch.
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const OUT = 'spikes/cases/assets';
mkdirSync(OUT, { recursive: true });
const src = 'data:image/png;base64,' + readFileSync('spikes/hero/assets/portrait-test.png').toString('base64');

// crop regions in the 1536 × 1024 source, one per placeholder case
const CROPS = [
  { id: 'case-1', x: 150, y: 0, w: 819, h: 1024 }, // face, three quarters
  { id: 'case-2', x: 260, y: 120, w: 560, h: 700 }, // middle third
  { id: 'case-3', x: 330, y: 110, w: 480, h: 600 }, // brow and eyes
  { id: 'case-4', x: 390, y: 230, w: 400, h: 500 }, // cheek and temple, macro
  // four more stand-ins so the archive can be judged at its intended length;
  // `flip` mirrors the crop — a framing device, not a result
  { id: 'case-5', x: 200, y: 380, w: 560, h: 700 }, // neck and jawline
  { id: 'case-6', x: 90, y: 30, w: 700, h: 875, flip: true }, // the oval of the face, mirrored
  { id: 'case-7', x: 440, y: 390, w: 380, h: 475 }, // lips and chin
  { id: 'case-8', x: 360, y: 140, w: 440, h: 550, flip: true }, // temple and eye, mirrored
];
const TIERS = [
  { suffix: '', scale: 1 },
  { suffix: '@phone', scale: 0.62 },
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const out = await page.evaluate(
  async ({ src, CROPS, TIERS }) => {
    const img = await new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = src; });
    const files = [];
    for (const c of CROPS) {
      for (const t of TIERS) {
        const w = Math.round(c.w * t.scale);
        const h = Math.round(c.h * t.scale);
        for (const state of ['after', 'before']) {
          const cv = document.createElement('canvas');
          cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d');
          // «после» = the plate as shot; «до» = the same pixels, graded down.
          ctx.filter = state === 'before'
            ? 'saturate(0.7) contrast(0.94) brightness(0.95) sepia(0.04) hue-rotate(-10deg)'
            : 'none';
          if (c.flip) { ctx.translate(w, 0); ctx.scale(-1, 1); }
          ctx.drawImage(img, c.x, c.y, c.w, c.h, 0, 0, w, h);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          files.push({ name: `${c.id}-${state}${t.suffix}.jpg`, data: cv.toDataURL('image/jpeg', 0.86), w, h });
        }
      }
    }
    return files;
  },
  { src, CROPS, TIERS },
);
for (const f of out) {
  writeFileSync(`${OUT}/${f.name}`, Buffer.from(f.data.split(',')[1], 'base64'));
  console.log(f.name, `${f.w}×${f.h}`, Math.round(Buffer.from(f.data.split(',')[1], 'base64').length / 1024) + ' KB');
}
await browser.close();
