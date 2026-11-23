let support: boolean | null = null;

/**
 * Whether WebGL works. Creating a context is slow (it starts the GPU path), so
 * this runs once, when the 3D scene is about to mount, and releases the test
 * context straight away.
 */
export function hasWebGL(): boolean {
  if (support !== null) return support;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    support = Boolean(gl);
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    support = false;
  }
  return support;
}

/** Run `callback` when the browser is idle (or soon after, where it has no idle callback). */
export function whenIdle(callback: () => void, timeout = 1500): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 200);
  return () => window.clearTimeout(id);
}
