import { renderToStaticMarkup } from 'react-dom/server';

import { contact } from '@/data/contact';
import { proposed } from '@/data/copy';
import { priceItems, priceList } from '@/data/priceList';
import { ru } from '@/lib/utils';

import { PriceTable } from '../flow/PriceTable';

/**
 * /ceny/ — the price list as a page of its own, for search and for a link.
 *
 * Rendered to static HTML at build time (`server/cenyPage.ts`) and never
 * hydrated: the page ships no JavaScript. It reads the same `priceList` and
 * draws each category with the same `PriceTable` as the «Стоимость» layer on
 * the main page, so a price changed in `src/data/priceList.ts` changes both.
 * The index is plain `#` anchors; the numbering is the layer's `03.N`.
 */

export const SITE = 'https://era-cosmetology.ru';
export const PATH = '/ceny/';

const no = (i: number) => `03.${i + 1}`;
const ITEM_COUNT = priceItems().length;

function Header() {
  return (
    <header className="ceny-bar">
      <a className="ceny-bar__mark" href="/" aria-label="эра — на главную">
        эра
      </a>
      <nav className="ceny-bar__nav" aria-label="Сайт клиники">
        <a href="/#services">Услуги</a>
        <a className="ceny-bar__phone" href={contact.phoneHref}>
          {contact.phoneDisplay}
        </a>
        <a className="ceny-bar__cta" href="/#inquiry">
          Записаться
        </a>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="ceny-foot">
      <p className="ceny-foot__brand">
        <span>© 2026 ЭРА {proposed.brandMono}</span>
        <span>
          {contact.city}, {contact.address}
        </span>
      </p>
      <p className="ceny-foot__where">
        <span>
          {contact.hours.map((h) => `${h.days} ${h.time}`).join(' · ')}
        </span>
        <a href={contact.phoneHref}>{contact.phoneDisplay}</a>
        <a href={contact.telegramHref} rel="noopener noreferrer">
          Telegram ↗
        </a>
        <a href="/">На главную</a>
      </p>
    </footer>
  );
}

export function CenyPage() {
  return (
    <>
      <a className="skip-link" href="#prices">
        К прайс-листу
      </a>
      <Header />
      <main className="spike-pricing ceny" id="main">
        {/* the layer's label rule, its left half the way back: Главная / 03 — Стоимость */}
        <div className="spike-pricing__label">
          <nav className="ceny-crumbs" aria-label="Навигационная цепочка">
            <ol>
              <li>
                <a href="/">Главная</a>
              </li>
              <li aria-current="page">03 — Стоимость</li>
            </ol>
          </nav>
          <span>
            {priceList.length} разделов · {ITEM_COUNT} позиций · прайс-лист 2026
          </span>
        </div>

        <div className="spike-pricing__body">
          <h1 className="spike-pricing__title ceny__title">
            {ru('Стоимость косметологических процедур')}
          </h1>
          <p className="ceny__sub">Косметологическая клиника ЭРА · Хабаровск</p>
          <p className="ceny__intro">
            {ru(
              'Полный прайс-лист клиники на 2026 год: консультации, очищение и пилинги, уходы, инъекционная косметология, контурная пластика и аппаратные процедуры. Записаться можно по телефону, в Telegram или через заявку на сайте.',
            )}
          </p>

          <nav className="spike-pricing__index ceny__index" aria-label="Разделы прайс-листа">
            <ol>
              {priceList.map((c, i) => (
                <li key={c.id}>
                  <a className="spike-pricing__index-link" href={`#${c.id}`}>
                    <span className="spike-pricing__index-no">{no(i)}</span>
                    {c.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div id="prices">
            {priceList.map((c, i) => (
              <section
                key={c.id}
                id={c.id}
                className="spike-pricing__category"
                aria-labelledby={`${c.id}-title`}
              >
                <header className="spike-pricing__category-head">
                  <span className="spike-pricing__category-no" aria-hidden="true">
                    {no(i)}
                  </span>
                  <h2 id={`${c.id}-title`}>{c.fullTitle ?? c.title}</h2>
                </header>
                <PriceTable category={c} />
              </section>
            ))}
          </div>

          <div className="spike-pricing__handoff ceny__handoff">
            <a className="ceny__btn" href="/#inquiry">
              Оставить заявку
            </a>
            <a className="ceny__link" href={contact.phoneHref}>
              Позвонить · {contact.phoneDisplay}
            </a>
            <a className="ceny__link" href="/#services">
              Направления клиники →
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ---- structured data: only what the page states ------------------------- */

function jsonLd() {
  const clinic = `${SITE}/#clinic`;
  const url = `${SITE}${PATH}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: 'Цены на косметологические процедуры в Хабаровске — клиника ЭРА',
        inLanguage: 'ru-RU',
        isPartOf: { '@id': `${SITE}/#website` },
        about: { '@id': clinic },
        breadcrumb: { '@id': `${url}#breadcrumb` },
        mainEntity: { '@id': `${url}#services` },
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Главная', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Стоимость', item: url },
        ],
      },
      {
        '@type': 'MedicalClinic',
        '@id': clinic,
        name: 'ЭРА',
        url: `${SITE}/`,
        telephone: contact.phoneDisplay,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Госпитальный переулок, 1',
          addressLocality: contact.city,
          addressRegion: 'Хабаровский край',
          postalCode: contact.postcode,
          addressCountry: 'RU',
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#services`,
        name: 'Разделы прайс-листа',
        itemListElement: priceList.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          url: `${url}#${c.id}`,
          item: {
            '@type': 'Service',
            name: plain(c.fullTitle ?? c.title),
            provider: { '@id': clinic },
            areaServed: { '@type': 'City', name: contact.city },
          },
        })),
      },
    ],
  };
}

/* the data's typographic NBSPs are for the page, not for the JSON */
const plain = (s: string) => s.replace(/[  ]/g, ' ');

/** The page body and its JSON-LD, as strings for the HTML shell. */
export function renderCeny(): { body: string; jsonLd: string } {
  return {
    body: renderToStaticMarkup(<CenyPage />),
    // `<` escaped so no string in the data can close the script element
    jsonLd: JSON.stringify(jsonLd(), null, 2).replace(/</g, '\\u003c'),
  };
}
