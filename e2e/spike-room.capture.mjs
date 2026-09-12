import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
const OUT = 'spikes/room/__captures__';
mkdirSync(OUT, { recursive: true });
const base = 'http://localhost:5173/spikes/room/';
const browser = await chromium.launch({ channel: 'chrome' });
const settle = async (page) => { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1400); };
const strip = async (page, buffers, cols, file, labels) => {
  const data = await page.evaluate(async ({ srcs, cols, labels }) => {
    const imgs = await Promise.all(srcs.map((s) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.src = s; })));
    const w = imgs[0].naturalWidth, h = imgs[0].naturalHeight, gap = 8, lab = 28;
    const rows = Math.ceil(imgs.length / cols);
    const c = document.createElement('canvas'); c.width = cols * (w + gap) + gap; c.height = rows * (h + lab + gap) + gap;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#08140f'; ctx.fillRect(0, 0, c.width, c.height);
    imgs.forEach((img, i) => { const x = gap + (i % cols) * (w + gap), y = gap + Math.floor(i / cols) * (h + lab + gap); ctx.drawImage(img, x, y); ctx.fillStyle = '#98a39c'; ctx.font = '13px JetBrains Mono, monospace'; ctx.fillText(labels[i] ?? '', x, y + h + 19); });
    return c.toDataURL('image/png');
  }, { srcs: buffers.map((b) => 'data:image/png;base64,' + b.toString('base64')), cols, labels });
  writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
};
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  const TS = [0, 0.22, 0.5, 0.78, 1];
  const NAMES = ['1-frontal-01', '2-early-rotation', '3-mid-turn', '4-late-rotation', '5-frontal-02'];
  const frames = [];
  for (const [i, t] of TS.entries()) { await page.goto(`${base}?t=${t}&hud=0`); await settle(page); await page.screenshot({ path: `${OUT}/${NAMES[i]}.png` }); frames.push(await page.screenshot()); }
  await strip(page, frames, 5, `${OUT}/desktop-sequence.png`, ['1 · frontal · service 01', '2 · early rotation · t 0.22', '3 · mid-turn · t 0.50', '4 · late rotation · t 0.78', '5 · frontal · service 02']);
  // navigation close-ups: the wall's orientation strip + label (frontal) and the corner with both strips (mid)
  await page.goto(`${base}?t=0&hud=0`); await settle(page);
  await page.screenshot({ path: `${OUT}/7-nav-frontal.png`, clip: { x: 0, y: 40, width: 1440, height: 300 } });
  await page.goto(`${base}?t=0.35&hud=0`); await settle(page);
  await page.screenshot({ path: `${OUT}/7-nav-turning.png`, clip: { x: 0, y: 0, width: 1440, height: 340 } });
  // cutaway: the same DOM room seen from outside and above — near walls are back-face culled, so the interior is exposed
  await page.goto(`${base}?t=0&hud=0`); await settle(page);
  await page.evaluate(() => {
    const r = document.querySelector('.room360'); r.style.setProperty('--dolly', '5600px'); r.style.setProperty('--tilt', '-42deg'); r.style.setProperty('--persp', '2400px'); r.style.background = '#08140f';
    // floor plane with the viewer at the centre and the view axis towards the frontal wall — diagram furniture, not product UI
    const scene = document.querySelector('.room360__scene');
    const floor = document.createElement('div');
    floor.style.cssText = 'position:absolute;left:50%;top:50%;width:3200px;height:3200px;margin:-1600px 0 0 -1600px;transform:translateY(59svh) rotateX(90deg);transform-style:preserve-3d;pointer-events:none;';
    floor.innerHTML = '<div style="position:absolute;left:50%;top:50%;width:2690px;height:2690px;margin:-1345px 0 0 -1345px;border:2px dashed rgba(207,175,114,.55);border-radius:50%"></div>'
      + '<div style="position:absolute;left:50%;top:50%;width:6px;height:1345px;margin:-1345px 0 0 -3px;background:linear-gradient(to top,#cfaf72,rgba(207,175,114,0))"></div>'
      + '<div style="position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;border:6px solid #cfaf72;border-radius:50%;background:#08140f"></div>'
      + '<div style="position:absolute;left:50%;top:50%;margin:80px 0 0 -200px;width:400px;text-align:center;font:600 44px Inter,sans-serif;color:#cfaf72;letter-spacing:.02em">посетитель · камера</div>';
    scene.appendChild(floor);
  });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/6b-pulled-back.png` });
  await ctx.close();
}
{
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await m.newPage();
  const frames = [];
  for (const [i, t] of [0, 0.5, 1].entries()) { await page.goto(`${base}?t=${t}&hud=0`); await settle(page); await page.screenshot({ path: `${OUT}/${8 + i}-mobile-t${t}.png` }); frames.push(await page.screenshot()); }
  await strip(page, frames, 3, `${OUT}/mobile-sequence.png`, ['8 · mobile · service 01', '9 · mobile · transition', '10 · mobile · service 02']);
  await m.close();
}
await browser.close(); console.log('done');
