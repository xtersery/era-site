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

const TIMEOUT_MS = 15_000;

/**
 * A signal that aborts after `ms`. `AbortSignal.timeout` is Chrome 103 / Safari
 * 16 — on an older browser calling it throws, and every lead would fail; there
 * the same timeout comes from a controller (Chrome 66).
 */
function timeoutSignal(ms: number): { signal?: AbortSignal; clear: () => void } {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return { signal: AbortSignal.timeout(ms), clear: () => {} };
  }
  if (typeof AbortController === 'undefined') return { clear: () => {} };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

export async function sendLead(payload: LeadPayload): Promise<LeadResult> {
  const timeout = timeoutSignal(TIMEOUT_MS);
  try {
    const res = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      ...(timeout.signal ? { signal: timeout.signal } : {}),
    });
    if (res.ok) return 'ok';
    if (res.status === 429) return 'rate';
    if (res.status === 400) return 'invalid';
    return 'failed';
  } catch {
    return 'failed';
  } finally {
    timeout.clear();
  }
}
