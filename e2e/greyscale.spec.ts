import { expect, test, type Page } from '@playwright/test';

const SECTION_IDS = [
  'hero',
  'manifesto',
  'services',
  'pricing',
  'cases',
  'specialists',
  'founder',
  'reviews',
  'contact',
  'inquiry',
] as const;

const shots = (page: Page, name: string) =>
  page.screenshot({
    path: `e2e/__screenshots__/${test.info().project.name}/${name}.png`,
    fullPage: false,
  });

test.describe('greyscale prototype', () => {
  test('loads without console errors and renders all ten rooms in order', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Fonts settled before screenshots.
    await page.evaluate(() => document.fonts.ready);

    // ScrollTrigger wraps the pinned room in a `.pin-spacer`, so query by id, not by direct child.
    const ids = await page.$$eval('main section[id]', (els) => els.map((el) => el.id));
    expect(ids).toEqual([...SECTION_IDS]);

    // Every room is a labelled landmark.
    for (const id of SECTION_IDS) {
      const section = page.locator(`section#${id}`);
      const labelledBy = await section.getAttribute('aria-labelledby');
      expect(labelledBy, `${id} aria-labelledby`).toBe(`${id}-heading`);
      await expect(page.locator(`#${id}-heading`), `${id} heading exists`).toHaveCount(1);
    }

    // One <h1>, in the hero.
    await expect(page.locator('h1')).toHaveCount(1);

    // Primary CTA in the first viewport.
    const heroCta = page.locator('#hero a.btn').first();
    await expect(heroCta).toBeVisible();
    const box = await heroCta.boundingBox();
    const viewport = page.viewportSize();
    expect(
      box && viewport && box.y + box.height <= viewport.height,
      'hero CTA above the fold',
    ).toBe(true);

    // Persistent header CTA.
    await expect(page.locator('header a.btn')).toHaveText('Записаться');

    await shots(page, '00-hero');
    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('all visible text is Russian; no Latin words except the brand/proper nouns', async ({
    page,
  }) => {
    await page.goto('/');
    const text = await page.evaluate(() => document.body.innerText);
    // Allowed Latin tokens.
    const allow = new Set([
      'cosmetology',
      'Telegram',
      'WhatsApp',
      'Anti-age',
      'anti-age',
      'HERO-COPY',
      'WebGL',
    ]);
    const latinWords = [...new Set(text.match(/\b[A-Za-z][A-Za-z-]{2,}\b/g) ?? [])].filter(
      (w) => !allow.has(w),
    );
    expect(latinWords, `unexpected Latin words: ${latinWords.join(', ')}`).toEqual([]);
  });

  test('no male references in placeholder copy', async ({ page }) => {
    await page.goto('/');
    const text = (await page.evaluate(() => document.body.innerText)).toLowerCase();
    for (const word of ['мужчин', 'мужск', 'пациента-мужчины', 'клиент ']) {
      expect(text.includes(word), `found "${word}"`).toBe(false);
    }
  });

  test('placeholders are flagged and pending copy renders its bracket verbatim', async ({
    page,
  }) => {
    await page.goto('/');
    const count = await page.locator('[data-placeholder]').count();
    expect(count).toBeGreaterThan(0);
    await expect(page.locator('#hero-heading')).toHaveText(
      '[ФИНАЛЬНЫЙ HERO-COPY БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]',
    );
    await expect(page.locator('#manifesto-heading')).toHaveText(
      '[ФИНАЛЬНЫЙ ТЕКСТ МАНИФЕСТА БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]',
    );
    await expect(page.locator('#cases-heading')).toHaveText(
      '[ФИНАЛЬНЫЙ ЗАГОЛОВОК КЕЙСОВ БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]',
    );
    // Every case has an honesty label.
    const cases = await page.locator('article.case').count();
    await expect(page.locator('.case__status')).toHaveCount(cases);
  });

  test('prices are static — no count-up', async ({ page }) => {
    await page.goto('/#pricing');
    const first = page.locator('td.pricing__cell--price').first();
    const a = await first.textContent();
    await page.waitForTimeout(400);
    const b = await first.textContent();
    expect(a).toBe(b);
    expect(a).toMatch(/₽$/);
    await shots(page, '03-pricing');
  });

  test('CTA routing pre-fills the form', async ({ page }) => {
    await page.goto('/');
    await page.locator('#services .btn').first().click();
    await expect(page.locator('#inquiry')).toBeInViewport({ timeout: 5000 });
    const procedure = page.locator('#inquiry select[name="procedure"]');
    await expect(procedure).toHaveValue('injection');
    await shots(page, '09-inquiry-prefilled');
  });

  test('keyboard: services tabs, cases toggle, reviews list', async ({ page }) => {
    await page.goto('/#services');
    const width = page.viewportSize()?.width ?? 0;
    // Services tabs exist from `lg` (1024); below that the accordion is keyboard-native.
    if (width >= 1024) {
      const tab = page.getByRole('tab', { name: /Инъекционная/ }).first();
      await tab.focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.getByRole('tab', { selected: true }).first()).toContainText('Anti-age');
    }
    const toggle = page.getByRole('button', { name: 'Показать до / после' }).first();
    if (await toggle.count()) {
      await toggle.focus();
      await page.keyboard.press('Enter');
      await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    }
    if (width >= 768) {
      const reviewTab = page.locator('#reviews [role="tab"]').first();
      await reviewTab.focus();
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('#reviews [role="tab"][aria-selected="true"]')).toContainText('В.');
    }
  });

  test('form validation is quiet and the success state is Russian', async ({ page }) => {
    await page.goto('/#inquiry');
    await page.getByRole('button', { name: 'Отправить заявку' }).click();
    await expect(page.locator('#inquiry [role="alert"]').first()).toBeVisible();
    await page.getByLabel('Имя', { exact: true }).fill('Тест');
    await page.getByLabel('Телефон или мессенджер', { exact: true }).fill('+7 900 000 00 00');
    await page.locator('#inquiry input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Отправить заявку' }).click();
    await expect(page.locator('#inquiry [role="status"]')).toContainText('Заявка получена.');
  });

  test('room-by-room screenshots', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    for (const id of SECTION_IDS) {
      await page.evaluate((sid) => {
        document.getElementById(sid)?.scrollIntoView({ block: 'start', behavior: 'instant' });
      }, id);
      await page.waitForTimeout(350);
      await shots(page, `room-${id}`);
    }
    await page.screenshot({
      path: `e2e/__screenshots__/${test.info().project.name}/full-page.png`,
      fullPage: true,
    });
  });

  test('scroller matches the tier', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(200);
    const kind = await page.evaluate(() => document.documentElement.dataset.scroll);
    const reduced = await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    expect(kind).toBe(reduced ? 'native' : 'lenis');
    const tier = await page.evaluate(() => document.documentElement.dataset.tier);
    expect(reduced ? tier === 'reduced' : tier === 'high' || tier === 'mid').toBe(true);
  });

  test('stage skeleton: canvas mounts lazily for live tiers, draws nothing, no three in initial JS', async ({
    page,
  }) => {
    const initialScripts: string[] = [];
    page.on('request', (req) => {
      if (req.resourceType() === 'script') initialScripts.push(req.url());
    });
    await page.goto('/');
    await page.waitForLoadState('load');
    // Scripts requested before load must not include three.
    // Dependency URLs only (dev: /node_modules/.vite/deps/three.js, @react-three_fiber.js).
    expect(
      initialScripts.some((u) => /deps\/(three|@react-three)|\/three-[\w-]+\.js|\/r3f-/.test(u)),
    ).toBe(false);
    const reduced = await page.evaluate(
      () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    );
    if (reduced) {
      await page.waitForTimeout(2500);
      await expect(page.locator('[data-stage-canvas]')).toHaveCount(0);
      return;
    }
    await expect(page.locator('[data-stage-canvas] canvas')).toHaveCount(1, { timeout: 6000 });
    const chapter = await page.evaluate(() => document.documentElement.dataset.chapter);
    expect(chapter).toBe('hero');
    // Anchors exist for the hero set.
    await expect(page.locator('[data-stage-anchor="hero-wordmark"]')).toHaveCount(1);
    await expect(page.locator('[data-stage-anchor="hero-lens"]')).toHaveCount(1);
  });
});
