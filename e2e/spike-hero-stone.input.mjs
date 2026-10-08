/**
 * The gateway by touch and by keyboard: a swipe on the phone plays the passage
 * (a short film), ArrowDown plays it on the desktop, and input during the
 * playback is swallowed. Dev server up:  node e2e/spike-hero-stone.input.mjs
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome' });
const state = (page) => page.evaluate(() => ({ status: window.__transition?.status, p: Number(window.__transition?.progress.toFixed(3)), y: scrollY }));

// --- touch, phone
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const cdp = await ctx.newCDPSession(page);
  const swipe = async (from, to, steps = 8) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 200, y: from }] });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 200, y: from + ((to - from) * i) / steps }] });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  console.log('phone rest', await state(page));
  await swipe(600, 380);
  await page.waitForTimeout(300);
  console.log('phone after one swipe', await state(page));
  await swipe(600, 380); // a second swipe during the playback changes nothing
  await page.waitForTimeout(1500);
  console.log('phone mid', await state(page));
  await page.waitForTimeout(3500);
  console.log('phone landed', await state(page));
  await swipe(300, 600); // and one swipe up plays it back
  await page.waitForTimeout(600);
  console.log('phone back playing', await state(page));
  await page.waitForTimeout(4500);
  console.log('phone home', await state(page));
  await ctx.close();
}

// --- keyboard, desktop
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5173/spikes/hero-stone/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(300);
  console.log('desktop after ArrowDown', await state(page));
  await page.keyboard.press('PageDown');
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(7200);
  console.log('desktop landed', await state(page));
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(6500);
  console.log('desktop home', await state(page));
  await ctx.close();
}
await browser.close();
