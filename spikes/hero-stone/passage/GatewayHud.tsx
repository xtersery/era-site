import type { GatewayState } from './passageGateway';

/**
 * Transition diagnostics — `?transitionDebug=1` only, never in the page's UI.
 * Reads a gateway's last state; nothing here touches the transition.
 */
export function GatewayHud({
  title,
  state,
  tier,
}: {
  readonly title: string;
  readonly state: GatewayState | null;
  readonly tier: string;
}) {
  const s = state;
  return (
    <div className="gw-hud" role="status" aria-live="off">
      <i>{title}</i>
      <span>STATE</span>
      <b>{s?.status ?? '—'}</b>
      <span>DIRECTION</span>
      <b>{s ? (s.direction === 1 ? 'forward ↓' : 'back ↑') : '—'}</b>
      <span>PROGRESS</span>
      <b>{s ? s.progress.toFixed(3) : '—'}</b>
      <span>SCROLL LOCK</span>
      <b>{s ? (s.locked ? `held · ${s.side}` : 'free') : '—'}</b>
      <span>VISUAL TIER</span>
      <b>{tier}</b>
    </div>
  );
}
