import { createContext, useContext } from 'react';

export interface InquiryPrefill {
  readonly procedure?: string;
  readonly specialist?: string;
}

export interface InquiryContextValue {
  readonly prefill: InquiryPrefill;
  readonly setPrefill: (next: InquiryPrefill) => void;
  readonly clearPrefill: () => void;
}

export const InquiryContext = createContext<InquiryContextValue | null>(null);

export function useInquiry(): InquiryContextValue {
  const ctx = useContext(InquiryContext);
  if (!ctx) throw new Error('useInquiry must be used inside <InquiryProvider>');
  return ctx;
}
