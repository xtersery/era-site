/**
 * One call: `sendMessage`. The token travels only in the request URL, from
 * the server — and no error path here ever prints the URL or the response
 * body (a log line carries the status code and nothing else).
 */

export interface TelegramConfig {
  readonly token: string;
  readonly chatId: string;
  /** `https://api.telegram.org` — tests point it at a local mock */
  readonly apiBase: string;
  readonly fetch: typeof fetch;
  readonly timeoutMs: number;
}

/** `null` when Telegram accepted the message, otherwise why not (safe to log) */
export async function sendTelegram(config: TelegramConfig, text: string): Promise<string | null> {
  try {
    const res = await config.fetch(`${config.apiBase}/bot${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
    if (!res.ok) return `telegram status ${res.status}`;
    const data = (await res.json().catch(() => null)) as { ok?: unknown } | null;
    return data?.ok === true ? null : 'telegram ok:false';
  } catch (error) {
    // the name only — a fetch error's message or cause may carry the URL, and with it the token
    return error instanceof Error ? error.name : 'unknown error';
  }
}
