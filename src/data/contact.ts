import { ru } from '@/lib/utils/ru';
import type { ContactInfo } from '@/types';

/**
 * Contact details — the clinic's real data (06.10), from its 2GIS listing
 * (https://2gis.ru/khabarovsk/firm/70000001057599223) and the clinic: the
 * address, the entrance, the hours; the number (calls and WhatsApp) and the
 * Telegram supplied by the client.
 *
 * The point is OpenStreetMap's building «Госпитальный переулок, 1»
 * (Кировский район) — 2GIS answers automated reads with a captcha, so its own
 * coordinates could not be read. Check the marker on the live map once the
 * 2GIS key is in. (OSM gives the postcode as 680028; 680038 is the listing's.)
 *
 * No metro (Хабаровск), no parking — nothing unverified is shown.
 */
export const placeholder = false;

const FIRM_ID = '70000001057599223';
const POINT = [48.4817001, 135.0510535] as const; // [lat, lon]

export const contact: ContactInfo = {
  isPlaceholder: false,
  city: 'Хабаровск',
  address: ru('Госпитальный переулок, 1'),
  entrance: ru('1 этаж · рядом с магазином «Малыш»'),
  district: ru('Кировский район'),
  postcode: '680038',
  point: POINT,
  hours: [{ days: 'Ежедневно', time: '09:00–21:00', dayIndexes: [0, 1, 2, 3, 4, 5, 6] }],
  hoursNote: ru('по предварительной записи'),
  phoneDisplay: '+7 914 777-85-00',
  phoneHref: 'tel:+79147778500',
  telegramHref: 'https://t.me/eracosmetology',
  whatsappHref: 'https://wa.me/79147778500',
  // the clinic's card, and a route ending at it (2GIS: `directions/points/|lon,lat;firm`, the start left to the visitor)
  mapHref: `https://2gis.ru/khabarovsk/firm/${FIRM_ID}`,
  routeHref: `https://2gis.ru/khabarovsk/directions/points/%7C${POINT[1]}%2C${POINT[0]}%3B${FIRM_ID}`,
};

export const heroMeta = ru('Хабаровск · Госпитальный переулок, 1 · ежедневно 09:00–21:00');
