import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { CheckboxField, SelectField, TextField, TextareaField } from '@/components/ui';
import { contact } from '@/data/contact';
import { cta, proposed } from '@/data/copy';
import { services } from '@/data/services';
import { founder, specialists } from '@/data/specialists';
import { sectionIndex } from '@/lib/constants/sections';
import { sendLead, useInquiry, type LeadResult } from '@/lib/inquiry';
import { ru } from '@/lib/utils/ru';

/**
 * 09 — Заявка: the conversation.
 *
 * THE IDEA: the last room is not a form on a page but the private end of the
 * place — the visitor has seen where the clinic is, and now says who she
 * is. One headline, a few words, the form on hairline baselines beside
 * them, the light held to the middle of the screen. No object, no scene.
 *
 * THE STRUCTURE is the wireframe's (`src/sections/Inquiry`), field for
 * field and rule for rule: name (≥ 2 characters), phone or messenger
 * (≥ 10 digits or an @handle), the procedure (the service categories, with
 * «Пока не знаю» first), the specialist (optional, the founder and the
 * team), a message (optional), the consent — the same `Field` components,
 * so labels, ids, `aria-describedby`, the quiet `role="alert"` errors and
 * the `role="status"` success are the wireframe's; the pre-fill from any
 * CTA through `useInquiry()`, cleared when the request is sent. The request
 * is real: `sendLead()` → `POST /api/lead` (`server/`) → the clinic's
 * Telegram chat. A failed send keeps every field as typed, says so in the
 * quiet error line above the button, and the button sends again; a second
 * click while sending is ignored. One correction: the wireframe focuses the first invalid field
 * synchronously, before React has rendered the error — here the focus
 * follows the render, so it lands.
 *
 * COPY: the headline and the support are this pass's proposal
 * (`data-placeholder="copy"`), as is the success line; the consent text and
 * the button are the wireframe's own.
 *
 * SCROLL: none of the page's. An ordinary section: its head is the quiet
 * before the words (`--hush`), the parts arrive one after another as they
 * enter the viewport — masked wipes scrubbed to the scroll, so the end
 * state is reached by scrolling, never by waiting, and is simply there
 * under reduced motion.
 */
gsap.registerPlugin(ScrollTrigger);

type Status = 'idle' | 'sending' | 'sent' | 'error';

/**
 * The corridor — the page's walls, one fixed layer painted from `--t-k`
 * (`inquiry.css`). The flow writes it across the window in which Заявка
 * enters; the standalone page holds it at rest. Rendered once, by the page,
 * not by the section.
 */
export function Corridor() {
  return <div className="talk-walls" aria-hidden="true" />;
}

/**
 * The staging: each part of the room — the label, the title, the support,
 * then the form's fields and the actions in document order — arrives as it
 * enters the lower part of the viewport, a masked wipe scrubbed to the
 * scroll: `--k` 0 → 1 from the part's top at 98 % of the viewport to its
 * bottom at 93 % — the light travels down the part itself, and a part at
 * the very end of the page still completes. Position-linked and reversible;
 * nothing the viewport already holds is hidden. Under reduced motion no
 * trigger exists and the CSS holds `--k` at 1.
 */
function useStaging(status: Status) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parts = gsap.utils.toArray<HTMLElement>('#inquiry [data-reveal], #inquiry .talk__form > *');
    const tweens = parts.map((el) =>
      gsap.fromTo(el, { '--k': 0 }, {
        '--k': 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 98%', end: 'bottom 93%', scrub: true, invalidateOnRefresh: true },
      }),
    );
    ScrollTrigger.refresh();
    return () => {
      for (const t of tweens) {
        t.scrollTrigger?.kill();
        t.kill();
      }
    };
  }, [status]);
}

interface Errors {
  name?: string;
  phone?: string;
  consent?: string;
}

/** what the visitor reads when the send did not go through — the form keeps everything she typed */
const FAILURE: Record<Exclude<LeadResult, 'ok'>, string> = {
  failed: ru('Не удалось отправить заявку. Всё, что вы написали, сохранено — попробуйте ещё раз или напишите нам в Telegram.'),
  rate: ru('Слишком много попыток подряд. Попробуйте ещё раз через несколько минут или напишите нам в Telegram.'),
  invalid: ru('Проверьте, пожалуйста, поля формы и отправьте ещё раз.'),
};

/** the label the visitor sees for the chosen option — what the clinic's chat should read */
const chosen = (form: HTMLFormElement, name: string) =>
  form.querySelector<HTMLSelectElement>(`select[name="${name}"]`)?.selectedOptions[0]?.text ?? '';

const PROCEDURE_UNKNOWN = 'unknown';
const SPECIALIST_ANY = 'any';

/** the wireframe's rules, unchanged */
function validate(form: HTMLFormElement): Errors {
  const data = new FormData(form);
  const next: Errors = {};
  const name = String(data.get('name') ?? '').trim();
  const phone = String(data.get('phone') ?? '').trim();
  if (name.length < 2) next.name = ru('Напишите, пожалуйста, как к вам обращаться.');
  const digits = phone.replace(/\D/gu, '');
  if (!(digits.length >= 10 || /^@?[\w.]{3,}$/u.test(phone)))
    next.phone = ru('Проверьте, пожалуйста, номер телефона или имя в мессенджере.');
  if (!data.get('consent')) next.consent = ru('Без согласия мы не сможем вам ответить.');
  return next;
}

export function Talk() {
  const index = sectionIndex('inquiry');
  const { prefill, clearPrefill } = useInquiry();
  // a new pre-fill (from any CTA) overwrites the selects; the visitor can then edit them
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
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [attempt, setAttempt] = useState(0);
  const [failure, setFailure] = useState<Exclude<LeadResult, 'ok'> | null>(null);
  // a ref, not the state: two clicks in one frame both see `status === 'idle'`
  const inFlight = useRef(false);
  // when the form appeared — the server turns away a send faster than a person types
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);
  useStaging(status);

  // the focus follows the render: the first invalid control, once it carries the error
  useEffect(() => {
    if (!attempt) return;
    document.querySelector<HTMLElement>('#inquiry [aria-invalid="true"]')?.focus();
  }, [attempt]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const form = event.currentTarget;
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      setAttempt((n) => n + 1);
      return;
    }
    inFlight.current = true;
    setFailure(null);
    setStatus('sending');
    const data = new FormData(form);
    const result = await sendLead({
      name: String(data.get('name') ?? ''),
      contact: String(data.get('phone') ?? ''),
      procedure: chosen(form, 'procedure'),
      specialist: chosen(form, 'specialist'),
      message: String(data.get('message') ?? ''),
      consent: data.get('consent') !== null,
      website: String(data.get('website') ?? ''),
      startedAt: startedAt.current,
    });
    inFlight.current = false;
    if (result === 'ok') {
      setStatus('sent');
      clearPrefill();
    } else {
      setFailure(result);
      setStatus('error');
    }
  };

  return (
    <section className="talk" id="inquiry" aria-labelledby="inquiry-title">
      {/* the quiet before the words — the head of the room, empty on purpose */}
      <div className="talk__hush" aria-hidden="true" />
      {/* the brand imprint: the official mark, debossed in the surface at the room's lower left — an architectural stamp, never a logo on the page */}
      <div className="talk__imprint" aria-hidden="true" />

      <div className="talk__grid">
        <div className="talk__text">
          <p className="talk__label" data-reveal="">
            <span>{index} — Заявка</span>
          </p>
          <h2 id="inquiry-title" className="talk__title" data-placeholder="copy" data-reveal="">
            Начнём
            <br />
            с разговора.
          </h2>
          <p className="talk__lede" data-placeholder="copy" data-reveal="">
            {ru('Расскажите, что вас беспокоит или какой результат вы хотите получить. Мы свяжемся с вами и предложим подходящий следующий шаг.')}
          </p>
        </div>

        <div className="talk__side">
          {status === 'sent' ? (
            <div className="talk__success" role="status" aria-live="polite">
              <p className="talk__thanks" data-placeholder="copy">Спасибо.</p>
              <p className="talk__after" data-placeholder="copy">
                {ru('Мы свяжемся с вами и подберём удобное время.')}
              </p>
              <p className="talk__or">
                <a href={contact.telegramHref} data-placeholder="fact" rel="noopener noreferrer">
                  {cta.orTelegram} ↗
                </a>
              </p>
              <p className="talk__when">
                <time dateTime={new Date().toISOString()}>
                  {new Date().toLocaleString('ru-RU', { dateStyle: 'long', timeStyle: 'short' })}
                </time>
              </p>
            </div>
          ) : (
            <form className="talk__form" onSubmit={onSubmit} noValidate>
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
                onChange={(e) => setSelection((s) => ({ ...s, procedure: e.target.value }))}
              >
                <option value={PROCEDURE_UNKNOWN}>{ru('Пока не знаю — нужна консультация')}</option>
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
                onChange={(e) => setSelection((s) => ({ ...s, specialist: e.target.value }))}
              >
                <option value={SPECIALIST_ANY}>Любой</option>
                <option value="founder">{ru(`${founder.name} — основатель`)}</option>
                {specialists.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </SelectField>
              <TextareaField label="Сообщение" name="message" optional />
              <CheckboxField
                label={proposed.inquiryConsent}
                name="consent"
                {...(errors.consent ? { error: errors.consent } : {})}
              />
              <div className="talk__actions">
                {/* the honeypot: out of sight, out of the tab order, unnamed to assistive tech — only a bot fills it */}
                <div className="sr-only" aria-hidden="true">
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
                </div>
                {failure && (
                  <p className="field__error talk__fail" role="alert">
                    {FAILURE[failure]}
                  </p>
                )}
                <button type="submit" className="talk__send" disabled={status === 'sending'}>
                  {status === 'sending' ? cta.sending : `${cta.send} →`}
                </button>
                <a className="talk__or" href={contact.telegramHref} data-placeholder="fact" rel="noopener noreferrer">
                  {cta.orTelegram} ↗
                </a>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* the colophon: one row at the foot of the last room — the wireframe's footer facts, nothing more */}
      <footer className="talk__foot">
        <p className="talk__foot-brand">
          <span>© 2026 ЭРА {proposed.brandMono}</span>
          <span data-placeholder="fact">[ООО «Название», лицензия № 00000]</span>
        </p>
        <p className="talk__foot-legal">
          <a href="#inquiry" aria-disabled="true" data-placeholder="fact">{ru('Политика обработки персональных данных')}</a>
          <a href="#inquiry" aria-disabled="true" data-placeholder="fact">{ru('Правовая информация')}</a>
        </p>
        <p className="talk__foot-where">
          <span data-placeholder="fact">{contact.city}</span>
          <a href={contact.telegramHref} data-placeholder="fact" rel="noopener noreferrer">{cta.telegram}</a>
          <a href={contact.whatsappHref} data-placeholder="fact" rel="noopener noreferrer">{cta.whatsapp}</a>
        </p>
      </footer>
    </section>
  );
}
