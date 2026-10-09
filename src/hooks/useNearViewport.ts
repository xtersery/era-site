import { useEffect, useState, type RefObject } from 'react';

/**
 * Has `ref` come within `margin` of the viewport yet? Latches `true` once.
 *
 * For heavy layers that should not exist before the visitor gets near them:
 * on a phone every live WebGL context and its buffers count against one tight
 * memory budget, and a canvas eight screens down costs as much at load as one
 * on screen. With `enabled: false` it is `true` from the first render — the
 * caller's mount timing is unchanged.
 */
export function useNearViewport(
  ref: RefObject<Element | null>,
  { enabled = true, margin = '150%' }: { enabled?: boolean; margin?: string } = {},
): boolean {
  const [near, setNear] = useState(() => !enabled);

  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: `${margin} 0px` },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near, ref, margin]);

  return near;
}
