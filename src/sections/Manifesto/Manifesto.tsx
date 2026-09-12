import { Room } from '@/components/common';
import { Placeholder } from '@/components/ui';
import { pending } from '@/data/copy';
import type { SectionProps } from '@/types';

import './Manifesto.css';

/**
 * 01 — Манифест. Dark → light. One pinned screen (the pin and the lens pass are
 * motion/WebGL phases; this is the static composition): two serif lines in
 * columns 2–9, a skin-macro campaign image bleeding off the right edge as the
 * room brightens. Kept short on purpose — it sits between the hero and the
 * commercial rooms.
 */
export function Manifesto({ id, className }: SectionProps) {
  return (
    <Room id={id} ground="dark" {...(className ? { className } : {})}>
      <div className="manifesto room__grid">
        <h2
          id={`${id}-heading`}
          className="manifesto__text t-h2 is-pending"
          data-placeholder="copy"
        >
          {pending.manifesto}
        </h2>
        <Placeholder
          kind="image"
          label="Кампания — макро кожи шеи и ключицы, тёплый луч света, 3:2"
          ratio="3 / 2"
          className="manifesto__image bleed-right"
        />
      </div>
    </Room>
  );
}
