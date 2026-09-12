import { useState, type FormEvent } from 'react';

import { Room } from '@/components/common';
import {
  Button,
  CheckboxField,
  Placeholder,
  SelectField,
  TextField,
  TextLink,
  TextareaField,
} from '@/components/ui';
import { contact } from '@/data/contact';
import { cta, proposed } from '@/data/copy';
import { services } from '@/data/services';
import { specialists } from '@/data/specialists';
import { useInquiry } from '@/lib/inquiry';
import type { SectionProps } from '@/types';

import './Inquiry.css';

type Status = 'idle' | 'sending' | 'sent';

interface Errors {
  name?: string;
  phone?: string;
  consent?: string;
}

const PROCEDURE_UNKNOWN = 'unknown';
const SPECIALIST_ANY = 'any';

/**
 * 09 — Заявка. Dark. The glass returns (WebGL appearance 3 — placeholder now)
 * behind a five-field form on hairline baselines. Pre-filled from any CTA;
 * pre-filled values are visible and editable. Errors are quiet; the success
 * state is set in the serif.
 *
 * TODO(backend): `submit()` only simulates a request. Wire to the client's
 * endpoint / CRM before launch.
 */
export function Inquiry({ id, className }: SectionProps) {
  const { prefill, clearPrefill } = useInquiry();
  // A new pre-fill (from any CTA) overwrites the selects; the visitor can then edit them.
  const [selection, setSelection] = useState({
    seen: prefill,
    procedure: prefill.procedure ?? PROCEDURE_UNKNOWN,
    specialist: prefill.specialist ?? SPECIALIST_ANY,
  });
  if (prefill !== selection.seen) {
    setSelection({
      seen: prefill,
      procedure: prefill.procedure ?? selection.procedure,
      specialist: prefill.specialist ?? selection.specialist,
    });
  }
  const { procedure, specialist } = selection;
  const setProcedure = (v: string) => setSelection((s) => ({ ...s, procedure: v }));
  const setSpecialist = (v: string) => setSelection((s) => ({ ...s, specialist: v }));
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');

  const validate = (form: HTMLFormElement): Errors => {
    const data = new FormData(form);
    const next: Errors = {};
    const name = String(data.get('name') ?? '').trim();
    const phone = String(data.get('phone') ?? '').trim();
    if (name.length < 2) next.name = 'Напишите, пожалуйста, как к вам обращаться.';
    const digits = phone.replace(/\D/gu, '');
    if (!(digits.length >= 10 || /^@?[\w.]{3,}$/u.test(phone)))
      next.phone = 'Проверьте, пожалуйста, номер телефона или имя в мессенджере.';
    if (!data.get('consent')) next.consent = 'Без согласия мы не сможем вам ответить.';
    return next;
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    setStatus('sending');
    // Simulated request — see TODO(backend) above.
    window.setTimeout(() => {
      setStatus('sent');
      clearPrefill();
    }, 600);
  };

  return (
    <Room id={id} ground="dark" className={className ?? ''}>
      <div className="inquiry room__grid">
        <Placeholder
          kind="lens"
          label="Линза · третье появление — проясняется по мере заполнения"
          className="inquiry__lens"
        />

        <div className="inquiry__body">
          <h2 id={`${id}-heading`} className="inquiry__headline t-display" data-placeholder="copy">
            {proposed.inquiryHeadline}
          </h2>

          {status === 'sent' ? (
            <div className="inquiry__success" role="status" aria-live="polite">
              <p className="t-h2" data-placeholder="copy">
                {proposed.inquirySuccessTitle}
              </p>
              <p className="t-body" data-placeholder="copy">
                {proposed.inquirySuccessBody}{' '}
                <TextLink href={contact.telegramHref} glyph="external" placeholder>
                  {cta.orTelegram}
                </TextLink>
              </p>
              <p className="t-meta t-muted">
                <time dateTime={new Date().toISOString()}>
                  {new Date().toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
                </time>
              </p>
            </div>
          ) : (
            <form className="inquiry__form" onSubmit={onSubmit} noValidate>
              <TextField
                label="Имя"
                name="name"
                autoComplete="given-name"
                required
                {...(errors.name ? { error: errors.name } : {})}
              />
              <TextField
                label="Телефон или мессенджер"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 или @имя"
                required
                {...(errors.phone ? { error: errors.phone } : {})}
              />
              <SelectField
                label="Интересующая процедура"
                name="procedure"
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
              >
                <option value={PROCEDURE_UNKNOWN}>Пока не знаю — нужна консультация</option>
                <option value="consultation">Консультация</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
              <SelectField
                label="Специалист"
                name="specialist"
                optional
                value={specialist}
                onChange={(e) => setSpecialist(e.target.value)}
              >
                <option value={SPECIALIST_ANY}>Любой</option>
                <option value="founder">[Имя Фамилия] — основатель</option>
                {specialists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
              <TextareaField
                label="Сообщение"
                name="message"
                optional
                className="inquiry__message"
              />
              <CheckboxField
                label={proposed.inquiryConsent}
                name="consent"
                {...(errors.consent ? { error: errors.consent } : {})}
              />
              <div className="inquiry__actions">
                <Button type="submit" disabled={status === 'sending'}>
                  {status === 'sending' ? cta.sending : cta.send}
                </Button>
                <TextLink href={contact.telegramHref} glyph="external" placeholder>
                  {cta.orTelegram}
                </TextLink>
              </div>
            </form>
          )}
        </div>
      </div>
    </Room>
  );
}
