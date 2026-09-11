import type { SectionId } from '@/lib/constants/sections';

export type { SectionId };

/** A section's scroll progress, 0 before it enters, 1 after it leaves. */
export type ScrollProgress = number;

/** Anything that can be cleaned up. Returned by imperative setup functions. */
export type Cleanup = () => void;

/** Props every top-level section component accepts. */
export interface SectionProps {
  readonly id: SectionId;
  readonly className?: string;
}

/** Narrow helper for `exactOptionalPropertyTypes` friendliness. */
export type Maybe<T> = T | null | undefined;
