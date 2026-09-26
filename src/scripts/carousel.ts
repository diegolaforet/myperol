export const initializeFeatureCardsCarousel = (shell) => {
  if (shell.closest(".services-feature-cards, .home-primary-cards")) return;
  const track = shell.querySelector(".feature-cards-track");
  const prevButton = shell.querySelector("[data-carousel-prev]");
  const nextButton = shell.querySelector("[data-carousel-next]");
  const dotsContainer = shell.querySelector("[data-carousel-dots]");

  if (
    !(track instanceof HTMLElement) ||
    !(prevButton instanceof HTMLButtonElement) ||
    !(nextButton instanceof HTMLButtonElement) ||
    !(dotsContainer instanceof HTMLElement)
  ) return;

  const cards = Array.from(track.querySelectorAll(".feature-card")).filter(
    (card) => card instanceof HTMLElement
  );

  const dots = cards.map((_, index) => {
    const dot = document.createElement("span");
    dot.className = "feature-cards-dot";
    dot.dataset.cardIndex = String(index);
    dotsContainer.append(dot);
    return dot;
  });
  let hoveredCardIndex = null;
  let hasInitializedArrowVisibility = false;

  const updateArrowCenter = () => {
    const referenceCard = cards[0];
    if (!referenceCard) return;

    const centerY = referenceCard.offsetTop + referenceCard.offsetHeight / 2;
    shell.style.setProperty("--carousel-arrow-center-y", `${centerY}px`);
  };

  const arrowResizeObserver = new ResizeObserver(() => requestUpdate());
  arrowResizeObserver.observe(track);
  cards.forEach((card) => arrowResizeObserver.observe(card));

  const getScrollStep = () => {
    const firstCard = track.querySelector(".feature-card");
    if (!(firstCard instanceof HTMLElement)) return 460;

    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "0");
    return firstCard.offsetWidth + gap;
  };

  const updateButtons = () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    const scrollLeft = Math.max(0, track.scrollLeft);
    const previousArrowThreshold = 24;

    setArrowVisible(prevButton, scrollLeft > previousArrowThreshold);
    setArrowVisible(nextButton, scrollLeft < maxScroll - 1);
  };

  const setActiveDot = (index) => {
    const activeIndex = Math.max(0, Math.min(index, dots.length - 1));

    dots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === activeIndex);
    });
  };

  const updateActiveDotFromScroll = () => {
    if (!cards.length) return;
    if (hoveredCardIndex !== null) {
      setActiveDot(hoveredCardIndex);
      return;
    }

    const trackRect = track.getBoundingClientRect();
    let mostVisibleIndex = 0;
    let mostVisibleWidth = 0;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const visibleLeft = Math.max(cardRect.left, trackRect.left);
      const visibleRight = Math.min(cardRect.right, trackRect.right);
      const visibleWidth = Math.max(0, visibleRight - visibleLeft);

      if (visibleWidth > mostVisibleWidth) {
        mostVisibleWidth = visibleWidth;
        mostVisibleIndex = index;
      }
    });

    setActiveDot(mostVisibleIndex);
  };

  const setArrowVisible = (button, isVisible) => {
    window.clearTimeout(Number(button.dataset.hideTimeout || 0));
    const wasVisible = button.dataset.arrowVisible === "true";

    if (isVisible) {
      button.hidden = false;
      button.classList.remove("is-hiding");
      button.dataset.arrowVisible = "true";
      return;
    }

    delete button.dataset.arrowVisible;

    if (button.hidden || button.classList.contains("is-hiding")) return;

    if (!hasInitializedArrowVisibility || !wasVisible) {
      button.hidden = true;
      button.classList.remove("is-hiding");
      delete button.dataset.hideTimeout;
      return;
    }

    button.classList.add("is-hiding");
    button.dataset.hideTimeout = String(
      window.setTimeout(() => {
        if (!button.classList.contains("is-hiding")) return;

        button.hidden = true;
        button.classList.remove("is-hiding");
        delete button.dataset.hideTimeout;
      }, 220)
    );
  };

  prevButton.addEventListener("click", () => {
    track.scrollBy({ left: -getScrollStep(), behavior: "smooth" });
  });

  nextButton.addEventListener("click", () => {
    track.scrollBy({ left: getScrollStep(), behavior: "smooth" });
  });

  cards.forEach((card, index) => {
    card.addEventListener("mouseenter", () => {
      hoveredCardIndex = index;
      setActiveDot(index);
    });

    card.addEventListener("mouseleave", () => {
      hoveredCardIndex = null;
      updateActiveDotFromScroll();
    });

    card.addEventListener("focusin", () => {
      hoveredCardIndex = index;
      setActiveDot(index);
    });

    card.addEventListener("focusout", () => {
      hoveredCardIndex = null;
      updateActiveDotFromScroll();
    });
  });

  let updateFrame = 0;
  const requestUpdate = () => {
    if (updateFrame) return;
    updateFrame = requestAnimationFrame(() => {
      updateFrame = 0;
      updateButtons();
      updateActiveDotFromScroll();
      updateArrowCenter();
    });
  };
  track.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);

  updateArrowCenter();
  updateButtons();
  hasInitializedArrowVisibility = true;
  shell.classList.add("is-carousel-ready");
  updateActiveDotFromScroll();
};
