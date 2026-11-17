import { bindText } from "../../i18n/client";

export type SystemVariant = "resin" | "mineral";
export const SYSTEM_VARIANT_EVENT = "flooring:variant-change";

export function setSystemVariant(section: HTMLElement, variant: SystemVariant) {
  section.dataset.flooringVariant = variant;
  section.querySelectorAll<HTMLButtonElement>("[data-flooring-variant]").forEach(control => {
    control.setAttribute("aria-pressed", String(control.dataset.flooringVariant === variant));
  });
  section.querySelectorAll<HTMLElement>("[data-flooring-resin-key][data-flooring-mineral-key]").forEach(element => {
    const key = variant === "resin" ? element.dataset.flooringResinKey : element.dataset.flooringMineralKey;
    if (key) bindText(element, key);
  });
}

export function initializeSystemOptions(section: HTMLElement) {
  const buttons = section.querySelectorAll<HTMLButtonElement>("[data-flooring-variant]");
  const listeners = new AbortController();
  section.dataset.flooringVariant = "resin";

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      const variant = button.dataset.flooringVariant;
      if (variant !== "resin" && variant !== "mineral") return;

      setSystemVariant(section, variant);
      section.dispatchEvent(new CustomEvent(SYSTEM_VARIANT_EVENT));
    }, { signal: listeners.signal });
  });

  document.addEventListener("astro:before-swap", () => listeners.abort(), { once: true, signal: listeners.signal });
}
