/**
 * The inquiry, sent to our own endpoint (`POST /api/lead`, `server/`) —
 * never to Telegram from the browser: the bot token lives on the server.
 *
 * Procedure and specialist travel as the labels the visitor saw, not as
 * ids: the message in the clinic's chat reads as the form read.
 */

export interface LeadPayload {
  readonly name: string;
  readonly contact: string;
  readonly procedure: string;
  readonly specialist: string;
  readonly message: string;
  readonly consent: boolean;
  /** the honeypot — empty for people */
  readonly website: string;
  /** when the form appeared (ms since epoch) — the server's fill-time trap */
  readonly startedAt: number;
}

/** `ok` · `rate` too many attempts · `invalid` the server's check failed · `failed` anything else */
export type LeadResult = 'ok' | 'rate' | 'invalid' | 'failed';

export async function sendLead(payload: LeadPayload): Promise<LeadResult> {
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });
    if (res.ok) return 'ok';
    if (res.status === 429) return 'rate';
    if (res.status === 400) return 'invalid';
    return 'failed';
  } catch {
    return 'failed';
  }
}
