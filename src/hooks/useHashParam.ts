import { useEffect, useState } from 'react';

import type { SectionId } from '@/lib/constants/sections';

/**
 * Reads `?key=value` from the URL hash when the hash targets `section`, e.g.
 * `#pricing?cat=injection`. Routing secondaries use this to pass a filter
 * between rooms without a router (docs/ARCHITECTURE.md §0.4).
 */
export function useHashParam(section: SectionId, key: string): string | null {
  const read = (): string | null => {
    if (typeof location === 'undefined') return null;
    const [id, query] = location.hash.slice(1).split('?');
    if (id !== section || !query) return null;
    return new URLSearchParams(query).get(key);
  };

  const [value, setValue] = useState<string | null>(read);

  useEffect(() => {
    const onChange = () => setValue(read());
    window.addEventListener('hashchange', onChange);
    window.addEventListener('popstate', onChange);
    return () => {
      window.removeEventListener('hashchange', onChange);
      window.removeEventListener('popstate', onChange);
    };
    // `read` closes over stable args.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, key]);

  return value;
}
