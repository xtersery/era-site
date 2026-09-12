import { ru } from '@/lib/utils/ru';
import type { FounderRecord, Specialist } from '@/types';

/**
 * Team — PLACEHOLDERS. Real specialists and the founder are always real
 * photography and real credentials (CLAUDE.md Hard rule 3). Every person here
 * is female by type; names are bracketed until the client supplies them.
 */
export const placeholder = true;

const makeSpecialist = (n: number, role: string, focus: string): Specialist => ({
  id: `specialist-${n}`,
  gender: 'f',
  isPlaceholder: true,
  name: `[Имя Фамилия ${n}]`,
  shortName: `[Имя ${n}]`,
  role: ru(role),
  facts: [
    ['Стаж', ru('[00] лет')],
    ['Специализация', ru(focus)],
    ['Образование', ru('[ВУЗ, год]')],
  ],
  sentence: ru(
    '[Одна фраза специалиста от первого лица — о своём подходе. Предоставляется клиентом.]',
  ),
  credentials: [
    ru('[Сертификат / курс, год]'),
    ru('[Сертификат / курс, год]'),
    ru('[Членство в ассоциации]'),
  ],
  portraitLabel: ru('Реальная съёмка — портрет в кабинете, дневной свет'),
});

export const specialists: readonly Specialist[] = [
  makeSpecialist(1, 'Врач-косметолог, дерматовенеролог', '[инъекционные методики, качество кожи]'),
  makeSpecialist(2, 'Врач-косметолог', '[anti-age программы, контурная коррекция]'),
  makeSpecialist(3, 'Врач-косметолог', '[аппаратные методики]'),
  makeSpecialist(4, 'Косметолог-эстетист', '[уходовые программы, сопровождение курсов]'),
];

export const specialistById = (id: string): Specialist | undefined =>
  specialists.find((s) => s.id === id);

export const founder: FounderRecord = {
  id: 'founder',
  gender: 'f',
  isPlaceholder: true,
  name: '[Имя Фамилия]',
  shortName: '[Имя]',
  role: ru('Основатель клиники, врач-косметолог'),
  plaque: ru('Стандарт — это то, что я не готова пропустить.'),
  paragraphs: [
    ru(
      '[Абзац 1 — почему появилась клиника. Текст основателя от первого лица: история, точка отсчёта, что её не устраивало в том, как устроена косметология вокруг.]',
    ),
    ru(
      '[Абзац 2 — от чего клиника принципиально отказывается. Конкретно и спокойно: что здесь не делают и почему. Без медицинских утверждений до согласования.]',
    ),
    ru(
      '[Абзац 3 — что обещает каждой пациентке. Тон: тёплый, точный, без обещаний результата. Одно-два предложения о том, как проходит первая встреча.]',
    ),
  ],
  facts: [
    ['Стаж', ru('[00] лет')],
    ['Квалификация', ru('[специальность, категория]')],
    ['Членство', ru('[ассоциации]')],
  ],
  portraitLabel: ru('Реальная съёмка — основатель в клинике, одно окно, сумерки'),
  detailLabel: ru('Реальная съёмка — руки с инструментом, макро'),
};
