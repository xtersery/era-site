import { invalidateStage, stage } from './stage';

/**
 * Normalised pointer → stage. Attach to a DOM surface (a room or a grip); the
 * canvas itself never receives events. `nx`/`ny` are −1..1 across the surface.
 */
export function attachPointer(surface: HTMLElement): () => void {
  const onMove = (event: PointerEvent) => {
    const rect = surface.getBoundingClientRect();
    stage.pointer.nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    stage.pointer.ny = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    stage.pointer.active = true;
    invalidateStage();
  };
  const onLeave = () => {
    stage.pointer.active = false;
    invalidateStage();
  };
  surface.addEventListener('pointermove', onMove, { passive: true });
  surface.addEventListener('pointerleave', onLeave, { passive: true });
  return () => {
    surface.removeEventListener('pointermove', onMove);
    surface.removeEventListener('pointerleave', onLeave);
  };
}
