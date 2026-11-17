interface ManualRenderer {
  play(): void;
  stop(): void;
  requestRender(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

const FRAME_INTERVAL = 1000 / 60;
// Spline accumulates 32 samples to settle its temporal antialiasing.
const SETTLE_FRAMES = 32;

/** Keeps scroll updates and rendering in phase, then sleeps on a settled image. */
export function createRenderController(renderer: ManualRenderer, commit: (force: boolean) => boolean) {
  let visible = false;
  let disposed = false;
  let pending = 0;
  let forceNext = false;
  let lastDraw = -Infinity;
  let remainingFrames = 0;
  const onRendered = () => {
    remainingFrames = Math.max(0, remainingFrames - 1);
  };
  renderer.addEventListener("rendered", onRendered);
  renderer.stop();

  const flush = (time: number) => {
    pending = 0;
    if (!visible || disposed) return;
    if (time - lastDraw < FRAME_INTERVAL - 0.5) {
      pending = requestAnimationFrame(flush);
      return;
    }
    const force = forceNext;
    forceNext = false;
    if (commit(force)) remainingFrames = SETTLE_FRAMES;
    if (!remainingFrames) {
      renderer.stop();
      return;
    }
    // Keep the 60 Hz phase on 90/120/144 Hz displays instead of rounding down.
    lastDraw = time - lastDraw >= FRAME_INTERVAL * 2 ? time : lastDraw + FRAME_INTERVAL;
    renderer.requestRender();
    // A one-shot RAF scheduled by GSAP's RAF skips alternate frames when its
    // next update arrives before our pending callback. Keep the burst alive.
    pending = requestAnimationFrame(flush);
  };
  const request = (force = false) => {
    forceNext ||= force;
    if (!visible || disposed || pending) return;
    lastDraw = -Infinity;
    pending = requestAnimationFrame(flush);
    renderer.play();
  };
  const setVisible = (next: boolean) => {
    if (next === visible || (disposed && next)) return;
    visible = next;
    if (visible) request(true);
    else {
      cancelAnimationFrame(pending);
      pending = 0;
      remainingFrames = 0;
      renderer.stop();
    }
  };
  const dispose = () => {
    disposed = true;
    setVisible(false);
    renderer.removeEventListener("rendered", onRendered);
  };
  return { request, setVisible, dispose };
}
