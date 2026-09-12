import { ru } from '@/lib/utils/ru';
import type { ContactInfo } from '@/types';

/** Contact details — PLACEHOLDERS. Every value is supplied by the client. */
export const placeholder = true;

export const contact: ContactInfo = {
  isPlaceholder: true,
  city: '[Город]',
  address: ru('[ул. Адрес, 00]'),
  entrance: ru('[этаж / вход со двора]'),
  metro: ru('Метро [Название] — [0] минут пешком'),
  parking: ru('Парковка — [вариант]'),
  hours: [
    { days: ru('пн — пт'), time: ru('10:00 — 21:00'), dayIndexes: [1, 2, 3, 4, 5] },
    { days: ru('сб — вс'), time: ru('10:00 — 19:00'), dayIndexes: [0, 6] },
  ],
  phoneDisplay: '+7 (000) 000-00-00',
  phoneHref: 'tel:+70000000000',
  telegramHref: '#contact',
  whatsappHref: '#contact',
  mapHref: '#contact',
};

export const heroMeta = ru('[Город] · [ул. Адрес, 00] · ежедневно 10:00 — 21:00');
