import { NBSP, formatRub, formatRubRange } from '@/lib/utils';
import type { PriceCategory, PriceGroup, PriceItem, PriceNote, PriceValue } from '@/types';

/**
 * One category of the real price list as one `<table>`: groups are row groups,
 * a nested group (Morpheus8 → Тело, ROBOLEX → Курс) is a quieter heading
 * inside its parent. Name left, price right, tabular. Gifts and offers are
 * secondary lines — a mono kicker and a 1 px champagne tick, never a banner.
 */

export const priceText = (p: PriceValue): string => {
  switch (p.kind) {
    case 'exact':
      return formatRub(p.rub);
    case 'range':
      return formatRubRange(p.from, p.to);
    case 'perUnit':
      return `${formatRub(p.rub)}${NBSP}за${NBSP}ед.`;
    case 'surcharge':
      return `+${formatRub(p.rub)}`;
    case 'free':
      return 'бесплатно';
  }
};

const KICKER: Record<PriceNote['kind'], string | null> = {
  gift: 'подарок',
  offer: 'предложение',
  info: null,
};

function Note({ note }: { note: PriceNote }) {
  const kicker = KICKER[note.kind];
  return (
    <span className={`spike-pricing__note spike-pricing__note--${note.kind}`}>
      {kicker && <span className="spike-pricing__kicker">{kicker}</span>}
      {note.text}
    </span>
  );
}

function ItemRow({ item }: { item: PriceItem }) {
  return (
    <tr className="spike-pricing__row">
      <th scope="row" className="spike-pricing__name">
        <span>
          {item.name}
          {item.badge && <span className="spike-pricing__badge">{item.badge}</span>}
        </span>
        {item.notes?.map((n) => <Note key={n.text} note={n} />)}
      </th>
      <td className="spike-pricing__price">{priceText(item.price)}</td>
    </tr>
  );
}

/** A note that stands as its own line in the table (anaesthesia, discounts). */
function NoteRow({ note }: { note: PriceNote }) {
  return (
    <tr className="spike-pricing__row spike-pricing__row--note">
      <th scope="row" className="spike-pricing__name">
        <Note note={note} />
      </th>
      <td className="spike-pricing__price spike-pricing__price--note">
        {note.price ? priceText(note.price) : ''}
      </td>
    </tr>
  );
}

function GroupRows({ group, depth }: { group: PriceGroup; depth: 0 | 1 }) {
  return (
    <>
      {group.title && (
        <tr className={`spike-pricing__group spike-pricing__group--d${depth}`}>
          <th scope="rowgroup" colSpan={2}>
            <span className="spike-pricing__group-title">{group.title}</span>
            {group.subtitle && (
              <span className="spike-pricing__group-sub">{group.subtitle}</span>
            )}
          </th>
        </tr>
      )}
      {group.lead?.map((n) => <NoteRow key={n.text} note={n} />)}
      {group.items?.map((it) => <ItemRow key={it.id} item={it} />)}
      {group.notes?.map((n) => <NoteRow key={n.text} note={n} />)}
      {group.groups?.map((g) => <GroupRows key={g.id} group={g} depth={1} />)}
    </>
  );
}

export function PriceTable({ category }: { category: PriceCategory }) {
  return (
    <table className="spike-pricing__table">
      <caption className="sr-only">{category.fullTitle ?? category.title}</caption>
      {category.groups.map((g) => (
        <tbody key={g.id}>
          <GroupRows group={g} depth={0} />
        </tbody>
      ))}
    </table>
  );
}
