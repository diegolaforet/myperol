export const initializeFeatureCardsCarousel = (shell: HTMLElement) => {
  if (shell.closest(".services-feature-cards, .home-primary-cards")) return;
  const track = shell.querySelector<HTMLElement>(".feature-cards-track");
  const prevButton = shell.querySelector<HTMLButtonElement>("[data-carousel-prev]");
  const nextButton = shell.querySelector<HTMLButtonElement>("[data-carousel-next]");
  const dotsContainer = shell.querySelector<HTMLElement>("[data-carousel-dots]");
  if (!track || !prevButton || !nextButton || !dotsContainer || shell.classList.contains("is-carousel-ready")) return;

  const cards = Array.from(track.querySelectorAll<HTMLElement>(".feature-card"));
  const dots = cards.map((_, index) => {
    const dot = document.createElement("span");
    dot.className = "feature-cards-dot";
    dot.dataset.cardIndex = String(index);
    return dot;
  });
  dotsContainer.replaceChildren(...dots);

  const listeners = new AbortController();
  const { signal } = listeners;
  const arrowVisibility = new Map<HTMLButtonElement, boolean>();
  const hideTimers = new Map<HTMLButtonElement, number>();
  let hoveredCardIndex: number | null = null;
  let activeDotIndex = -1;
  let updateFrame = 0;
  let geometryDirty = true;
  let scrollStep = 460;
  let arrowCenter = "";

  const setActiveDot = (index: number) => {
    const nextIndex = Math.max(0, Math.min(index, dots.length - 1));
    if (activeDotIndex === nextIndex) return;
    dots[activeDotIndex]?.classList.remove("is-active");
    dots[nextIndex]?.classList.add("is-active");
    activeDotIndex = nextIndex;
  };

  const setArrowVisible = (button: HTMLButtonElement, visible: boolean) => {
    const previous = arrowVisibility.get(button);
    if (previous === visible) return;
    arrowVisibility.set(button, visible);
    window.clearTimeout(hideTimers.get(button));
    hideTimers.delete(button);
    button.classList.remove("is-hiding");

    if (visible) {
      button.hidden = false;
      button.dataset.arrowVisible = "true";
    } else {
      delete button.dataset.arrowVisible;
      if (previous === undefined || button.hidden) {
        button.hidden = true;
      } else {
        button.classList.add("is-hiding");
        hideTimers.set(button, window.setTimeout(() => {
          button.hidden = true;
          button.classList.remove("is-hiding");
          hideTimers.delete(button);
        }, 220));
      }
    }
  };

  const update = () => {
    updateFrame = 0;
    // Read all geometry before changing classes or custom properties.
    const maxScroll = track.scrollWidth - track.clientWidth;
    const scrollLeft = Math.max(0, track.scrollLeft);
    let nextCenter = arrowCenter;
    if (geometryDirty && cards[0]) {
      const card = cards[0];
      const styles = getComputedStyle(track);
      scrollStep = card.offsetWidth + (Number.parseFloat(styles.columnGap || styles.gap) || 0);
      nextCenter = `${card.offsetTop + card.offsetHeight / 2}px`;
      geometryDirty = false;
    }

    let nextDot = hoveredCardIndex ?? 0;
    if (hoveredCardIndex === null && cards.length) {
      const trackRect = track.getBoundingClientRect();
      let mostVisibleWidth = 0;
      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const visibleWidth = Math.max(0, Math.min(rect.right, trackRect.right) - Math.max(rect.left, trackRect.left));
        if (visibleWidth > mostVisibleWidth) {
          mostVisibleWidth = visibleWidth;
          nextDot = index;
        }
      });
    }

    setArrowVisible(prevButton, scrollLeft > 24);
    setArrowVisible(nextButton, scrollLeft < maxScroll - 1);
    setActiveDot(nextDot);
    if (nextCenter !== arrowCenter) {
      arrowCenter = nextCenter;
      shell.style.setProperty("--carousel-arrow-center-y", arrowCenter);
    }
  };
  const requestUpdate = () => {
    if (!updateFrame) updateFrame = requestAnimationFrame(update);
  };
  const invalidateGeometry = () => {
    geometryDirty = true;
    requestUpdate();
  };
  const resizeObserver = new ResizeObserver(invalidateGeometry);
  resizeObserver.observe(track);
  cards.forEach(card => resizeObserver.observe(card));

  prevButton.addEventListener("click", () => track.scrollBy({ left: -scrollStep, behavior: "smooth" }), { signal });
  nextButton.addEventListener("click", () => track.scrollBy({ left: scrollStep, behavior: "smooth" }), { signal });
  cards.forEach((card, index) => {
    const activate = () => {
      hoveredCardIndex = index;
      setActiveDot(index);
    };
    const deactivate = () => {
      hoveredCardIndex = null;
      requestUpdate();
    };
    card.addEventListener("mouseenter", activate, { signal });
    card.addEventListener("focusin", activate, { signal });
    card.addEventListener("mouseleave", deactivate, { signal });
    card.addEventListener("focusout", deactivate, { signal });
  });
  track.addEventListener("scroll", requestUpdate, { passive: true, signal });
  window.addEventListener("resize", invalidateGeometry, { passive: true, signal });

  const dispose = () => {
    listeners.abort();
    resizeObserver.disconnect();
    cancelAnimationFrame(updateFrame);
    hideTimers.forEach(timer => window.clearTimeout(timer));
  };
  window.addEventListener("pagehide", event => { if (!event.persisted) dispose(); }, { signal });
  document.addEventListener("astro:before-swap", dispose, { once: true, signal });
  update();
  shell.classList.add("is-carousel-ready");
};
