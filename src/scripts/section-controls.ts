export function initializeSectionControls() {
  const controls = document.querySelectorAll<HTMLElement>("[data-section-corner-controls]");
  const observers: IntersectionObserver[] = [];
  document.documentElement.classList.add("section-controls-reveal-enabled");
  const closeLanguageMenus = (scope: ParentNode = document) => {
    for (const toggle of scope.querySelectorAll<HTMLElement>('.lang-button[aria-expanded="true"]')) {
      toggle.setAttribute("aria-expanded", "false");
      const menu = document.getElementById(toggle.getAttribute("aria-controls")!);
      if (menu) {
        menu.hidden = true;
        menu.classList.remove("open", "is-opening", "is-closing");
      }
    }
  };
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const control = entry.target.parentElement!;
      control.classList.toggle("is-visible", entry.isIntersecting);
      control.inert = !entry.isIntersecting;
      if (!entry.isIntersecting) {
        closeLanguageMenus(control);
      }
    }
  }, { rootMargin: "0px 0px -100px 0px", threshold: 0 });
  observers.push(observer);
  for (const control of controls) {
    control.inert = true;
    const sentinel = document.createElement("span");
    sentinel.className = "section-corner-controls__sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    control.append(sentinel);
    observer.observe(sentinel);
  }
  const controlsExclusion = document.querySelector<HTMLElement>("[data-floating-controls-exclusion]");
  if (controlsExclusion) {
    const primaryControls = [
      document.querySelector<HTMLElement>(".site-header .language-control"),
      document.querySelector<HTMLElement>("body > .social-float"),
    ].filter((element): element is HTMLElement => element instanceof HTMLElement);
    const exclusionObserver = new IntersectionObserver(([entry]) => {
      const suppressed = entry.isIntersecting;
      document.body.classList.toggle("floating-controls-suppressed", suppressed);
      primaryControls.forEach(element => { element.inert = suppressed; });
      if (suppressed) closeLanguageMenus();
    }, { threshold: 0 });
    observers.push(exclusionObserver);
    exclusionObserver.observe(controlsExclusion);
  }
  const hero = document.querySelector(".hero-placeholder");
  if (hero) {
    const toneObserver = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("controls-over-light", entry.boundingClientRect.bottom <= 65);
    }, { rootMargin: "-65px 0px 0px 0px" });
    observers.push(toneObserver);
    toneObserver.observe(hero);
  }
  const calculator = document.querySelector<HTMLElement>("#calculadora");
  if (calculator) {
    const calculatorToneObserver = new IntersectionObserver(([entry]) => {
      document.body.classList.toggle("controls-over-calculator", entry.isIntersecting);
    }, { rootMargin: "-65px 0px -55% 0px", threshold: 0 });
    observers.push(calculatorToneObserver);
    calculatorToneObserver.observe(calculator);
  }

  document.addEventListener("astro:before-swap", () => {
    observers.forEach(currentObserver => currentObserver.disconnect());
  }, { once: true });
}
