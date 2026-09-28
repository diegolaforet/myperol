const section = document.querySelector<HTMLElement>("[data-flooring-scroll]");
const flooringWindow = window as Window & { flooring3DReady?: Promise<void> };

if (section) {
  const start = () => {
    observer.disconnect();
    if (!flooringWindow.flooring3DReady) {
      flooringWindow.flooring3DReady = import("./scene").then(module => module.buildSplineScroll());
      void flooringWindow.flooring3DReady.catch(() => undefined);
    }
  };
  // Prepare ahead of the stage without an idle timeout loading 3D on the hero.
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) start();
  }, { rootMargin: "600px 0px" });
  observer.observe(section);
  document.addEventListener("astro:before-swap", () => observer.disconnect(), { once: true });
}
