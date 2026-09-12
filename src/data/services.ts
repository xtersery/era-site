import { ru } from '@/lib/utils/ru';
import type { ServiceCategory } from '@/types';

/**
 * Service categories — APPROVED AS PLACEHOLDER CONTENT (CLAUDE.md Hard rule 4).
 * Names and one-line promises are the art-direction examples; do not rewrite
 * or remove at this stage, and do not promote to final. Descriptions and
 * metadata describe themselves and are replaced by client copy.
 */
export const placeholder = true;

const description = (topic: string) =>
  ru(
    `[Текст клиента — один абзац о направлении «${topic}»: для кого, как проходит, чего ожидать. Без медицинских утверждений до согласования с юристом.]`,
  );

export const services: readonly ServiceCategory[] = [
  {
    id: 'injection',
    isPlaceholder: true,
    name: ru('Инъекционная косметология'),
    promise: ru('Точечная работа с мимикой и объёмом. Без следов вмешательства.'),
    description: description('Инъекционная косметология'),
    meta: [
      ['Длительность', ru('[30–60 мин]')],
      ['Курс', '[разово]'],
      ['Метод', ru('[препараты клиента]')],
    ],
    imageLabel: ru('Кампания — портрет в окне, 4:5'),
  },
  {
    id: 'anti-age',
    isPlaceholder: true,
    name: ru('Anti-age процедуры'),
    promise: ru('Возраст виден как качество, а не как усталость.'),
    description: description('Anti-age процедуры'),
    meta: [
      ['Длительность', ru('[45–90 мин]')],
      ['Курс', ru('[по программе]')],
      ['Метод', ru('[методики клиента]')],
    ],
    imageLabel: ru('Кампания — рука у линии челюсти, макро'),
  },
  {
    id: 'contour',
    isPlaceholder: true,
    name: ru('Контурная коррекция'),
    promise: ru('Пропорции, а не объём. Главный принцип — мера.'),
    description: description('Контурная коррекция'),
    meta: [
      ['Длительность', ru('[45–60 мин]')],
      ['Курс', '[разово]'],
      ['Метод', ru('[препараты клиента]')],
    ],
    imageLabel: ru('Кампания — профиль в жёстком свете'),
  },
  {
    id: 'skin-quality',
    isPlaceholder: true,
    name: ru('Работа с качеством кожи'),
    promise: ru('Тон, текстура, сияние — то, что видно без макияжа.'),
    description: description('Работа с качеством кожи'),
    meta: [
      ['Длительность', ru('[60 мин]')],
      ['Курс', ru('[3–6 процедур]')],
      ['Метод', ru('[методики клиента]')],
    ],
    imageLabel: ru('Кампания — макро кожи у виска, дневной свет'),
  },
  {
    id: 'biorevitalisation',
    isPlaceholder: true,
    name: ru('Биоревитализация'),
    promise: ru('Увлажнение и плотность кожи изнутри.'),
    description: description('Биоревитализация'),
    meta: [
      ['Длительность', ru('[45 мин]')],
      ['Курс', ru('[3 процедуры]')],
      ['Метод', ru('[препараты клиента]')],
    ],
    imageLabel: ru('Кампания — капли воды на ключице'),
  },
  {
    id: 'device',
    isPlaceholder: true,
    name: ru('Аппаратные процедуры'),
    promise: ru('Технологии, которые мы выбирали годами.'),
    description: description('Аппаратные процедуры'),
    meta: [
      ['Длительность', ru('[60–90 мин]')],
      ['Курс', ru('[по показаниям]')],
      ['Метод', ru('[аппараты клиента]')],
    ],
    imageLabel: ru('Реальная съёмка — макро апертуры аппарата'),
  },
  {
    id: 'programmes',
    isPlaceholder: true,
    name: ru('Индивидуальные программы'),
    promise: ru('Годовой план вместо разовых решений.'),
    description: description('Индивидуальные программы'),
    meta: [
      ['Формат', ru('[консультация + план]')],
      ['Срок', ru('[6–12 месяцев]')],
      ['Ведёт', ru('[специалист клиента]')],
    ],
    imageLabel: ru('Кампания — женщина у зеркала, дневной свет'),
  },
];

export const serviceById = (id: string): ServiceCategory | undefined =>
  services.find((s) => s.id === id);
