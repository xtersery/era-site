/**
 * The inquiry payload, checked on the server with the same rules the form
 * applies in the browser (`spikes/inquiry/Talk.tsx → validate`), plus the
 * limits a public endpoint needs: lengths, types, the honeypot and the
 * fill-time trap. Never trust the browser's check alone.
 */

export interface Lead {
  readonly name: string;
  readonly contact: string;
  readonly procedure: string;
  readonly specialist: string;
  readonly message: string;
}

export type Verdict =
  | { readonly kind: 'lead'; readonly lead: Lead }
  /** a bot: answer as if accepted, deliver nothing */
  | { readonly kind: 'trap' }
  | { readonly kind: 'invalid'; readonly fields: readonly string[] };

/** a human needs at least this long between the form appearing and sending it */
export const MIN_FILL_MS = 2_000;

/**
 * The specialist is optional in the form (`Talk.tsx`: «Любой» by default);
 * a lead without one reads as the form's own «no preference» label, so the
 * clinic's message keeps its agreed layout.
 */
export const SPECIALIST_ANY = 'Любой';

const LIMITS = { name: 80, contact: 64, procedure: 160, specialist: 160, message: 2_000 } as const;

// eslint-disable-next-line no-control-regex -- control characters are exactly what is stripped
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu;

/** one line: every run of whitespace (NBSP included — the form's `ru()` adds them) becomes one space */
const line = (v: unknown) =>
  typeof v === 'string' ? v.replace(CONTROL, '').replace(/\s+/gu, ' ').trim() : '';

/** free text: line breaks kept (at most one empty line), the rest as `line` */
const text = (v: unknown) =>
  typeof v === 'string'
    ? v
        .replace(CONTROL, '')
        .replace(/\r\n?/gu, '\n')
        .replace(/[^\S\n]+/gu, ' ')
        .replace(/ *\n */gu, '\n')
        .replace(/\n{3,}/gu, '\n\n')
        .trim()
    : '';

export function validateLead(body: unknown, now: number): Verdict {
  if (typeof body !== 'object' || body === null) return { kind: 'invalid', fields: ['body'] };
  const b = body as Record<string, unknown>;

  // the honeypot is invisible to people; anything in it is a bot
  if (typeof b['website'] === 'string' && b['website'] !== '') return { kind: 'trap' };
  // sent faster than a person can fill five fields — or with no start time at all
  const startedAt = b['startedAt'];
  if (typeof startedAt !== 'number' || !Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS)
    return { kind: 'trap' };

  const lead: Lead = {
    name: line(b['name']),
    contact: line(b['contact']),
    procedure: line(b['procedure']),
    specialist: line(b['specialist']) || SPECIALIST_ANY,
    message: text(b['message']),
  };

  const fields: string[] = [];
  if (lead.name.length < 2 || lead.name.length > LIMITS.name) fields.push('name');
  const digits = lead.contact.replace(/\D/gu, '');
  if (
    lead.contact.length > LIMITS.contact ||
    !(digits.length >= 10 || /^@?[\w.]{3,}$/u.test(lead.contact))
  )
    fields.push('contact');
  if (!lead.procedure || lead.procedure.length > LIMITS.procedure) fields.push('procedure');
  if (lead.specialist.length > LIMITS.specialist) fields.push('specialist');
  if (lead.message.length > LIMITS.message) fields.push('message');
  if (b['consent'] !== true) fields.push('consent');

  return fields.length ? { kind: 'invalid', fields } : { kind: 'lead', lead };
}
