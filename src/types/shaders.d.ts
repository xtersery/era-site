/**
 * GLSL imported through Vite's `?raw` suffix.
 *
 * `vite/client` already declares a generic `*?raw` module, but these narrower
 * declarations document the convention and keep working if the generic one is
 * ever replaced by a shader plugin.
 */
declare module '*.glsl?raw' {
  const source: string;
  export default source;
}

declare module '*.vert?raw' {
  const source: string;
  export default source;
}

declare module '*.frag?raw' {
  const source: string;
  export default source;
}
