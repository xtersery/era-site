/**
 * Idle scheduling with a safe fallback (Safari has no `requestIdleCallback`)
 * and a hard ceiling so the stage never waits on a busy main thread forever.
 */
export function whenIdle(callback: () => void, ceilingMs = 2000): () => void {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    callback();
  };

  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  let idleId: number | undefined;
  let timeoutId: number | undefined;

  if (typeof w.requestIdleCallback === 'function') {
    idleId = w.requestIdleCallback(run, { timeout: ceilingMs });
  } else {
    timeoutId = window.setTimeout(run, 200);
  }
  const ceiling = window.setTimeout(run, ceilingMs);

  return () => {
    done = true;
    if (idleId !== undefined) w.cancelIdleCallback?.(idleId);
    if (timeoutId !== undefined) clearTimeout(timeoutId);
    clearTimeout(ceiling);
  };
}

/** Resolves after the `load` event (or immediately if it already fired). */
export function afterLoad(): Promise<void> {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
}
