/**
 * Minimal `#include`-style composition for GLSL strings.
 *
 * Chunks are imported with `?raw` and concatenated ahead of the shader body.
 * This is deliberately dumber than a preprocessor: no recursion, no caching, no
 * build step. If this stops being enough, install `vite-plugin-glsl` rather
 * than growing this file.
 */
export function composeShader(...parts: readonly string[]): string {
  return parts.join('\n');
}

/**
 * Prefix a shader with precision + common defines.
 * three.js already injects `precision` for ShaderMaterial, so this is only
 * needed for RawShaderMaterial.
 */
export const RAW_PRECISION_HEADER = `precision highp float;\nprecision highp int;\n`;
