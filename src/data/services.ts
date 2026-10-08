import { ru } from '@/lib/utils/ru';
import type { ServiceCategory } from '@/types';

import antiAge from '@/assets/services/anti-age.jpg';
import body from '@/assets/services/body.jpg';
import contour from '@/assets/services/contour.jpg';
import device from '@/assets/services/device.jpg';
import injection from '@/assets/services/injection.jpg';
import programmes from '@/assets/services/programmes.jpg';
import skinQuality from '@/assets/services/skin-quality.jpg';

/**
 * Service directions — the clinic's own structure and copy, supplied by the
 * founder (06.10). The single source of truth for every room and spike that
 * names a direction; nothing here is invented. Where the founder's source
 * varies by procedure, duration and course are the aggregated category range;
 * where it says «индивидуально», so does the record.
 *
 * Kept short on purpose — title, lead, one paragraph, three rows. The founder's
 * long-form text (individual procedures: ботулинотерапия, биоревитализация,
 * Radiesse, Morpheus8, Lumecca, Robolex …) belongs to detail pages / CMS, not
 * to the pinned Services scene.
 *
 * Images are the clinic's references (`docs/references/<direction>.png`),
 * re-encoded as JPEG at native size in `src/assets/services/` — never edited.
 */
export const placeholder = false;

/** Section philosophy — shortened from the founder's text; for an intro area where a room has one. */
export const servicesIntro = ru(
  'В ERA COSMETOLOGY процедуры не назначаются по шаблону. Врач оценивает состояние кожи, анатомические особенности и задачи пациента, после чего составляет индивидуальный план коррекции.',
);

type Direction = Omit<ServiceCategory, 'meta' | 'isPlaceholder'>;

const direction = (d: Direction): ServiceCategory => ({
  ...d,
  isPlaceholder: false,
  meta: [
    ['Длительность', d.duration],
    ['Курс', d.course],
    ['Метод', d.method],
  ],
});

export const services: readonly ServiceCategory[] = [
  direction({
    id: 'injection',
    name: ru('Инъекционная косметология'),
    title: ['Инъекционная', 'косметология'],
    promise: ru('Точная работа с качеством кожи, мимикой и плотностью тканей.'),
    description: ru(
      'Инъекционные методики подбираются индивидуально в зависимости от состояния кожи, анатомии и задач пациента. В направлении используются ботулинотерапия, биоревитализация, коллагеностимуляция, полимолочная кислота и препараты на основе гидроксиапатита кальция.',
    ),
    duration: ru('20–60 мин'),
    course: ru('1–4 процедуры, индивидуально'),
    method: ru('инъекционный'),
    image: injection,
    imagePosition: '50% 40%',
    detailPosition: '30% 34%',
    imageLabel: ru('инъекция у линии брови'),
  }),
  direction({
    id: 'contour',
    name: ru('Контурная пластика'),
    title: ['Контурная', 'пластика'],
    promise: ru('Коррекция объемов и пропорций с учетом индивидуальной анатомии.'),
    description: ru(
      'Контурная пластика применяется для коррекции губ, подбородка, скул, нижней трети лица и других зон. Врач оценивает пропорции лица и подбирает препарат и технику так, чтобы результат оставался естественным.',
    ),
    duration: ru('40–60 мин'),
    course: ru('обычно 1 процедура'),
    method: ru('филлеры / индивидуальный подбор'),
    image: contour,
    imagePosition: '50% 50%',
    detailPosition: '80% 40%',
    imageLabel: ru('губы крупным планом'),
  }),
  direction({
    id: 'device',
    name: ru('Аппаратная косметология'),
    title: ['Аппаратная', 'косметология'],
    promise: ru('Технологии для качества кожи, лифтинга и коррекции ее изменений.'),
    description: ru(
      'В направлении используются современные аппаратные методики для работы с плотностью и текстурой кожи, сосудистыми и пигментными изменениями, тонусом тканей и признаками усталости.',
    ),
    duration: ru('30–90 мин'),
    course: ru('1–10 процедур'),
    method: ru('аппаратные методики'),
    image: device,
    imagePosition: '50% 60%',
    detailPosition: '42% 16%',
    imageLabel: ru('аппарат у мраморной стены'),
  }),
  direction({
    id: 'skin-quality',
    name: ru('Лечение и качество кожи'),
    title: [ru('Лечение и'), ru('качество кожи')],
    promise: ru('Работа не только с проявлениями, но и с причиной изменений кожи.'),
    description: ru(
      'Врач оценивает состояние кожи и собирает анамнез, после чего составляет индивидуальную программу лечения и восстановления. Направление включает работу с акне, постакне, пигментацией, сосудистыми изменениями и куперозом.',
    ),
    duration: ru('40–60 мин первичный прием'),
    course: ru('индивидуально'),
    method: ru('комплексный подход'),
    image: skinQuality,
    imagePosition: '50% 30%',
    detailPosition: '42% 46%',
    imageLabel: ru('кожа в тёплом дневном свете'),
  }),
  direction({
    id: 'anti-age',
    name: ru('Anti-age программы'),
    title: ['Anti-age', 'программы'],
    promise: ru('Комплексный подход к возрастным изменениям без изменения естественных черт.'),
    description: ru(
      'Врач оценивает качество и плотность кожи, состояние тканей, мышечную активность и пропорции лица. Программа может сочетать аппаратные и инъекционные методики в зависимости от индивидуальных задач.',
    ),
    duration: ru('индивидуально'),
    course: ru('по персональному плану'),
    method: ru('комбинация методик'),
    image: antiAge,
    imagePosition: '50% 35%',
    detailPosition: '22% 42%',
    imageLabel: ru('два портрета, естественная кожа'),
  }),
  direction({
    id: 'body',
    name: ru('Коррекция тела'),
    title: ['Коррекция', 'тела'],
    promise: ru('Работа с качеством тканей, плотностью кожи и контурами тела.'),
    description: ru(
      'В зависимости от зоны и поставленной задачи врач может использовать аппаратные и инъекционные методики для улучшения качества тканей, уменьшения отечности и повышения плотности кожи.',
    ),
    duration: ru('30–90 мин'),
    course: ru('1–10 процедур'),
    method: ru('аппаратный / инъекционный'),
    image: body,
    imagePosition: '50% 30%',
    detailPosition: '42% 38%',
    imageLabel: ru('линия спины в тёплом свете'),
  }),
  direction({
    id: 'programmes',
    name: ru('Индивидуальные программы'),
    title: ['Индивидуальные', 'программы'],
    promise: ru('Сначала задача — затем процедуры.'),
    description: ru(
      'На консультации врач оценивает состояние кожи, анатомические особенности лица или тела, возрастные изменения, предыдущие процедуры и пожелания пациента. После этого составляется персональный план, который может включать несколько последовательных этапов.',
    ),
    duration: ru('40–60 мин консультация'),
    course: ru('индивидуально'),
    method: ru('персональный план'),
    image: programmes,
    imagePosition: '50% 25%',
    detailPosition: '28% 34%',
    imageLabel: ru('уход у висков, дневной свет'),
  }),
];

export const serviceById = (id: string): ServiceCategory | undefined =>
  services.find((s) => s.id === id);
