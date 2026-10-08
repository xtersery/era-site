import founderImage from '@/assets/founder/founder.webp';
import { NBSP, ru } from '@/lib/utils/ru';

/** word joiner: «4-м» never breaks after its hyphen (invisible, the text unchanged) */
const WJ = '\u2060';
import type { FounderChapter, FounderRecord, Specialist } from '@/types';

/**
 * Team. The four specialists are THE CLINIC'S OWN PEOPLE — confirmed by the
 * client: name, role, experience, the approach line and the photograph
 * (`public/images/specialists/sp1–4.jpg`). Nothing else is confirmed, so
 * nothing else is filled: no education, certificates, categories or
 * specialisations until the client supplies them (CLAUDE.md Hard rule 4).
 *
 * The founder is real too — her profile as the client supplied it (06.10),
 * the photograph `docs/references/founder1.png` (re-encoded as WebP, never
 * edited). Her biography is kept WORD FOR WORD: the chapters only divide it;
 * their markers and anchors label it and add nothing.
 */
export const placeholder = false;

const specialist = (
  id: string,
  name: string,
  dative: string,
  role: string,
  experience: string,
  sentence: string,
): Specialist => ({
  id,
  gender: 'f',
  isPlaceholder: false,
  name,
  // «Записаться к …» takes the dative of the first name
  shortName: dative,
  role: ru(role),
  facts: [['Стаж', ru(experience)]],
  sentence: ru(sentence),
  credentials: [],
  portraitLabel: ru('Портрет в клинике'),
});

/** the order is the order of the gallery: 05.1 → 05.4 */
export const specialists: readonly Specialist[] = [
  specialist(
    'koryagina',
    'Корягина Анастасия',
    'Анастасии',
    'Врач-косметолог',
    'более 3 лет',
    'Для меня важно не изменить лицо, а подчеркнуть его естественные пропорции.',
  ),
  specialist(
    'son',
    'Сон Евгения',
    'Евгении',
    'Врач-косметолог',
    'более 2 лет',
    'Хороший результат начинается с точной оценки состояния кожи и бережной работы с ней.',
  ),
  specialist(
    'korgacheva',
    'Елена Коргачева',
    'Елене',
    'Врач-косметолог',
    'более 2 лет',
    'Я выбираю деликатный подход, в котором результат выглядит естественно и уместно.',
  ),
  specialist(
    'voronina',
    'Анастасия Воронина',
    'Анастасии',
    'Эстетист-косметолог',
    'более 5 лет',
    'Уход работает лучше всего тогда, когда становится регулярной и понятной системой.',
  ),
];

export const specialistById = (id: string): Specialist | undefined =>
  specialists.find((s) => s.id === id);

const chapters: readonly FounderChapter[] = [
  {
    id: 'beginning',
    marker: 'Начало пути',
    anchor: `4-${WJ}й курс`,
    text: ru(
      `Свой профессиональный путь в эстетической медицине начала ещё на 4-${WJ}м курсе медицинского университета, работая помощником косметолога.`,
    ),
  },
  {
    id: 'education',
    marker: 'Образование',
    anchor: '2020',
    text: ru(
      `В 2020 году окончила Дальневосточный государственный медицинский университет, после чего продолжила обучение в ординатуре по специальности «Дерматовенерология» в Институте повышения квалификации специалистов здравоохранения (ИПКСЗ) на базе Краевой клинической больницы №${NBSP}1.`,
    ),
  },
  {
    id: 'training',
    marker: 'Обучение',
    anchor: ru('Москва · Южная Корея'),
    text: ru(
      'За годы практики прошла большое количество профильных обучений и программ повышения квалификации в России и за рубежом: обучалась в Москве, проходила кадавер-курсы по анатомии лица, профессиональное обучение в Южной Корее.',
    ),
  },
  {
    id: 'speaker',
    marker: 'Спикер',
    anchor: ru('Доклад об экзосомах'),
    text: ru(
      'Выступала спикером на Дальневосточной косметологической конференции с докладом, посвящённым экзосомам — одному из современных направлений регенеративной и эстетической медицины.',
    ),
  },
];

const philosophy = {
  lead: ru('В своей работе я придерживаюсь принципов естественного омоложения и комплексного подхода.'),
  quote: [
    ru('Для меня важно не менять внешность пациента, а бережно и точно работать с качеством кожи, возрастными изменениями и индивидуальными особенностями,'),
    ru('сохраняя естественность, гармонию и узнаваемые черты лица.'),
  ],
} as const;

const experience = { value: ru('Более 8 лет'), label: ru('в эстетической медицине') } as const;

export const founder: FounderRecord = {
  id: 'founder',
  gender: 'f',
  isPlaceholder: false,
  name: 'Ахундова Алина Вадимовна',
  shortName: 'Алине Вадимовне',
  displayName: ['Алина', 'Ахундова'],
  role: ru('Врач-дерматовенеролог, косметолог'),
  experience,
  chapters,
  philosophy,
  image: founderImage,
  portraitLabel: ru('Ахундова Алина Вадимовна, основатель ЭРА'),
  plaque: philosophy.quote.join(' '),
  paragraphs: [...chapters.map((c) => c.text), philosophy.lead],
  facts: [['Опыт', ru(`${experience.value.toLowerCase()} ${experience.label}`)]],
  detailLabel: ru('Реальная съёмка — руки с инструментом, макро'),
};
