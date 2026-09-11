import * as THREE from 'three';

/**
 * Recursively release GPU memory owned by an object graph.
 *
 * R3F disposes objects *it* created when a component unmounts, but anything
 * built imperatively — a `useLoader` result reused across scenes, a render
 * target, a manually constructed material — is ours to free. Leaked textures
 * are the usual cause of "the site gets slower the longer you scroll".
 */
export function disposeObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as Partial<THREE.Mesh>;

    mesh.geometry?.dispose();

    const material = mesh.material;
    if (!material) return;

    for (const item of Array.isArray(material) ? material : [material]) {
      disposeMaterial(item);
    }
  });
}

/** Dispose a material and every texture it references. */
export function disposeMaterial(material: THREE.Material): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) value.dispose();
  }

  // Custom shader materials keep their textures in `uniforms`, not on the instance.
  const uniforms = (material as Partial<THREE.ShaderMaterial>).uniforms;
  if (uniforms) {
    for (const uniform of Object.values(uniforms)) {
      if (uniform.value instanceof THREE.Texture) uniform.value.dispose();
    }
  }

  material.dispose();
}
