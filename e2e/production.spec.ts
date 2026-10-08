import { expect, test, type Page } from '@playwright/test';

/**
 * The production root — the approved full page (`spikes/full/main.tsx`
 * mounted by `index.html`): the rooms in order, deep links, the price layer,
 * the outbound links, no debug UI, and one MOCKED lead end to end.
 *
 * Runs against the dev server by default; `ERA_BASE=http://localhost:4173`
 * points it at `npm run preview` (the production build).
 */
const BASE = process.env['ERA_BASE'] ?? 'http://localhost:5173';
/** the isolated stack from `e2e/lead-stack.mjs` — its /api/lead talks to a mock Telegram */
const LEAD_SITE = 'http://127.0.0.1:5174';
const MOCK_TELEGRAM = 'http://127.0.0.1:5191';

/** the rooms of the vertical page, in order — Стоимость is a layer from the navigation, not a room */
const ROOMS = [
  'hero',
  'manifesto',
  'services',
  'cases',
  'specialists',
  'founder',
  'reviews',
  'contact',
  'inquiry',
];

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  return errors;
};

test.describe('production root', () => {
  test('mounts the full page: every room in order, production head, no console errors', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const broken: string[] = [];
    page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().includes('sanity')) broken.push(`${r.status()} ${r.url()}`);
    });
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(2_000);

    // document order (the manifesto's id sits on its room's inner layer)
    const order = await page.$$eval(ROOMS.map((id) => `#${id}`).join(', '), (els) =>
      els.map((el) => el.id),
    );
    expect(order).toEqual(ROOMS);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/^ЭРА cosmetology/u);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
    // the live, Telegram-enabled form — not the wireframe's
    await expect(page.locator('#inquiry form.talk__form')).toHaveCount(1);
    await expect(page.locator('#inquiry .inquiry__form')).toHaveCount(0);

    expect(broken, 'no failed requests').toEqual([]);
    expect(errors, 'no console errors').toEqual([]);
  });

  test('shows no debug UI — even when the URL asks for it', async ({ page }) => {
    // debug tooling is on in the dev server by design (src/lib/env.ts → debugTools)
    test.skip(!process.env['ERA_BASE'], 'production build only: ERA_BASE=http://localhost:4173');
    await page.goto(`${BASE}/?hud=1&diag=1&perfDebug=1&transitionDebug=1&k=2&c=3`, {
      waitUntil: 'load',
    });
    await page.waitForTimeout(2_000);
    for (const sel of ['.diag', '.hud', '.perf-hud', '.gw-hud']) {
      await expect(page.locator(sel), sel).toHaveCount(0);
    }
    const probes = await page.evaluate(() =>
      [
        '__ST',
        '__flow',
        '__diag',
        '__ribbon',
        '__media',
        '__gl',
        '__sheets',
        '__three',
        '__transition',
      ].filter((k) => k in window),
    );
    expect(probes).toEqual([]);
  });

  for (const room of ['inquiry', 'contact', 'services']) {
    test(`deep link /#${room} lands on the room`, async ({ page }) => {
      await page.goto(`${BASE}/#${room}`, { waitUntil: 'load' });
      await expect
        .poll(
          () =>
            page.evaluate((id) => {
              const r = document.getElementById(id)!.getBoundingClientRect();
              return r.top < innerHeight && r.bottom > 0;
            }, room),
          { timeout: 15_000 },
        )
        .toBe(true);
    });
  }

  test('/#pricing opens the price layer, and it closes', async ({ page }) => {
    await page.goto(`${BASE}/#pricing`, { waitUntil: 'load' });
    const layer = page.locator('[role="dialog"][aria-label="Стоимость"]');
    await expect(layer).toBeVisible({ timeout: 15_000 });
    await page.locator('.pricelayer__back').click();
    await expect(layer).toBeHidden();
  });

  test('outbound links: phone, Telegram, WhatsApp, 2GIS card and route', async ({ page }) => {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    const hrefs = await page.$$eval('#contact a[href], #inquiry a[href]', (as) =>
      as.map((a) => a.getAttribute('href')),
    );
    expect(hrefs).toContain('tel:+79147778500');
    expect(hrefs).toContain('https://t.me/eracosmetology');
    expect(hrefs).toContain('https://wa.me/79147778500');
    expect(hrefs.some((h) => h?.startsWith('https://2gis.ru/khabarovsk/firm/'))).toBe(true);
    expect(hrefs.some((h) => h?.startsWith('https://2gis.ru/khabarovsk/directions/points/'))).toBe(
      true,
    );
    // every external link opens safely
    const unsafe = await page.$$eval('a[target="_blank"]', (as) =>
      as
        .filter((a) => !(a.getAttribute('rel') ?? '').includes('noopener'))
        .map((a) => a.getAttribute('href')),
    );
    expect(unsafe).toEqual([]);
  });
});

test.describe('the lead, mocked end to end', () => {
  test('a valid lead reaches the MOCK Telegram in the agreed format; the form says thank you', async ({
    page,
  }) => {
    // one project only: the mock is shared, and one lead keeps the stack under its rate limit
    test.skip(test.info().project.name !== 'desktop-1440', 'desktop-1440 only');
    await fetch(`${MOCK_TELEGRAM}/__reset`, { method: 'POST' });
    await page.goto(`${LEAD_SITE}/#inquiry`, { waitUntil: 'load' });
    const form = page.locator('#inquiry form');
    await form.scrollIntoViewIfNeeded();

    // required fields first: nothing is sent
    await page.locator('#inquiry .talk__send').click();
    await expect(page.locator('#inquiry [role="alert"]')).toHaveCount(3);

    await page.locator('#inquiry input[name="name"]').fill('Автотест');
    await page.locator('#inquiry input[name="phone"]').fill('+7 900 000-00-00');
    await page.locator('#inquiry textarea[name="message"]').fill('Проверка формы (mock)');
    await page.locator('#inquiry input[name="consent"]').check({ force: true });
    await page.waitForTimeout(2_100); // the server's fill-time trap
    await page.locator('#inquiry .talk__send').click();
    await expect(page.locator('#inquiry .talk__success')).toBeVisible({ timeout: 15_000 });

    const got = (await (await fetch(`${MOCK_TELEGRAM}/__got`)).json()) as {
      path: string;
      body: { text: string };
    }[];
    expect(got).toHaveLength(1);
    expect(got[0]!.path).toBe('/bot000000:MOCK-ONLY/sendMessage');
    const text = got[0]!.body.text;
    expect(
      text.startsWith(
        '<b>НОВАЯ ЗАЯВКА — ERA COSMETOLOGY</b>\n\nИмя: Автотест\n\nКонтакт: +7 900 000-00-00',
      ),
    ).toBe(true);
    expect(text).toContain('Сообщение: Проверка формы (mock)');
    expect(text).toContain('Источник: сайт ERA');
    expect(text).toMatch(/Дата и время: .+\(Хабаровск\)$/u);
  });
});
