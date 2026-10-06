import { bindText } from "../../i18n/client";

export function initializeSystemOptions(section: HTMLElement) {
  const buttons = section.querySelectorAll<HTMLButtonElement>("[data-flooring-variant]");
  const copy = section.querySelectorAll<HTMLElement>("[data-flooring-resin-key][data-flooring-mineral-key]");
  const listeners = new AbortController();

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const variant = button.dataset.flooringVariant;
      if (variant !== "resin" && variant !== "mineral") return;

      buttons.forEach(control => control.setAttribute("aria-pressed", String(control.dataset.flooringVariant === variant)));
      copy.forEach(element => {
        const key = variant === "resin" ? element.dataset.flooringResinKey : element.dataset.flooringMineralKey;
        if (key) bindText(element, key);
      });
    }, { signal: listeners.signal });
  });

  document.addEventListener("astro:before-swap", () => listeners.abort(), { once: true, signal: listeners.signal });
}
