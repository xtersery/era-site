import { useState } from 'react';

import { MetaList, Room } from '@/components/common';
import { Placeholder, TextLink } from '@/components/ui';
import { contact } from '@/data/contact';
import { cta } from '@/data/copy';
import { cn } from '@/lib/utils';
import type { SectionProps } from '@/types';

import './Contact.css';

/**
 * 08 — Адрес и контакты. Light, tight. The instrument's back plate: register
 * marks in the corners (the only time), the address set large, mono facts,
 * hours with today lifted, phone and messengers as mono links, a monochrome
 * line-map placeholder and the door in daylight.
 */
export function Contact({ id, className }: SectionProps) {
  const [copied, setCopied] = useState(false);
  const today = new Date().getDay();

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(`${contact.city}, ${contact.address}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Room id={id} ground="light" tight className={cn('contact', className)}>
      <span className="contact__mark contact__mark--tl" aria-hidden="true" />
      <span className="contact__mark contact__mark--tr" aria-hidden="true" />
      <span className="contact__mark contact__mark--bl" aria-hidden="true" />
      <span className="contact__mark contact__mark--br" aria-hidden="true" />

      <div className="contact__grid room__grid">
        <div className="contact__text">
          <h2 id={`${id}-heading`} className="contact__address t-lead" data-placeholder="fact">
            {contact.city}, {contact.address}
            <br />
            <span className="t-muted">{contact.entrance}</span>
          </h2>

          <MetaList
            layout="table"
            className="contact__facts"
            items={contact.parking ? [['Парковка', contact.parking]] : []}
          />

          <table className="contact__hours">
            <caption className="sr-only">Часы работы</caption>
            <tbody>
              {contact.hours.map((row) => {
                const isToday = row.dayIndexes.includes(today);
                return (
                  <tr
                    key={row.days}
                    className={cn('contact__hours-row t-meta', isToday && 'is-today')}
                    aria-current={isToday ? 'date' : undefined}
                  >
                    <th scope="row">{row.days}</th>
                    <td>{row.time}</td>
                    <td className="contact__today">{isToday ? 'сегодня' : ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="contact__channels" role="list">
            <li>
              <TextLink href={contact.phoneHref} glyph="none">
                <span data-placeholder="fact">{contact.phoneDisplay}</span>
              </TextLink>
            </li>
            <li>
              <TextLink href={contact.telegramHref} glyph="external" placeholder>
                {cta.telegram}
              </TextLink>
            </li>
            <li>
              <TextLink href={contact.whatsappHref} glyph="external" placeholder>
                {cta.whatsapp}
              </TextLink>
            </li>
          </ul>

          <div className="contact__actions">
            <TextLink href={contact.mapHref} glyph="external" placeholder>
              {cta.openInMaps}
            </TextLink>
            <TextLink glyph="forward" placeholder>
              {cta.route}
            </TextLink>
            <TextLink glyph="none" onClick={copyAddress} aria-live="polite">
              {copied ? cta.copied : cta.copyAddress}
            </TextLink>
          </div>
        </div>

        <div className="contact__media">
          <Placeholder
            kind="map"
            label="Монохромная линейная карта квартала — здание заливкой, маршрут от метро пунктиром"
            ratio="4 / 3"
            className="contact__map bleed-right"
          />
          <Placeholder
            kind="image"
            label="Реальная съёмка — дверь и улица, дневной свет"
            ratio="3 / 2"
            className="contact__door"
          />
        </div>
      </div>
    </Room>
  );
}
