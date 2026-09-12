import { Handoff, MetaList, Room } from '@/components/common';
import { InquiryLink, Placeholder } from '@/components/ui';
import { cta } from '@/data/copy';
import { founder } from '@/data/specialists';
import type { SectionProps } from '@/types';

import './Founder.css';

/**
 * 06 — Основатель. Dark. A full-height real photograph left (no glass — a real
 * face is never refracted), the long read right: name, role, plaque, three
 * first-person paragraphs, credentials, one primary CTA.
 */
export function Founder({ id, className }: SectionProps) {
  return (
    <Room id={id} ground="dark" {...(className ? { className } : {})}>
      <div className="founder room__grid">
        <Placeholder
          kind="portrait"
          label={founder.portraitLabel}
          ratio="3 / 4"
          className="founder__portrait bleed-left"
        />
        <div className="founder__text">
          <h2 id={`${id}-heading`} className="founder__name t-h2" data-placeholder="fact">
            {founder.name}
          </h2>
          <p className="founder__role t-body t-muted">{founder.role}</p>
          <p className="founder__plaque t-lead" data-placeholder="copy">
            {founder.plaque}
          </p>
          <div className="founder__body flow" data-placeholder="copy">
            {founder.paragraphs.map((p) => (
              <p className="t-lg" key={p}>
                {p}
              </p>
            ))}
          </div>
          <MetaList items={founder.facts} layout="table" className="founder__facts" />
          <Placeholder
            kind="image"
            label={founder.detailLabel}
            ratio="3 / 2"
            className="founder__detail"
          />
          <Handoff
            className="founder__handoff"
            primary={
              <InquiryLink procedure="consultation" specialist={founder.id}>
                {cta.bookConsultation}
              </InquiryLink>
            }
          >
            <span className="t-meta t-muted" data-placeholder="fact">
              Консультацию проводит [имя / команда — политика клиента]
            </span>
          </Handoff>
        </div>
      </div>
    </Room>
  );
}
