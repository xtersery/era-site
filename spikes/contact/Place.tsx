import { useState } from 'react';

import { contact } from '@/data/contact';
import { cta } from '@/data/copy';
import { sectionIndex } from '@/lib/constants/sections';
import { ru } from '@/lib/utils/ru';

import mapUrl from '@/assets/contact/map.webp';

/**
 * 08 — Адрес и контакты: the place you come back to.
 *
 * THE IDEA: after the forest of voices the site becomes a physical place —
 * daylight, a wall, an address set like a line of an editorial, and the
 * plan of the quarter beside it. Nothing performs here: no object, no light
 * trace, no scene. The architecture is the type and the plate of the map.
 *
 * THE STRUCTURE is the wireframe's (`src/sections/Contact`, `src/data/contact`)
 * — the same fields in the same order, elevated: the address as the second
 * headline; metro, parking, hours and the phone as one editorial table of
 * fine rules (the hours with today lifted, as the wireframe does); the
 * messengers as mono links; the route as the room's one CTA, with «Открыть
 * в картах» and «Скопировать адрес» (the wireframe's clipboard) beside it;
 * the map as the wireframe's labelled map placeholder in a wrapper that
 * belongs to the room. Every fact is the wireframe's bracket — nothing is
 * invented; `data-placeholder` marks each one for the launch gate.
 *
 * THE ROUTE: the wireframe's «Как добраться» has no URL until the client's
 * map card exists, and neither does this. The CTA is a real link (keyboard,
 * focus) that points at `contact.mapHref`; while that is a hash it is
 * `aria-disabled` and bracketed, exactly as the reviews room's «Все отзывы».
 *
 * THE MAP: `MapSlot` is the boundary. It holds the approved ERA map
 * (`docs/references/map.png`, as `src/assets/contact/map.webp` — the same
 * artwork, its colours untouched), the plan with its own ERA pin and address
 * label, in the room's frame (the register marks). The whole plate is a link
 * to the clinic's card on 2GIS. No live map, no map script, no tiles.
 *
 * SCROLL: none of the page's. An ordinary section: the head of the room is
 * the atmosphere the forest leaves into (CSS, position-linked, identical
 * under reduced motion); the composition stands on the bone below it.
 */
const isUrl = (href: string) => /^https?:\/\//.test(href);

function MapSlot({ href }: { href: string }) {
  return (
    <a className="place__map" href={href} target="_blank" rel="noopener noreferrer" aria-label="Открыть расположение клиники ЭРА в 2ГИС">
      <img
        className="place__map-image"
        src={mapUrl}
        alt="Схема расположения клиники ЭРА, Госпитальный переулок, 1, Хабаровск"
        width={1122}
        height={1402}
        loading="lazy"
        decoding="async"
      />
      <span className="place__mark place__mark--tl" aria-hidden="true" />
      <span className="place__mark place__mark--tr" aria-hidden="true" />
      <span className="place__mark place__mark--bl" aria-hidden="true" />
      <span className="place__mark place__mark--br" aria-hidden="true" />
    </a>
  );
}

export function Place() {
  const index = sectionIndex('contact');
  const today = new Date().getDay();
  const [copied, setCopied] = useState(false);
  const address = `${contact.city}, ${contact.address}`;
  const routeLive = isUrl(contact.routeHref);
  const mapLive = isUrl(contact.mapHref);
  // the same hours every day: the row is always today, so the word «сегодня» says nothing
  const everyDay = contact.hours.length === 1 && contact.hours[0]!.dayIndexes.length === 7;

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="place" id="contact" aria-labelledby="contact-title">
      {/* the atmosphere the forest leaves into — the head of the room, empty on purpose */}
      <div className="place__dawn" aria-hidden="true" />

      <div className="place__grid">
        <div className="place__text">
          <p className="place__label">
            <span>{index} — Адрес и контакты</span>
          </p>

          <h2 id="contact-title" className="place__title" data-placeholder="copy">
            Место, куда
            <br />
            возвращаются
          </h2>

          <p className="place__address">
            <span className="place__street">{address}</span>
            <span className="place__entrance">{contact.entrance}</span>
          </p>

          <dl className="place__facts">
            <div className="place__row">
              <dt>Телефон</dt>
              <dd>
                <a className="place__phone" href={contact.phoneHref}>
                  {contact.phoneDisplay}
                </a>
                <span className="place__messengers">
                  <a href={contact.telegramHref} target="_blank" rel="noopener noreferrer">
                    {cta.telegram} ↗
                  </a>
                  <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer">
                    {cta.whatsapp} ↗
                  </a>
                </span>
              </dd>
            </div>
            <div className="place__row place__row--hours">
              <dt>Часы</dt>
              <dd>
                <table className="place__hours">
                  <caption className="sr-only">Часы работы</caption>
                  <tbody>
                    {contact.hours.map((row) => {
                      const isToday = row.dayIndexes.includes(today);
                      return (
                        <tr key={row.days} data-today={isToday || undefined} aria-current={isToday ? 'date' : undefined}>
                          <th scope="row">{row.days}</th>
                          <td>{row.time}</td>
                          <td className="place__today">{isToday && !everyDay ? 'сегодня' : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {contact.hoursNote && <span className="place__hours-note">{contact.hoursNote}</span>}
              </dd>
            </div>
            {/* parking only when verified — none is, so none is shown */}
            {contact.parking && (
              <div className="place__row">
                <dt>Парковка</dt>
                <dd>{contact.parking}</dd>
              </div>
            )}
          </dl>

          <div className="place__actions">
            <a
              className="place__route"
              href={contact.routeHref}
              {...(routeLive
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : { 'aria-disabled': true, 'data-placeholder': 'fact' })}
            >
              {ru('Построить маршрут')} →
            </a>
            <span className="place__links">
              <a
                href={contact.mapHref}
                {...(mapLive
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : { 'aria-disabled': true, 'data-placeholder': 'fact' })}
              >
                {cta.openInMaps} ↗
              </a>
              <button type="button" onClick={copyAddress} aria-live="polite">
                {copied ? cta.copied : cta.copyAddress}
              </button>
            </span>
          </div>
        </div>

        <div className="place__media">
          <MapSlot href={contact.mapHref} />
        </div>
      </div>
    </section>
  );
}
