export const initializeScrollReveal = () => {
  const revealItems = Array.from(document.querySelectorAll(".feature-card")).filter(
    (item) => item instanceof HTMLElement
  );

  if (!revealItems.length) return;

  document.documentElement.classList.add("reveal-enabled");

  revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-index", String(index % 5));
  });

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      root: null,
      rootMargin: "0px 0px -10% 0px",
      threshold: 0.18,
    }
  );

  const observeFrame = window.requestAnimationFrame(() => {
    revealItems.forEach((item) => revealObserver.observe(item));
  });

  document.addEventListener("astro:before-swap", () => {
    window.cancelAnimationFrame(observeFrame);
    revealObserver.disconnect();
  }, { once: true });
};
