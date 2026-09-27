import { initializeFeatureCardsCarousel } from "./carousel";

for (const shell of document.querySelectorAll<HTMLElement>(".feature-cards-shell")) {
  initializeFeatureCardsCarousel(shell);
}

// Reusable transition between the video cover and the first card carousel.
const entryScrollTarget = document.querySelector("[data-entry-scroll-target]");

if (
  entryScrollTarget instanceof HTMLElement &&
  window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches
) {
  let isEntryScrollAnimating = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let entryAnimationFrame = 0;
  let lastObservedScrollY = window.scrollY;
  let isScrollbarDragging = false;
  const entryScrollDuration = 1200;
  const entryScrollTargetOffset = 0;
  const entryScrollTolerance = 12;
  const entryScrollReturnRange = 48;

  const easeInOutCubic = (progress) =>
    progress < 0.5
      ? 4 * progress * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;

  const getEntryScrollTop = () => {
    const targetTop = entryScrollTarget.getBoundingClientRect().top + window.scrollY;

    return Math.max(0, targetTop - entryScrollTargetOffset);
  };

  const animateEntryScroll = (targetTop, onComplete = () => {}) => {
    const startTop = window.scrollY;
    const distance = targetTop - startTop;
    const startTime = performance.now();
    let lastWrittenScrollY = startTop;
    isEntryScrollAnimating = true;

    const step = (currentTime) => {
      // An anchor, focus change or scroll restoration takes priority over this tween.
      if (Math.abs(window.scrollY - lastWrittenScrollY) > 2) {
        isEntryScrollAnimating = false;
        entryAnimationFrame = 0;
        return;
      }
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / entryScrollDuration, 1);
      const easedProgress = easeInOutCubic(progress);

      window.scrollTo(0, startTop + distance * easedProgress);
      lastWrittenScrollY = window.scrollY;

      if (progress < 1) {
        entryAnimationFrame = window.requestAnimationFrame(step);
      } else {
        isEntryScrollAnimating = false;
        entryAnimationFrame = 0;
        window.scrollTo(0, targetTop);
        onComplete();
      }
    };

    if (entryAnimationFrame) {
      window.cancelAnimationFrame(entryAnimationFrame);
    }

    entryAnimationFrame = window.requestAnimationFrame(step);
  };

  const scrollBetweenEntryFrames = (direction) => {
    if (isEntryScrollAnimating) return false;

    const entryScrollTop = getEntryScrollTop();

    if (direction === "down") {
      if (window.scrollY >= entryScrollTop - entryScrollTolerance) return false;

      animateEntryScroll(entryScrollTop);
      return true;
    }

    if (direction === "up") {
      const canReturnToHero =
        window.scrollY > entryScrollTolerance &&
        window.scrollY <= entryScrollTop + entryScrollReturnRange;

      if (!canReturnToHero) return false;
      animateEntryScroll(0);
      return true;
    }

    return false;
  };

  const preventInputDuringEntryScroll = (event) => {
    if (!isEntryScrollAnimating) return false;

    event.preventDefault();
    return true;
  };

  document.addEventListener(
    "wheel",
    (event) => {
      if (preventInputDuringEntryScroll(event)) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;

      const direction = event.deltaY > 0 ? "down" : "up";
      if (!scrollBetweenEntryFrames(direction)) return;

      event.preventDefault();
    },
    { passive: false, capture: true }
  );

  document.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.touches[0]?.clientX ?? 0;
      touchStartY = event.touches[0]?.clientY ?? 0;
    },
    { passive: true, capture: true }
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (preventInputDuringEntryScroll(event)) return;

      const touchX = event.touches[0]?.clientX ?? touchStartX;
      const touchY = event.touches[0]?.clientY ?? touchStartY;
      const deltaX = touchStartX - touchX;
      const deltaY = touchStartY - touchY;

      if (Math.abs(deltaY) <= 12 || Math.abs(deltaY) <= Math.abs(deltaX)) return;

      const direction = deltaY > 0 ? "down" : "up";
      if (!scrollBetweenEntryFrames(direction)) return;

      event.preventDefault();
    },
    { passive: false, capture: true }
  );

  // Wheel, touch and keys are handled above/below. Only a scrollbar drag needs
  // native scroll detection; layout anchoring and programmatic jumps do not.
  document.addEventListener("pointerdown", (event) => {
    isScrollbarDragging = event.clientX >= document.documentElement.clientWidth;
    lastObservedScrollY = window.scrollY;
  }, { passive: true });
  const stopScrollbarDetection = () => { isScrollbarDragging = false; };
  window.addEventListener("pointerup", stopScrollbarDetection, { passive: true });
  window.addEventListener("pointercancel", stopScrollbarDetection, { passive: true });

  document.addEventListener(
    "scroll",
    () => {
      if (!isScrollbarDragging || isEntryScrollAnimating) return;
      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastObservedScrollY;
      lastObservedScrollY = currentScrollY;

      if (Math.abs(scrollDelta) < 1) return;

      scrollBetweenEntryFrames(scrollDelta > 0 ? "down" : "up");
    },
    { passive: true, capture: true }
  );

  document.addEventListener("keydown", (event) => {
    if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, [contenteditable]")) return;
    const isSpaceKey = event.key === " " || event.key === "Spacebar";
    const isDownKey =
      event.key === "ArrowDown" ||
      event.key === "PageDown" ||
      (isSpaceKey && !event.shiftKey);
    const isUpKey =
      event.key === "ArrowUp" ||
      event.key === "PageUp" ||
      event.key === "Home" ||
      (isSpaceKey && event.shiftKey);

    if (!isDownKey && !isUpKey) return;
    if (preventInputDuringEntryScroll(event)) return;
    if (!scrollBetweenEntryFrames(isDownKey ? "down" : "up")) return;

    event.preventDefault();
  });

}
