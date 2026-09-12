import { ru } from '@/lib/utils/ru';

/**
 * Page copy that is not a content record.
 *
 * Two kinds, both visible in the prototype:
 *  - `pending`  — decisions the client makes separately; rendered as the
 *                 bracket verbatim, never substituted.
 *  - `proposed` — lines proposed in the art direction and not yet approved;
 *                 rendered normally, flagged with `data-placeholder="copy"`.
 * CTA labels are approved (CLAUDE.md → Hard rule 5) and are not flagged.
 */
export const placeholder = true;

export const pending = {
  heroHeadline: '[ФИНАЛЬНЫЙ HERO-COPY БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]',
  manifesto: '[ФИНАЛЬНЫЙ ТЕКСТ МАНИФЕСТА БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]',
  casesHeadline: '[ФИНАЛЬНЫЙ ЗАГОЛОВОК КЕЙСОВ БУДЕТ УТВЕРЖДЁН ОТДЕЛЬНО]',
} as const;

export const proposed = {
  brandMono: 'cosmetology',
  pricingPlaque: ru('Точно, потому что вы спросите.'),
  pricingColophon: ru(
    '[Юридическая сноска клиента: НДС, лицензия, формулировка об уточнении стоимости на консультации после осмотра.]',
  ),
  specialistsHelp: ru('Не знаете, к кому?'),
  inquiryHeadline: ru('Расскажите, что вы хотели бы обсудить.'),
  inquirySuccessTitle: ru('Заявка получена.'),
  inquirySuccessBody: ru('Мы свяжемся с вами в течение рабочего дня.'),
  inquiryConsent: ru(
    'Я соглашаюсь с политикой обработки персональных данных [ссылка на документ клиента]',
  ),
} as const;

export const cta = {
  book: 'Записаться',
  bookConsultation: ru('Записаться на консультацию'),
  leaveRequest: ru('Оставить заявку'),
  seeServices: 'Смотреть услуги',
  seePricing: 'Стоимость',
  seeCases: ru('Посмотреть кейсы'),
  seeResults: ru('Посмотреть результаты'),
  chooseSpecialist: ru('Выбрать специалиста'),
  pickSpecialist: ru('Подобрать специалиста'),
  bookThisProcedure: ru('Записаться на эту процедуру'),
  bookWith: (shortName: string) => ru(`Записаться к ${shortName}`),
  more: 'Подробнее',
  less: 'Свернуть',
  send: ru('Отправить заявку'),
  sending: 'Отправляем…',
  orTelegram: ru('Или напишите в Telegram'),
  call: 'Позвонить',
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  openInMaps: ru('Открыть в картах'),
  route: ru('Как добраться'),
  copyAddress: ru('Скопировать адрес'),
  copied: 'Скопировано',
  allReviews: (platform: string) => ru(`Все отзывы на ${platform}`),
  showBeforeAfter: ru('Показать до / после'),
  compareSideBySide: ru('Сравнить рядом'),
  allCases: ru('Все кейсы'),
  all: 'Все',
} as const;
