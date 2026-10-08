import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

import type { LeadHandler } from './lead/handler.ts';

/**
 * The Node adapter: `(req, res)` → Web `Request` → the handler → `res`.
 * Works as a `node:http` listener and as Connect/Express middleware — Vite
 * mounts it (`server/vite.ts`); a VPS or container mounts the same function.
 *
 * `trustProxy`: behind nginx / a load balancer the socket address is the
 * proxy's, and the client's is the first entry of `X-Forwarded-For`. Turn it
 * on only behind a proxy that sets that header — otherwise anyone can forge
 * an address and walk around the rate limit.
 */
export function toNodeListener(handler: LeadHandler, { trustProxy = false } = {}) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const forwarded = trustProxy
        ? String(req.headers['x-forwarded-for'] ?? '')
            .split(',')[0]
            ?.trim()
        : '';
      const ip = forwarded || req.socket.remoteAddress || 'unknown';
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (typeof value === 'string') headers.set(key, value);
        else if (Array.isArray(value)) headers.set(key, value.join(', '));
      }
      const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
      const request = new Request(`http://${req.headers.host ?? 'localhost'}${req.url ?? '/'}`, {
        method: req.method ?? 'GET',
        headers,
        ...(hasBody ? { body: Readable.toWeb(req) as ReadableStream, duplex: 'half' } : {}),
      } as RequestInit);

      const response = await handler(request, ip);
      res.statusCode = response.status;
      response.headers.forEach((value, key) => res.setHeader(key, value));
      res.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
      console.warn(`[lead] adapter error: ${error instanceof Error ? error.name : 'unknown'}`);
      if (!res.headersSent) res.statusCode = 500;
      res.end();
    }
  };
}
