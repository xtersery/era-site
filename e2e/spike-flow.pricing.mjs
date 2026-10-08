// Стоимость — the real price list, 2026: is every line of the client's source
// rendered, in order, with its amount unchanged? Opens the layer from the
// menu (desktop and phone), reads every row and note out of the DOM and
// compares them line by line against the source below (typography
// normalised: NBSP / narrow NBSP → space, a range's dash → «–»). Also: the
// layer is not in the document flow, the index jumps to a category, the phone
// keeps each price on its service's line, no horizontal overflow. Writes
// stills to spikes/flow/__captures__/. Dev server must be up.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const base = process.env['BASE'] ?? 'http://localhost:5173/spikes/flow/';
const OUT = 'spikes/flow/__captures__';
mkdirSync(OUT, { recursive: true });

// The client's list, bullet lines verbatim. Two notes the source gives as
// plain lines («Note: …») are marked `+` and sit where the source puts them.
const SOURCE = `
• Прием врача-косметолога первичный (консультация, осмотр) — 2 000 ₽
• Прием врача дерматокосметолога первичный (консультация по акне) — 4 500 ₽
• Прием врача-косметолога (дерматолога) повторный — 1 500 ₽
• Комбинированное очищение кожи лица и шеи + пилинг — 4 900 ₽
• Комбинированное очищение кожи лица и шеи + пилинг нового поколения — 8 500 ₽
• Комбинированное очищение кожи лица и шеи + профессиональный уход за лицом — 8 500 ₽
• Комбинированная чистка лица, шеи + PRP-терапия (2 пробирки) — 8 500 ₽
• Комбинированное очищение кожи лица и шеи + профессиональный уход за лицом на премиальной космецевтике RHEA — 12 000 ₽
• Атравматическая чистка лица и шеи + пилинг — 4 000 ₽
• Комбинированная чистка спины + пилинг — 6 500 ₽
• Комбинированная чистка лица, шеи + спины — 10 000 ₽
• Дерматологический пилинг (миндальный, молочный, азелаиновый, гликолевый, салициловый) — 4 500 ₽
• Дерматологический пилинг BioRePeel — 6 000 ₽
• Пилинг PRP-T33 — 6 500 ₽
• Peach Peel — 5 500 ₽
• Pink Peel — 4 500 ₽
• Пилинг TCA — 7 000 ₽
• Жёлтый пилинг — 7 000 ₽
• Омолаживающий уход «Мона Лиза» — 8 500 ₽
• Осветляющий уход «Венера Милосская» — 8 500 ₽
• Очищающий уход «Даная» — 8 500 ₽
• SPA-программа «Итальянская роскошь» — 8 500 ₽
• RADIESS 1.5 — 28 000 ₽
• RADIESS 3.0 — 45 000 ₽
• Gana V (лицо, шея) — 43 000 ₽
• Gana X (тело) — 55 000 ₽
• Novacutan PLA (лицо) — 39 900 ₽
• PLLA CUBE — 19 900 ₽
• Rejubella — 25 000 ₽
• Коллост Micro — 20 500 ₽
• Коллост 7% (1 мл) — 13 000 ₽
• Субцизия рубцов — +5 000 ₽
• Exoxe — 18 000 ₽
• Диспорт — 150 ₽ за ед.
• Миотокс — 350 ₽ за ед.
• Релатокс — 380 ₽ за ед.
• Ксеомин — 380 ₽ за ед.
• Миотокс, 100 ед. — 26 000 ₽
• Релатокс, 100 ед. — 28 000 ₽
• Ксеомин, 100 ед. — 28 000 ₽
• Диспорт, 300 ед. — 26 000 ₽
• Релатокс, 100 ед. — 28 000 ₽
• Profhilo — 21 500 ₽
• Mesosculpt C71 — 18 000 ₽
• MesoWharton P199 — 18 000 ₽
• MesoXanthin F199 — 18 000 ₽
• MesoEye C71 — 18 000 ₽
• Bellarti Nucleo — 18 000 ₽
• Bellarti Vita — 18 000 ₽
• Novacutan S Bio — 18 000 ₽
• Novacutan Y Bio — 18 000 ₽
• Novacutan Prima / Master / Bright — 19 500 ₽
• Novacutan Bio Pro — 19 000 ₽
• Novacutan Eye — 20 000 ₽
• Novacutan Gentle — 18 000 ₽
• Revi SILK 1.0 — 15 000 ₽
• Revi SILK 2.0 — 17 000 ₽
• Revi STRONG 1.0 — 16 000 ₽
• Revi STRONG 2.0 — 19 000 ₽
• Revi Eye — 14 500 ₽
• Repart 4 Aqua Balance — 10 000 ₽
• Repart 5 Active — 11 500 ₽
• Repart 6 (Eyes / Lips) — 9 500 ₽
• NCTF 135+ — 12 500 ₽
• INFINI — 7 000 ₽
• INFINI Hair — 5 000 ₽
• Лицо (2 пробирки) — 5 000 ₽
• Лицо + шея (3 пробирки) — 5 500 ₽
• Волосистая часть головы (1 пробирка) — 4 000 ₽
• PRP-терапия — обогащенная плазма (2 пробирки) — 7 000 ₽
• Revi (любой) + Revi Eye — скидка 3 000 ₽
• Лицо — 5 500–18 000 ₽
• Тело — 5 500–18 000 ₽
• PB Serum триада — 10 000 ₽
• Лонгидаза (Россия) — 10 000 ₽
• Мононити White Ever, 10 шт. — 10 000 ₽
• Нити (молдинги) White Ever, 8 шт. — 36 000 ₽
• Нити (молдинги) White Ever, 12 шт. — 45 000 ₽
• Belotero Lips Shape (0,6 ml) — 17 000 ₽
• Belotero Intense — 21 000 ₽
• Stylage M — 19 000 ₽
• Stylage L — 20 500 ₽
• Pluryal Classic — 19 500 ₽
• Аппликационная анестезия — бесплатно
• Стоматологическая анестезия — 1 000 ₽
• BELOTERO BALANCE — 20 000 ₽
• BELOTERO SOFT — 19 000 ₽
• Belotero Volume — 21 000 ₽
• Stylage L — 20 500 ₽
• Pluryal Volume — 20 500 ₽
• От 2 шприцев — скидка 5%
• Вакуумный гидропилинг лица — 6 000 ₽
• Радиочастотный RF-лифтинг (40 мин) — 3 800 ₽
• Микротоковая терапия (30 мин) — 3 000 ₽
+ Анестезия включена в процедуру.
• 1–5 шт. — 5 000 ₽
• 5–20 шт. — 8 000 ₽
• 20–35 шт. — 12 000 ₽
• Лицо — 50 000 ₽
• Зона глаз и субментальная зона — в подарок
• Лицо полностью + шея + декольте — 65 000 ₽
• Зона глаз и субментальная зона — в подарок
• 1 зона — 65 000 ₽
+ живот полностью и боковые части талии — в подарок
• 2 зоны — 75 000 ₽
• 3 зоны — 85 000 ₽
• Лицо — 13 000 ₽
• Шея — 8 000 ₽
• Декольте — 8 000 ₽
• Лицо + шея — 16 000 ₽
• Лицо + декольте — 16 000 ₽
• Лицо + шея + декольте — 20 000 ₽
• Точечные сосуды (до 3 шт.) — 3 000 ₽
• Крылья носа — 5 000 ₽
• Щеки — 6 000 ₽
• Вибровакуумный массаж + RF лица (40 мин) — 3 000 ₽
• Вибровакуумный массаж + RF тела (60 мин) — 4 000 ₽
• Вибровакуумный массаж + RF лица и тела (90 мин) — 6 000 ₽
• Ультразвуковой липолиз (30 мин) — 2 500 ₽
• Миостимуляция / пассивный фитнес (30 мин) — 2 500 ₽
• Ультразвуковой липолиз + миостимуляция (60 мин) — 4 000 ₽
• Вибровакуумный массаж тела + RF + миостимуляция ягодиц и пресса (90 мин) — 6 000 ₽
• 6 процедур (60 мин) — 22 800 ₽
• 10 процедур (60 мин) — 36 000 ₽
• Миостимуляция к каждой процедуре на выбор: пресс / ягодицы — в подарок
`;

const norm = (s) =>
  s
    .replace(/[  ]/g, ' ')
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1–$2') // a range, either dash
    .replace(/\s+/g, ' ')
    .trim()
    // the only case change the page makes: a note line starts with a capital
    .replace(/^./, (c) => c.toLowerCase());

const expected = SOURCE.trim()
  .split('\n')
  .map((l) => norm(l.replace(/^[•+]\s*/, '')));

const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
const check = (ok, label) => {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}`);
  if (!ok) failures += 1;
};

async function run({ width, height, mobile = false, tag }) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    locale: 'ru-RU',
    ...(mobile ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  console.log(`\n── ${tag} (${width}×${height})`);

  check(
    await page.evaluate(() => !document.querySelector('#pricing')),
    'Стоимость is not in the document before it is opened',
  );
  await page.click('.flowbar a[href="#pricing"]');
  await page.waitForSelector('.pricelayer .spike-pricing');
  check(await page.evaluate(() => location.hash === '#pricing'), 'the menu opens the layer (#pricing)');

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('.spike-pricing__row')].flatMap((tr) => {
      const note = tr.classList.contains('spike-pricing__row--note');
      const th = tr.querySelector('th');
      const td = tr.querySelector('td').textContent;
      const text = (el) => {
        const c = el.cloneNode(true);
        c.querySelectorAll('.spike-pricing__kicker, .spike-pricing__badge').forEach((k) => k.remove());
        return c.textContent;
      };
      if (note) {
        const t = text(th.querySelector('.spike-pricing__note'));
        return [td ? `${t} — ${td}` : t];
      }
      const name = text(th.firstElementChild);
      const notes = [...th.querySelectorAll('.spike-pricing__note')].map(text);
      return [`${name} — ${td}`, ...notes];
    }),
  );
  const gotN = rows.map(norm);

  let mismatches = 0;
  const n = Math.max(expected.length, gotN.length);
  for (let i = 0; i < n; i += 1) {
    if (expected[i] !== gotN[i]) {
      mismatches += 1;
      console.log(`      line ${i + 1}\n        source:   ${expected[i]}\n        rendered: ${gotN[i]}`);
    }
  }
  check(mismatches === 0, `${gotN.length} rendered lines = ${expected.length} source lines, in order, amounts identical (${mismatches} mismatches)`);

  const counts = await page.evaluate(() => ({
    categories: document.querySelectorAll('.spike-pricing__category').length,
    items: document.querySelectorAll('.spike-pricing__row:not(.spike-pricing__row--note)').length,
    badge: [...document.querySelectorAll('.spike-pricing__badge')].map((b) => b.textContent),
    placeholders: /\[(Название|Коррекция мимических|Контурная коррекция|Индивидуальная)/.test(document.querySelector('.spike-pricing').textContent),
    overflow: document.querySelector('.pricelayer__scroll').scrollWidth - document.querySelector('.pricelayer__scroll').clientWidth,
  }));
  console.log(`      ${counts.categories} categories · ${counts.items} priced items · badge ${JSON.stringify(counts.badge)}`);
  check(counts.categories === 7, 'seven categories');
  check(!counts.placeholders, 'no placeholder rows remain');
  check(counts.overflow <= 0, `no horizontal overflow (${counts.overflow})`);

  // every price sits on its service's line: same row box, never below the name's first line
  const apart = await page.evaluate(() =>
    [...document.querySelectorAll('.spike-pricing__row:not(.spike-pricing__row--note)')].filter((tr) => {
      const name = tr.querySelector('th').getBoundingClientRect();
      const price = tr.querySelector('td').getBoundingClientRect();
      return price.top > name.bottom || price.left < name.right - 1;
    }).length,
  );
  check(apart === 0, `every price beside its own service (${apart} apart)`);

  await page.screenshot({ path: `${OUT}/pricing-real-top-${tag}.png` });
  // the index: jump to Аппаратная, the heading lands under the sticky rail
  await page.click('.spike-pricing__index-link:has-text("Аппаратная")');
  await page.waitForTimeout(1400);
  const jumped = await page.evaluate(() => {
    const h = document.querySelector('#price-devices h3').getBoundingClientRect();
    const idx = document.querySelector('.spike-pricing__index').getBoundingClientRect();
    return { top: Math.round(h.top), below: h.top >= idx.bottom - 1, current: document.querySelector('.spike-pricing__index-link[aria-current="true"]')?.textContent };
  });
  check(jumped.below && jumped.top < height * 0.4, `index → Аппаратная косметология lands under the rail (top ${jumped.top}, current «${jumped.current}»)`);
  await page.screenshot({ path: `${OUT}/pricing-real-devices-${tag}.png` });
  await page.evaluate(() => document.querySelector('#price-contour').scrollIntoView());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/pricing-real-contour-${tag}.png` });

  await page.click('.pricelayer__back');
  check(await page.evaluate(() => !document.querySelector('.pricelayer')), '«Назад к сайту» closes the layer');
  check(errors.length === 0, `no page errors ${errors.join(' | ')}`);
  await ctx.close();
}

await run({ width: 1440, height: 900, tag: 'desktop' });
await run({ width: 390, height: 844, mobile: true, tag: 'phone' });
await browser.close();
console.log(failures ? `\n${failures} FAILED` : '\nall ok');
process.exit(failures ? 1 : 0);
