import * as THREE from 'three';

/**
 * Deeply disposes a Three.js scene, traversing all meshes,
 * geometries, materials, textures, render targets, and the WebGL renderer.
 */
export function disposeThreeScene(scene, renderer, options = { removeDom: false }) {
  if (!scene) return;

  scene.traverse((obj) => {
    if (obj.isMesh || obj.isLine || obj.isPoints) {
      if (obj.geometry) {
        obj.geometry.dispose();
      }

      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => disposeMaterial(mat));
        } else {
          disposeMaterial(obj.material);
        }
      }
    }
  });

  if (renderer) {
    renderer.dispose();
    if (renderer.forceContextLoss) {
      renderer.forceContextLoss();
    }
    if (options.removeDom) {
      const domElement = renderer.domElement;
      if (domElement && domElement.parentNode) {
        domElement.parentNode.removeChild(domElement);
      }
    }
  }
}

function disposeMaterial(mat) {
  if (!mat) return;
  // Dispose all possible map textures
  const textureKeys = [
    'map', 'roughnessMap', 'metalnessMap', 'normalMap',
    'bumpMap', 'displacementMap', 'alphaMap', 'emissiveMap',
    'envMap', 'lightMap', 'aoMap'
  ];
  textureKeys.forEach((key) => {
    if (mat[key] && typeof mat[key].dispose === 'function') {
      mat[key].dispose();
    }
  });
  mat.dispose();
}

/**
 * Request real fullscreen on an element with fallback.
 */
export function toggleFullscreen(element = document.documentElement) {
  if (!document.fullscreenElement) {
    if (element.requestFullscreen) {
      element.requestFullscreen().catch(() => {});
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}
