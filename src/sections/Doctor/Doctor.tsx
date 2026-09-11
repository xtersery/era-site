import type { SectionProps } from '@/types';

/**
 * Doctor section — STRUCTURAL STUB.
 *
 * Renders the semantic landmark and nothing else. Composition, copy, imagery
 * and motion are decided in the design pass; see `.claude/skills/premium-web-design`
 * for the concept-first process this must go through before any markup lands.
 */
export function Doctor({ id, className }: SectionProps) {
  return <section id={id} className={className} aria-labelledby={`${id}-heading`} />;
}
