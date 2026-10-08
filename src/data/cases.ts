import { ru } from '@/lib/utils/ru';
import type { CaseRecord } from '@/types';

/**
 * Cases — PLACEHOLDERS. In the concept stage the imagery is generated
 * (hyperrealistic, women 35–60, identical framing); each record carries a
 * status that is rendered as the honesty label. At launch every case is either
 * a consented real patient or labelled «Визуализация».
 */
export const placeholder = true;

export const cases: readonly CaseRecord[] = [
  {
    id: 'case-1',
    categoryId: 'injection',
    isPlaceholder: true,
    title: ru('Биоревитализация, курс 3 процедуры'),
    resultAfter: ru('через 6 недель'),
    specialistId: '', // placeholder case — never attributed to a real specialist
    course: ru('3 процедуры'),
    commentary: ru(
      '[Комментарий специалиста — одно-два предложения: какая была задача и чего намеренно не делали.]',
    ),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — фронтально, нейтральное выражение, без макияжа'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 6 недель'),
  },
  {
    id: 'case-2',
    categoryId: 'contour',
    isPlaceholder: true,
    title: ru('Контурная коррекция средней трети'),
    resultAfter: ru('через 3 недели'),
    specialistId: '', // placeholder case — never attributed to a real specialist
    commentary: ru(
      '[Комментарий специалиста — о пропорциях и мере: почему объёма меньше, чем просили.]',
    ),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — три четверти, дневной свет'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 3 недели'),
  },
  {
    id: 'case-3',
    categoryId: 'injection',
    isPlaceholder: true,
    title: ru('Коррекция мимических морщин'),
    resultAfter: ru('через 2 недели'),
    specialistId: '', // placeholder case — never attributed to a real specialist
    commentary: ru('[Комментарий специалиста — о сохранённой естественной мимике.]'),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — лоб и область глаз, крупно'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 2 недели'),
  },
  {
    id: 'case-4',
    categoryId: 'skin-quality',
    isPlaceholder: true,
    title: ru('Работа с качеством кожи, курс'),
    resultAfter: ru('через 3 месяца'),
    specialistId: '', // placeholder case — never attributed to a real specialist
    course: ru('5 процедур'),
    commentary: ru('[Комментарий специалиста — о тоне и текстуре без макияжа.]'),
    status: 'visualisation',
    beforeLabel: ru('Визуализация «до» — щека и висок, макро'),
    afterLabel: ru('Визуализация «после» — идентичный кадр, 3 месяца'),
  },
];

export const CASE_STATUS_LABEL: Readonly<Record<CaseRecord['status'], string>> = {
  'real-consented': ru('Реальный кейс · публикуется с согласия пациента'),
  // the clinic's own photograph, consent not yet documented in the project — a bracket, not a claim
  'real-pending': ru('Реальный кейс · [согласие пациента — подтверждается]'),
  visualisation: 'Визуализация',
};
