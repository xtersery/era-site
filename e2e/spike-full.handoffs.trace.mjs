// Compositor-side view of the page's handoffs, which rAF timing cannot see:
// a Chrome trace over each range (real wheel, both ways), then per range —
// frames presented / dropped / partial (PipelineReporter), and main-thread
// paint, prepaint, layerize, style, layout plus raster + GPU task time.
//   BASE=http://localhost:5173/spikes/full/ node e2e/spike-full.handoffs.trace.mjs
import { chromium } from '@playwright/test';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/full/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(base, { waitUntil: 'load', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(3500);
const cdp = await ctx.newCDPSession(page);
const pos = await page.evaluate(() => {
  const q = (id) => { const e = document.getElementById(id); const sp = e.closest('.pin-spacer') ?? e; const r = sp.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY) }; };
  return { specialists: q('specialists'), founder: q('founder'), reviews: q('reviews'), contact: q('contact'), inquiry: q('inquiry'), vh: innerHeight, max: document.documentElement.scrollHeight - innerHeight };
});
const vh = pos.vh;
const wheelTo = async (y) => {
  for (let g = 0; g < 2000; g++) {
    const cur = await page.evaluate(() => scrollY);
    if (Math.abs(cur - y) < 120) break;
    await page.mouse.wheel(0, Math.sign(y - cur) * 100);
    await page.waitForTimeout(33);
  }
  await page.waitForTimeout(800);
};
const traceRange = async (label, from, to) => {
  await page.evaluate((y) => scrollTo(0, y), from);
  await page.waitForTimeout(1800);
  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,cc,viz,gpu,benchmark,blink', transferMode: 'ReportEvents' });
  await wheelTo(to);
  await wheelTo(from);
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.end');
  await done;
  cdp.removeAllListeners('Tracing.dataCollected');
  const dur = (names) => events.filter((e) => names.includes(e.name) && e.ph === 'X').reduce((a, e) => a + (e.dur || 0), 0) / 1000;
  const states = {};
  for (const e of events) {
    if (e.name !== 'PipelineReporter' || e.ph !== 'b') continue;
    const st = e.args?.chrome_frame_reporter?.state ?? 'unknown';
    states[st] = (states[st] || 0) + 1;
  }
  const total = Object.values(states).reduce((a, b) => a + b, 0);
  const dropped = (states['STATE_DROPPED'] || 0) + (states['STATE_PRESENTED_PARTIAL'] || 0);
  console.log(`\n## ${label}: frames ${total} · presented ${states['STATE_PRESENTED_ALL'] || 0} · partial ${states['STATE_PRESENTED_PARTIAL'] || 0} · dropped ${states['STATE_DROPPED'] || 0} (${total ? ((100 * dropped) / total).toFixed(1) : 0} %)`);
  console.log(`   main: style ${dur(['UpdateStyle', 'RecalculateStyles']).toFixed(0)} ms · layout ${dur(['Layout']).toFixed(0)} · prepaint ${dur(['PrePaint']).toFixed(0)} · paint ${dur(['Paint']).toFixed(0)} · layerize ${dur(['Layerize', 'UpdateLayer']).toFixed(0)} · commit ${dur(['Commit']).toFixed(0)}`);
  console.log(`   raster ${dur(['RasterTask', 'TileManager::FlushAndIssueSignals', 'RasterizerTaskImpl::RunOnWorkerThread']).toFixed(0)} ms · gpu ${dur(['GPUTask', 'CommandBufferStub::OnAsyncFlush', 'GpuChannel::ExecuteDeferredRequest']).toFixed(0)} ms · decode ${dur(['ImageDecodeTask', 'Decode Image']).toFixed(0)} ms`);
};

await page.mouse.move(720, 450);
await traceRange('Основатель ↔ Отзывы', pos.founder.bottom - vh * 1.2, pos.reviews.top + vh * 0.6);
await traceRange('Отзывы ↔ Адрес', pos.contact.top - vh * 1.2, pos.contact.top + vh * 0.5);
await traceRange('Адрес ↔ Заявка', pos.inquiry.top - vh * 1.2, Math.min(pos.max, pos.inquiry.top + vh * 0.2));
await browser.close();
