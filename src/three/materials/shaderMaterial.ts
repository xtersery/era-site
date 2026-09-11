import * as THREE from 'three';

/**
 * Typed `THREE.ShaderMaterial` factory.
 *
 * Why not drei's `shaderMaterial()`? drei's helper generates a class and
 * registers it with the R3F catalogue, which is convenient for one-off toys but
 * gives up type safety on the uniform bag and hides disposal. Scenes here are
 * few and long-lived, so an explicit, fully typed material is the better trade.
 *
 * Usage inside R3F:
 *
 * ```tsx
 * const material = useMemo(() => createShaderMaterial({ ... }), []);
 * useEffect(() => () => material.dispose(), [material]);
 * useFrame((_, delta) => { material.uniforms.uTime.value += delta; });
 * return <mesh><planeGeometry args={[2, 2]} /><primitive object={material} attach="material" /></mesh>;
 * ```
 */
export type UniformValues = Record<string, unknown>;

export type TypedUniforms<T extends UniformValues> = {
  [K in keyof T]: THREE.IUniform<T[K]>;
};

export interface ShaderMaterialConfig<T extends UniformValues> {
  readonly vertexShader: string;
  readonly fragmentShader: string;
  readonly uniforms: T;
  readonly transparent?: boolean;
  readonly depthWrite?: boolean;
  readonly depthTest?: boolean;
  readonly side?: THREE.Side;
  readonly blending?: THREE.Blending;
}

export interface TypedShaderMaterial<T extends UniformValues> extends THREE.ShaderMaterial {
  uniforms: TypedUniforms<T>;
}

/** Wrap plain values into three's `{ value }` uniform boxes, keeping the types. */
export function toUniforms<T extends UniformValues>(values: T): TypedUniforms<T> {
  const out = {} as TypedUniforms<T>;
  for (const key of Object.keys(values) as (keyof T)[]) {
    out[key] = { value: values[key] } as THREE.IUniform<T[typeof key]>;
  }
  return out;
}

export function createShaderMaterial<T extends UniformValues>(
  config: ShaderMaterialConfig<T>,
): TypedShaderMaterial<T> {
  const material = new THREE.ShaderMaterial({
    vertexShader: config.vertexShader,
    fragmentShader: config.fragmentShader,
    uniforms: toUniforms(config.uniforms),
    transparent: config.transparent ?? false,
    depthWrite: config.depthWrite ?? true,
    depthTest: config.depthTest ?? true,
    side: config.side ?? THREE.FrontSide,
    blending: config.blending ?? THREE.NormalBlending,
  });

  return material as TypedShaderMaterial<T>;
}

/**
 * Uniforms every scene material is expected to carry, so shared update code
 * (time, pointer, viewport, scroll progress) can drive any of them.
 */
export interface CommonUniformValues extends UniformValues {
  /** Seconds since the scene mounted. */
  uTime: number;
  /** Normalised pointer, -1..1 on both axes, damped. */
  uPointer: THREE.Vector2;
  /** Drawing buffer size in pixels. */
  uResolution: THREE.Vector2;
  /** Scroll progress of the owning section, 0..1. */
  uProgress: number;
}

export const createCommonUniformValues = (): CommonUniformValues => ({
  uTime: 0,
  uPointer: new THREE.Vector2(0, 0),
  uResolution: new THREE.Vector2(1, 1),
  uProgress: 0,
});
