import { bindAttribute } from "../i18n/client";
import { createBenefitsWaveRenderer } from "./benefits-wave-renderer";

type WaveRenderer = ReturnType<typeof createBenefitsWaveRenderer>;
let activeWave: { root: HTMLElement; destroy: () => void } | undefined;

function mountWave(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>(".mp-wave-canvas");
  const button = root.querySelector<HTMLButtonElement>(".mp-wave-motion");
  if (!canvas || !button) return;

  const listeners = new AbortController();
  const { signal } = listeners;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cards = Array.from(root.querySelectorAll<HTMLElement>(".home-secondary-card"));
  let renderer: WaveRenderer | undefined;
  let paused = reducedMotion.matches;
  let visible = false;
  let destroyed = false;
  let frameId = 0;
  let lastTime = 0;
  let elapsed = 5;
  let pointer: { x: number; y: number } | undefined;
  let pointerDirty = false;
  let targetX = 0;
  let targetY = 0;
  let smoothX = 0;
  let smoothY = 0;

  function updateButton() {
    const key = paused ? "benefits_wave_resume" : "benefits_wave_pause";
    bindAttribute(button, "aria-label", key);
    bindAttribute(button, "title", key);
    button!.dataset.paused = String(paused);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const width = Math.max(1, Math.round(root.clientWidth * dpr));
    const height = Math.max(1, Math.round(root.clientHeight * dpr));
    if (canvas!.width !== width || canvas!.height !== height) {
      canvas!.width = width;
      canvas!.height = height;
    }
    renderer?.draw(elapsed, smoothX, smoothY);
  }

  function createRenderer() {
    try {
      renderer = createBenefitsWaveRenderer(canvas!);
      resize();
      root.dataset.renderer = "webgl";
      button!.hidden = false;
    } catch {
      // The decorative effect must never prevent reading or using the carousel.
      renderer?.dispose();
      renderer = undefined;
      root.dataset.renderer = "fallback";
      button!.hidden = true;
    }
  }

  function resetPointer() {
    pointer = undefined;
    pointerDirty = false;
    targetX = targetY = 0;
    cards.forEach(card => {
      card.style.removeProperty("--mp-glare-x");
      card.style.removeProperty("--mp-glare-y");
    });
  }

  function updatePointer() {
    if (!pointerDirty || !pointer) return;
    pointerDirty = false;
    const bounds = root.getBoundingClientRect();
    const cardBounds = cards.map(card => card.getBoundingClientRect());
    targetX = (pointer.x - bounds.left) / bounds.width * 2 - 1;
    targetY = 1 - (pointer.y - bounds.top) / bounds.height * 2;
    // Batch layout reads before applying the glare, at most once per frame.
    cards.forEach((card, index) => {
      const rect = cardBounds[index];
      card.style.setProperty("--mp-glare-x", `${(pointer!.x - rect.left) / rect.width * 100}%`);
      card.style.setProperty("--mp-glare-y", `${(pointer!.y - rect.top) / rect.height * 100}%`);
    });
  }

  function frame(now: number) {
    frameId = 0;
    if (destroyed || !root.isConnected || !renderer) return;
    const delta = Math.min((now - lastTime) / 1000, .05);
    lastTime = now;
    elapsed += delta;
    updatePointer();
    const smoothing = 1 - Math.exp(-delta * 2.5);
    smoothX += (targetX - smoothX) * smoothing;
    smoothY += (targetY - smoothY) * smoothing;
    renderer.draw(elapsed, smoothX, smoothY);
    frameId = requestAnimationFrame(frame);
  }

  function syncAnimation() {
    cancelAnimationFrame(frameId);
    frameId = 0;
    if (destroyed || !visible || document.hidden || paused || !renderer) return;
    lastTime = performance.now();
    frameId = requestAnimationFrame(frame);
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    // Allocate the GPU resources only when this band first enters the viewport.
    if (visible && !root.dataset.renderer) createRenderer();
    syncAnimation();
  });
  const sizeObserver = new ResizeObserver(resize);
  intersection.observe(root);
  sizeObserver.observe(root);

  button.addEventListener("click", () => {
    paused = !paused;
    updateButton();
    syncAnimation();
  }, { signal });
  reducedMotion.addEventListener("change", event => {
    paused = event.matches;
    resetPointer();
    updateButton();
    syncAnimation();
  }, { signal });
  document.addEventListener("visibilitychange", syncAnimation, { signal });
  root.addEventListener("pointermove", event => {
    if (paused || reducedMotion.matches || event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY };
    pointerDirty = true;
  }, { passive: true, signal });
  root.addEventListener("pointerleave", resetPointer, { signal });
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    renderer = undefined;
    root.dataset.renderer = "fallback";
    button.hidden = true;
    syncAnimation();
  }, { signal });
  canvas.addEventListener("webglcontextrestored", () => {
    createRenderer();
    syncAnimation();
  }, { signal });
  updateButton();

  return {
    root,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frameId);
      listeners.abort();
      intersection.disconnect();
      sizeObserver.disconnect();
      resetPointer();
      renderer?.dispose();
      delete root.dataset.renderer;
      button.hidden = true;
    },
  };
}

function initializeWave() {
  const root = document.getElementById("myperol-benefits-wave");
  if (root && activeWave?.root === root) return;
  activeWave?.destroy();
  activeWave = root ? mountWave(root) : undefined;
}

initializeWave();
document.addEventListener("astro:page-load", initializeWave);
document.addEventListener("astro:before-swap", () => {
  activeWave?.destroy();
  activeWave = undefined;
});
