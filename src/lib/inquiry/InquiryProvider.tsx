import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { InquiryContext, type InquiryPrefill } from './context';

/**
 * Inquiry pre-fill — the path to booking (docs/ARCHITECTURE.md §0.4).
 *
 * One object, two setters, one consumer. Deliberately not a store library.
 * Values are ids from `data/` (service category id, specialist id), never
 * display strings — the form resolves labels itself so a rename cannot desync.
 */
export function InquiryProvider({ children }: { readonly children: ReactNode }) {
  const [prefill, setPrefillState] = useState<InquiryPrefill>({});

  const setPrefill = useCallback((next: InquiryPrefill) => {
    setPrefillState((current) => ({ ...current, ...next }));
  }, []);
  const clearPrefill = useCallback(() => setPrefillState({}), []);

  const value = useMemo(
    () => ({ prefill, setPrefill, clearPrefill }),
    [prefill, setPrefill, clearPrefill],
  );

  return <InquiryContext.Provider value={value}>{children}</InquiryContext.Provider>;
}
