import { cn } from '@/lib/utils';

import './MetaList.css';

interface MetaListProps {
  readonly items: ReadonlyArray<readonly [label: string, value: string]>;
  /** `rows` (default) stacks label over value; `table` aligns labels in a column. */
  readonly layout?: 'rows' | 'table';
  readonly className?: string;
}

/** Mono metadata block — the instrument's readout. Always a real `<dl>`. */
export function MetaList({ items, layout = 'rows', className }: MetaListProps) {
  return (
    <dl className={cn('meta', `meta--${layout}`, className)}>
      {items.map(([label, value]) => (
        <div className="meta__item" key={label}>
          <dt className="meta__label t-meta t-muted">{label}</dt>
          <dd className="meta__value t-meta">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
