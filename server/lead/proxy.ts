/**
 * The visitor's address through our own proxy.
 *
 * The Cloudflare Pages front (`functions/api/lead.ts`) forwards the inquiry
 * to the Vercel Function; Vercel then sees Cloudflare's address, and every
 * visitor would share one rate-limit bucket. The proxy therefore sends the
 * visitor's address (`cf-connecting-ip`) in `x-era-client-ip`, together with
 * a secret shared by the two deployments (`LEAD_PROXY_SECRET`). The address
 * is trusted ONLY with the right secret — without it the header is ignored,
 * so nobody can forge an address to walk around the limit.
 */

export const PROXY_IP_HEADER = 'x-era-client-ip';
export const PROXY_SECRET_HEADER = 'x-era-proxy-secret';

/** an IPv4 / IPv6 literal, loosely — enough to keep anything else out of a rate-limit key */
const IP = /^[0-9a-f:.]{2,45}$/iu;

/** compares in time independent of where the strings differ */
function sameSecret(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

/** the address our proxy vouches for, or `null` when the request does not carry the shared secret */
export function proxiedClientIp(request: Request, secret: string | undefined): string | null {
  if (!secret) return null;
  const given = request.headers.get(PROXY_SECRET_HEADER);
  if (given === null || !sameSecret(given, secret)) return null;
  const ip = request.headers.get(PROXY_IP_HEADER)?.trim() ?? '';
  return IP.test(ip) ? ip : null;
}
