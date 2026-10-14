// Специалисты: each specialist's own photograph (desktop and phone alike) and
// no experience line anywhere — read from the page, plus a frame per sitter.
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:5173/';
const OUT = 'spikes/portraits/__captures__/specialists';
const EXPECT = { 'Елена Коргачева': 'sp4', 'Анастасия Воронина': 'sp3', 'Анастасия Корягина': 'sp1' };
const b = await chromium.launch({ channel: 'chrome' });
let fails = 0;
for (const [tag, opts] of [['desktop-1440', { viewport: { width: 1440, height: 900 } }], ['phone-390', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const page = await (await b.newContext({ ...opts, reducedMotion: 'reduce' })).newPage();
  await page.route('**/*sanity.io/**', (r) => r.abort('failed'));
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const names = [...document.querySelectorAll('#specialists .sitter__name-inner')].map((e) => e.textContent.trim());
    const plates = [...document.querySelectorAll('#specialists .frame .plate img')].map((i) => (i.getAttribute('src') ?? '').split('/').pop());
    const text = document.querySelector('#specialists').innerText;
    return { names, plates, experience: /Стаж|лет опыта|\bлет\b/i.test(text) ? text.match(/.{0,20}(Стаж|лет).{0,20}/i)?.[0] : null };
  });
  console.log(`\n== ${tag}`);
  r.names.forEach((n, i) => {
    const file = r.plates[i] ?? '—';
    const want = EXPECT[n];
    const ok = !want || file.startsWith(want);
    if (!ok) fails++;
    console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${n.padEnd(20)} → ${file}${want ? ` (expected ${want})` : ''}`);
  });
  console.log(`   ${r.experience ? 'FAIL experience text: ' + r.experience : 'ok   no experience line in the section'}`);
  if (r.experience) fails++;
  // a frame per sitter: walk the pin, shoot whenever a new name is the one on screen
  const top = await page.evaluate(() => Math.round(document.querySelector('#specialists').getBoundingClientRect().top + scrollY));
  const H = await page.evaluate(() => innerHeight);
  const seen = new Set();
  for (let y = top; y < top + 6 * H && seen.size < r.names.length; y += Math.round(H / 4)) {
    await page.evaluate((y) => { window.__lenis?.scrollTo(y, { immediate: true, force: true }); scrollTo(0, y); }, y);
    await page.waitForTimeout(500);
    const who = await page.evaluate(() => { const els = [...document.querySelectorAll('#specialists .sitter')].filter((e) => +getComputedStyle(e).opacity > 0.9 && e.getBoundingClientRect().height > 0); return els[0]?.querySelector('.sitter__name-inner')?.textContent.trim() ?? null; });
    if (who && !seen.has(who)) { seen.add(who); await page.screenshot({ path: `${OUT}/${tag}-${seen.size}-${who.split(' ')[1]}.png` }); }
  }
  await page.close();
}
await b.close();
console.log(fails ? `\n${fails} FAILED` : '\nall specialists checks passed');
process.exitCode = fails ? 1 : 0;
