export function initializeBudgetScrollSnap() {
  const section = document.querySelector<HTMLElement>("#calculadora");
  if (!section) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const listeners = new AbortController();
  const { signal } = listeners;
  let idleTimer = 0;
  let animationFrame = 0;
  let snapped = false;
  let pointerDown = false;
  let previousDistance = section.getBoundingClientRect().top;
  let approachingSection = false;

  const getSnapRange = () => Math.min(140, innerHeight * .16);

  const cancelSnap = () => {
    window.clearTimeout(idleTimer);
    window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  };

  const alignSection = () => {
    if (snapped || !approachingSection || pointerDown || reducedMotion.matches) return;
    const distance = section.getBoundingClientRect().top;
    const activeElement = document.activeElement;
    if (
      Math.abs(distance) < 2 || Math.abs(distance) > getSnapRange() ||
      Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'))
        .some(modal => modal.getClientRects().length > 0) ||
      activeElement?.matches("input, textarea, select, [contenteditable]")
    ) return;

    // Settle once per visit; subsequent gestures always retain native scrolling.
    snapped = true;
    const startY = window.scrollY;
    const startedAt = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / 300, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      window.scrollTo({ top: startY + distance * eased, behavior: "instant" });
      animationFrame = progress < 1 ? requestAnimationFrame(animate) : 0;
    };
    animationFrame = requestAnimationFrame(animate);
  };

  window.addEventListener("scroll", () => {
    const distance = section.getBoundingClientRect().top;
    approachingSection = Math.abs(distance) < Math.abs(previousDistance);
    previousDistance = distance;
    if (animationFrame) return;
    // Re-arm on either side, including when returning from a short footer.
    if (Math.abs(distance) > getSnapRange() + 64) snapped = false;
    window.clearTimeout(idleTimer);
    if (!snapped && approachingSection && !reducedMotion.matches) {
      idleTimer = window.setTimeout(alignSection, 160);
    }
  }, { passive: true, signal });

  window.addEventListener("wheel", cancelSnap, { passive: true, signal });
  window.addEventListener("touchstart", cancelSnap, { passive: true, signal });
  window.addEventListener("keydown", cancelSnap, { signal });
  window.addEventListener("pointerdown", () => {
    pointerDown = true;
    cancelSnap();
  }, { passive: true, signal });
  window.addEventListener("pointerup", () => {
    pointerDown = false;
  }, { passive: true, signal });
  window.addEventListener("pointercancel", () => {
    pointerDown = false;
  }, { passive: true, signal });
  reducedMotion.addEventListener("change", cancelSnap, { signal });

  document.addEventListener("astro:before-swap", () => {
    cancelSnap();
    listeners.abort();
  }, { once: true, signal });
}
