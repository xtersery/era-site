import { Component, type ErrorInfo, type ReactNode } from 'react';

import { isDev } from '@/lib/env';

interface SceneBoundaryProps {
  readonly children: ReactNode;
  /** Shown in place of the scene when it throws. Default: nothing — the room's DOM stays. */
  readonly fallback?: ReactNode;
  /** Told once when the scene fails — for a room that hid its CSS still behind a live scene. */
  readonly onError?: () => void;
}

interface SceneBoundaryState {
  readonly failed: boolean;
}

/**
 * The fail-safe around every WebGL layer. A scene is optional; the page is not:
 * a context that cannot be created, a shader that fails on one GPU, a texture
 * too big for a phone — any of them throws inside the canvas subtree, and
 * without a boundary React unmounts the whole root and the visitor gets a
 * blank page. Here the canvas goes and the room's own DOM/CSS stays.
 */
export class SceneBoundary extends Component<SceneBoundaryProps, SceneBoundaryState> {
  override state: SceneBoundaryState = { failed: false };

  static getDerivedStateFromError(): SceneBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: unknown, info: ErrorInfo) {
    if (isDev) console.warn('[SceneBoundary] scene disabled:', error, info.componentStack);
    this.props.onError?.();
  }

  override render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
