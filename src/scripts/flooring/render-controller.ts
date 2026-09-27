interface ManualRenderer {
  play(): void;
  stop(): void;
  requestRender(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

/** Coalesces scroll updates; the engine sleeps outside a render burst. */
export function createRenderController(renderer: ManualRenderer, commit: (force: boolean) => boolean) {
  let visible = false;
  let disposed = false;
  let pending = 0;
  let forceNext = false;
  let lastDraw = -Infinity;
  let idleTimer = 0;
  const frameInterval = 1000 / 60;
  const stopWhenIdle = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => renderer.stop(), 120);
  };
  renderer.addEventListener("rendered", stopWhenIdle);
  renderer.stop();

  const flush = (time: number) => {
    pending = 0;
    if (!visible || disposed) return;
    if (time - lastDraw < frameInterval - 0.5) {
      pending = requestAnimationFrame(flush);
      return;
    }
    const force = forceNext;
    forceNext = false;
    if (!commit(force)) return;
    // Keep the 60 Hz phase on 90/120/144 Hz displays instead of rounding down.
    lastDraw = time - lastDraw >= frameInterval * 2 ? time : lastDraw + frameInterval;
    window.clearTimeout(idleTimer);
    renderer.play();
    renderer.requestRender();
  };
  const request = (force = false) => {
    forceNext ||= force;
    if (!visible || disposed || pending) return;
    pending = requestAnimationFrame(flush);
  };
  const setVisible = (next: boolean) => {
    visible = next;
    if (visible) request(true);
    else {
      cancelAnimationFrame(pending);
      window.clearTimeout(idleTimer);
      pending = 0;
      renderer.stop();
    }
  };
  const dispose = () => {
    disposed = true;
    setVisible(false);
    renderer.removeEventListener("rendered", stopWhenIdle);
  };
  return { request, setVisible, dispose };
}
