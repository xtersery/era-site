import type { Lead } from './validate.ts';

/**
 * The Telegram message — Telegram's HTML parse mode, so the title can be
 * bold; everything the visitor typed is escaped.
 */

const escape = (s: string) =>
  s.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;');

/** Khabarovsk keeps UTC+10; IANA has no zone of its own for it — it is `Asia/Vladivostok` */
const KHABAROVSK = new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Asia/Vladivostok',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatKhabarovsk(date: Date): string {
  return `${KHABAROVSK.format(date)} (Хабаровск)`;
}

export function formatLead(lead: Lead, at: Date): string {
  const rows = [
    '<b>НОВАЯ ЗАЯВКА — ERA COSMETOLOGY</b>',
    `Имя: ${escape(lead.name)}`,
    `Контакт: ${escape(lead.contact)}`,
    `Процедура: ${escape(lead.procedure)}`,
    `Специалист: ${escape(lead.specialist)}`,
    ...(lead.message ? [`Сообщение: ${escape(lead.message)}`] : []),
    'Источник: сайт ERA',
    `Дата и время: ${formatKhabarovsk(at)}`,
  ];
  return rows.join('\n\n');
}
