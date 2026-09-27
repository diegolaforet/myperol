export function initializeSectionControls() {
  const controls = document.querySelectorAll<HTMLElement>("[data-section-corner-controls]");
  document.documentElement.classList.add("section-controls-reveal-enabled");
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const control = entry.target.parentElement!;
      control.classList.toggle("is-visible", entry.isIntersecting);
      control.inert = !entry.isIntersecting;
      if (!entry.isIntersecting) {
        for (const toggle of control.querySelectorAll<HTMLElement>('.lang-button[aria-expanded="true"]')) {
          toggle.setAttribute("aria-expanded", "false");
          const menu = document.getElementById(toggle.getAttribute("aria-controls")!);
          if (menu) {
            menu.hidden = true;
            menu.classList.remove("open", "is-opening", "is-closing");
          }
        }
      }
    }
  }, { rootMargin: "0px 0px -100px 0px", threshold: 0 });
  for (const control of controls) {
    control.inert = true;
    const sentinel = document.createElement("span");
    sentinel.className = "section-corner-controls__sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    control.append(sentinel);
    observer.observe(sentinel);
  }
  const hero = document.querySelector(".hero-placeholder");
  if (hero) {
    const toneObserver = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("controls-over-light", entry.boundingClientRect.bottom <= 65);
    }, { rootMargin: "-65px 0px 0px 0px" });
    toneObserver.observe(hero);
  }
}
