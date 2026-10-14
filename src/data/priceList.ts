import { ru } from '@/lib/utils/ru';
import type { PriceCategory, PriceItem, PriceNote, PriceValue } from '@/types';

/**
 * The clinic's price list, 2026 — the client's own document, transcribed.
 *
 * NOT a placeholder: names and amounts are the source's, line for line. Only
 * typography is normalised (₽ via `formatRub`, NBSP via `ru()`, sentence case
 * for the source's all-caps headings, brand names kept as written). Nothing
 * here is rounded, merged, reworded or described. A change to a price is a
 * change to this file and nothing else — every view reads it from here.
 *
 * Supersedes the format examples in `pricing.ts`, which only the wireframe
 * (`src/sections/Pricing`) still reads until integration.
 */
export const placeholder = false;

/* ---- builders: keep the table below readable as the source ---------------- */

const rub = (value: number): PriceValue => ({ kind: 'exact', rub: value });
const range = (from: number, to: number): PriceValue => ({ kind: 'range', from, to });
const perUnit = (value: number): PriceValue => ({ kind: 'perUnit', rub: value });

const item = (
  id: string,
  name: string,
  price: PriceValue,
  extra: { notes?: readonly PriceNote[]; badge?: string } = {},
): PriceItem => ({ id, name: ru(name), price, ...extra });

const gift = (text: string): PriceNote => ({ kind: 'gift', text: ru(text) });
const offer = (text: string, price?: PriceValue): PriceNote => ({
  kind: 'offer',
  text: ru(text),
  ...(price ? { price } : {}),
});
const info = (text: string, price?: PriceValue): PriceNote => ({
  kind: 'info',
  text: ru(text),
  ...(price ? { price } : {}),
});

const EYES_CHIN_GIFT = 'Зона глаз и субментальная зона — в подарок';

/* ---- the list ------------------------------------------------------------ */

export const priceList: readonly PriceCategory[] = [
  {
    id: 'consultations',
    title: 'Консультации',
    groups: [
      {
        id: 'consultations',
        items: [
          item(
            'consult-primary',
            'Прием врача-косметолога первичный (консультация, осмотр)',
            rub(2000),
          ),
          item(
            'consult-acne',
            'Прием врача дерматокосметолога первичный (консультация по акне)',
            rub(4500),
          ),
          item('consult-repeat', 'Прием врача-косметолога (дерматолога) повторный', rub(1500)),
        ],
      },
    ],
  },
  {
    id: 'cleansing',
    title: 'Очищение',
    fullTitle: 'Очищение кожи лица, шеи и спины',
    groups: [
      {
        id: 'cleansing',
        items: [
          item('clean-peel', 'Комбинированное очищение кожи лица и шеи + пилинг', rub(4900)),
          item(
            'clean-peel-new',
            'Комбинированное очищение кожи лица и шеи + пилинг нового поколения',
            rub(8500),
          ),
          item(
            'clean-care',
            'Комбинированное очищение кожи лица и шеи + профессиональный уход за лицом',
            rub(8500),
          ),
          item(
            'clean-prp',
            'Комбинированная чистка лица, шеи + PRP-терапия (2 пробирки)',
            rub(8500),
          ),
          item(
            'clean-rhea',
            'Комбинированное очищение кожи лица и шеи + профессиональный уход за лицом на премиальной космецевтике RHEA',
            rub(12000),
          ),
          item('clean-atraumatic', 'Атравматическая чистка лица и шеи + пилинг', rub(4000)),
          item('clean-back', 'Комбинированная чистка спины + пилинг', rub(6500)),
          item('clean-face-back', 'Комбинированная чистка лица, шеи + спины', rub(10000)),
        ],
      },
    ],
  },
  {
    id: 'peels',
    title: 'Пилинги',
    groups: [
      {
        id: 'peels',
        items: [
          item(
            'peel-derm',
            'Дерматологический пилинг (миндальный, молочный, азелаиновый, гликолевый, салициловый)',
            rub(4500),
          ),
          item('peel-biorepeel', 'Дерматологический пилинг BioRePeel', rub(6000)),
          item('peel-prp-t33', 'Пилинг PRP-T33', rub(6500)),
          item('peel-peach', 'Peach Peel', rub(5500)),
          item('peel-pink', 'Pink Peel', rub(4500)),
          item('peel-apple', 'Apple Peel', rub(5500)),
          item('peel-tca', 'Пилинг TCA', rub(7000)),
          item('peel-yellow', 'Жёлтый пилинг', rub(7000)),
        ],
      },
    ],
  },
  {
    id: 'rhea',
    title: 'Уходы RHEA',
    fullTitle: 'Профессиональные уходы за лицом на премиальной космецевтике RHEA',
    groups: [
      {
        id: 'rhea',
        items: [
          item('rhea-mona-lisa', 'Омолаживающий уход «Мона Лиза»', rub(8500)),
          item('rhea-venus', 'Осветляющий уход «Венера Милосская»', rub(8500)),
          item('rhea-danae', 'Очищающий уход «Даная»', rub(8500)),
          item('rhea-spa', 'SPA-программа «Итальянская роскошь»', rub(8500)),
        ],
      },
    ],
  },
  {
    id: 'injections',
    title: 'Инъекционная косметология',
    groups: [
      {
        id: 'radiess',
        title: 'RADIESS',
        items: [
          item('radiess-15', 'RADIESS 1.5', rub(28000)),
          item('radiess-30', 'RADIESS 3.0', rub(45000)),
        ],
      },
      {
        id: 'plla',
        title: 'Полимолочная кислота',
        items: [
          item('plla-gana-v', 'Gana V (лицо, шея)', rub(43000)),
          item('plla-gana-x', 'Gana X (тело)', rub(55000)),
          item('plla-novacutan', 'Novacutan PLA (лицо)', rub(39900)),
          item('plla-cube', 'PLLA CUBE', rub(19900)),
          item('plla-rejubella', 'Rejubella', rub(25000)),
        ],
      },
      {
        id: 'collagen',
        title: 'Коллаген',
        items: [
          item('collost-micro', 'Коллост Micro', rub(20500)),
          item('collost-7', 'Коллост 7% (1 мл)', rub(15000)),
          item('collost-micro-zone', 'Коллост микро (1 зона)', rub(14000)),
          item('subcision', 'Субцизия рубцов', { kind: 'surcharge', rub: 5000 }),
        ],
      },
      {
        id: 'exosomes',
        title: 'Экзосомы',
        items: [item('exoxe', 'Exoxe', rub(18000))],
      },
      {
        id: 'botulinum',
        title: 'Ботулинотерапия',
        items: [
          item('botox-dysport', 'Диспорт', perUnit(150)),
          item('botox-miotox', 'Миотокс', perUnit(350)),
          item('botox-relatox', 'Релатокс', perUnit(380)),
          item('botox-xeomin', 'Ксеомин', perUnit(380)),
        ],
      },
      {
        id: 'botulinum-full-face',
        title: 'Ботулинотерапия Full Face',
        items: [
          item('fullface-miotox', 'Миотокс, 100 ед.', rub(26000)),
          item('fullface-relatox', 'Релатокс, 100 ед.', rub(28000)),
          item('fullface-xeomin', 'Ксеомин, 100 ед.', rub(28000)),
        ],
      },
      {
        id: 'hyperhidrosis',
        title: 'Лечение гипергидроза',
        items: [
          item('hyper-dysport', 'Диспорт, 300 ед.', rub(26000)),
          item('hyper-relatox', 'Релатокс, 100 ед.', rub(28000)),
        ],
      },
      {
        id: 'biorevitalisation',
        title: 'Биоревитализация / мезотерапия',
        items: [
          item('bio-profhilo', 'Profhilo', rub(21500)),
          item('bio-mesosculpt', 'Mesosculpt C71', rub(18000)),
          item('bio-mesowharton', 'MesoWharton P199', rub(18000)),
          item('bio-mesoxanthin', 'MesoXanthin F199', rub(18000)),
          item('bio-mesoeye', 'MesoEye C71', rub(18000)),
          item('bio-bellarti-nucleo', 'Bellarti Nucleo', rub(18000)),
          item('bio-bellarti-vita', 'Bellarti Vita', rub(18000)),
          item('bio-novacutan-s', 'Novacutan S Bio', rub(18000)),
          item('bio-novacutan-y', 'Novacutan Y Bio', rub(18000)),
          item('bio-novacutan-prima', 'Novacutan Prima / Master / Bright', rub(19500)),
          item('bio-novacutan-biopro', 'Novacutan Bio Pro', rub(19000)),
          item('bio-novacutan-eye', 'Novacutan Eye', rub(20000)),
          item('bio-novacutan-gentle', 'Novacutan Gentle', rub(18000)),
          item('bio-revi-silk-1', 'Revi SILK 1.0', rub(15000)),
          item('bio-revi-silk-2', 'Revi SILK 2.0', rub(17000)),
          item('bio-revi-strong-1', 'Revi STRONG 1.0', rub(16000)),
          item('bio-revi-strong-2', 'Revi STRONG 2.0', rub(19000)),
          item('bio-revi-eye', 'Revi Eye', rub(14500)),
          item('bio-repart-4', 'Repart 4 Aqua Balance', rub(10000)),
          item('bio-repart-5', 'Repart 5 Active', rub(11500)),
          item('bio-repart-6', 'Repart 6 (Eyes / Lips)', rub(9500)),
          item('bio-nctf', 'NCTF 135+', rub(12500)),
          item('bio-infini', 'INFINI', rub(7000)),
          item('bio-infini-hair', 'INFINI Hair', rub(5000)),
        ],
      },
      {
        id: 'prp',
        title: 'Плазмотерапия / PRP-терапия',
        items: [
          item('prp-face', 'Лицо (2 пробирки)', rub(5000)),
          item('prp-face-neck', 'Лицо + шея (3 пробирки)', rub(5500)),
          item('prp-scalp', 'Волосистая часть головы (1 пробирка)', rub(4000)),
          item('prp-enriched', 'PRP-терапия — обогащенная плазма (2 пробирки)', rub(7000)),
        ],
      },
      {
        id: 'revi-offer',
        title: 'Выгодное предложение',
        notes: [offer('Revi (любой) + Revi Eye — скидка 3 000 ₽')],
      },
      {
        id: 'lipolytics',
        title: 'Липолитики по зонам',
        items: [
          item('lipo-face', 'Лицо', range(5500, 18000)),
          item('lipo-body', 'Тело', range(5500, 18000)),
        ],
      },
      {
        id: 'filler-dissolving',
        title: 'Выведение филлера ферментом',
        items: [
          item('dissolve-pb-serum', 'PB Serum триада', rub(10000)),
          item('dissolve-longidaza', 'Лонгидаза (Россия)', rub(10000)),
        ],
      },
      {
        id: 'threads',
        title: 'Нитевые методики',
        items: [
          item('threads-mono', 'Мононити White Ever, 10 шт.', rub(10000)),
          item('threads-mold-8', 'Нити (молдинги) White Ever, 8 шт.', rub(36000)),
          item('threads-mold-12', 'Нити (молдинги) White Ever, 12 шт.', rub(45000)),
        ],
      },
    ],
  },
  {
    id: 'contour',
    title: 'Контурная пластика',
    fullTitle: 'Контурная пластика лица',
    groups: [
      {
        id: 'lips',
        title: 'Губы',
        items: [
          item('lips-belotero-shape', 'Belotero Lips Shape (0,6 ml)', rub(17000)),
          item('lips-belotero-intense', 'Belotero Intense', rub(21000)),
          item('lips-stylage-m', 'Stylage M', rub(19000)),
          item('lips-stylage-l', 'Stylage L', rub(20500)),
          item('lips-pluryal', 'Pluryal Classic', rub(19500)),
        ],
        notes: [
          info('Аппликационная анестезия', { kind: 'free' }),
          info('Стоматологическая анестезия', rub(1000)),
        ],
      },
      {
        id: 'tear-trough',
        title: 'Коррекция носослезных каналов',
        items: [item('tear-belotero-balance', 'BELOTERO BALANCE', rub(20000))],
      },
      {
        id: 'blanching',
        title: 'Бланширование морщин',
        items: [item('blanch-belotero-soft', 'BELOTERO SOFT', rub(19000))],
      },
      {
        id: 'volume',
        title: 'Коррекция скул / подбородка / углов нижней челюсти / носогубок',
        items: [
          item('volume-belotero', 'Belotero Volume', rub(21000)),
          item('volume-stylage-l', 'Stylage L', rub(20500)),
          item('volume-pluryal', 'Pluryal Volume', rub(20500)),
        ],
        notes: [offer('От 2 шприцев — скидка 5%')],
      },
    ],
  },
  {
    id: 'devices',
    title: 'Аппаратная косметология',
    groups: [
      {
        id: 'hydra',
        title: 'HYDRA',
        items: [item('hydra-peel', 'Вакуумный гидропилинг лица', rub(6000))],
      },
      {
        id: 'rf-microcurrent',
        title: 'RF / микротоки',
        items: [
          item('rf-lifting', 'Радиочастотный RF-лифтинг (40 мин)', rub(3800)),
          item('microcurrent', 'Микротоковая терапия (30 мин)', rub(3000)),
        ],
      },
      {
        id: 'papilloma',
        title: 'Удаление папиллом коагулятором',
        lead: [info('Анестезия включена в процедуру.')],
        items: [
          item('papilloma-1-5', '1–5 шт.', rub(5000)),
          item('papilloma-5-20', '5–20 шт.', rub(8000)),
          item('papilloma-20-35', '20–35 шт.', rub(12000)),
        ],
      },
      {
        id: 'morpheus8',
        title: 'Morpheus8',
        subtitle: 'Микроигольчатый RF-лифтинг',
        items: [
          item('m8-face', 'Лицо', rub(50000), { notes: [gift(EYES_CHIN_GIFT)] }),
          item('m8-face-neck-decollete', 'Лицо полностью + шея + декольте', rub(65000), {
            notes: [gift(EYES_CHIN_GIFT)],
          }),
        ],
        groups: [
          {
            id: 'morpheus8-body',
            title: 'Тело',
            items: [
              item('m8-body-1', '1 зона', rub(65000), {
                notes: [gift('Живот полностью и боковые части талии — в подарок')],
              }),
              item('m8-body-2', '2 зоны', rub(75000)),
              item('m8-body-3', '3 зоны', rub(85000)),
            ],
          },
        ],
      },
      {
        id: 'lumecca',
        title: 'Фототерапия кожи · IPL-модуль Lumecca (InMode)',
        subtitle: 'Лечение сосудов / пигментации / постакне',
        items: [
          item('lumecca-face', 'Лицо', rub(13000)),
          item('lumecca-neck', 'Шея', rub(8000)),
          item('lumecca-decollete', 'Декольте', rub(8000)),
          item('lumecca-face-neck', 'Лицо + шея', rub(16000)),
          item('lumecca-face-decollete', 'Лицо + декольте', rub(16000)),
          item('lumecca-face-neck-decollete', 'Лицо + шея + декольте', rub(20000)),
        ],
        groups: [
          {
            id: 'lumecca-local',
            title: 'Локальные зоны',
            items: [
              item('lumecca-vessels', 'Точечные сосуды (до 3 шт.)', rub(3000)),
              item('lumecca-nose', 'Крылья носа', rub(5000)),
              item('lumecca-cheeks', 'Щеки', rub(6000)),
            ],
          },
        ],
      },
      {
        id: 'robolex',
        title: 'ROBOLEX',
        subtitle:
          'Медицинская многофункциональная косметологическая система для лица и тела «ROBOLEX»',
        items: [
          item('robolex-face', 'Вибровакуумный массаж + RF лица (40 мин)', rub(3000)),
          item('robolex-body', 'Вибровакуумный массаж + RF тела (60 мин)', rub(4000)),
          item('robolex-face-body', 'Вибровакуумный массаж + RF лица и тела (90 мин)', rub(6000)),
          item('robolex-lipolysis', 'Ультразвуковой липолиз (30 мин)', rub(2500)),
          item('robolex-myostim', 'Миостимуляция / пассивный фитнес (30 мин)', rub(2500)),
          item('robolex-lipo-myo', 'Ультразвуковой липолиз + миостимуляция (60 мин)', rub(4000)),
          item(
            'robolex-hit',
            'Вибровакуумный массаж тела + RF + миостимуляция ягодиц и пресса (90 мин)',
            rub(6000),
            { badge: 'Хит' },
          ),
        ],
        groups: [
          {
            id: 'robolex-course',
            title: 'Курс',
            items: [
              item('robolex-course-6', '6 процедур (60 мин)', rub(22800)),
              item('robolex-course-10', '10 процедур (60 мин)', rub(36000), {
                notes: [
                  gift('Миостимуляция к каждой процедуре на выбор: пресс / ягодицы — в подарок'),
                ],
              }),
            ],
          },
        ],
      },
    ],
  },
];

/** Every priced row, in order — for counts and for the source check. */
export const priceItems = (): PriceItem[] => {
  const out: PriceItem[] = [];
  const walk = (groups: PriceCategory['groups']) => {
    for (const g of groups) {
      out.push(...(g.items ?? []));
      if (g.groups) walk(g.groups);
    }
  };
  for (const c of priceList) walk(c.groups);
  return out;
};
