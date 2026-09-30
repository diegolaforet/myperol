import { bindText, bindAttribute, applyTranslations } from "../i18n/client";

export function enhanceServiceDialog(overlay: HTMLElement, trigger: HTMLElement, close: () => void) {
  const dialog = overlay.querySelector<HTMLElement>('[role="dialog"]');
  if (!dialog) return () => {};
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "service-expanded-close";
  bindAttribute(closeButton, "aria-label", "common_close");
  closeButton.textContent = "\u00d7";
  closeButton.addEventListener("click", close);
  dialog.prepend(closeButton);

  const trapFocus = (event: KeyboardEvent) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), a[href], [tabindex='0']"));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  overlay.addEventListener("keydown", trapFocus);
  const focusFrame = requestAnimationFrame(() => closeButton.focus({ preventScroll: true }));
  overlay.querySelector(".service-expanded-composition")?.addEventListener("click", () => {
    close();
    window.location.assign("/#mp-systems");
  });

  return () => {
    cancelAnimationFrame(focusFrame);
    overlay.removeEventListener("keydown", trapFocus);
    trigger.focus({ preventScroll: true });
  };
}

export function initializeServiceCards(selector: string, priceActionKey: string) {
  const cards = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (!cards.length) return;

  const listeners = new AbortController();
  const { signal } = listeners;
  let activeOverlay: HTMLElement | null = null;
  let isClosing = false;
  let restoreDialog = () => {};
  let restoreBackground = () => {};

  const closeExpandedCard = () => {
    const overlay = activeOverlay;
    if (!overlay || isClosing) return;

    isClosing = true;
    overlay.classList.add("is-closing");
    overlay.classList.remove("is-open");

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      overlay.remove();
      restoreBackground();
      restoreDialog();
      activeOverlay = null;
      isClosing = false;
    };

    overlay.addEventListener("transitionend", (event) => {
      if (event.target === overlay && event.propertyName === "opacity") finish();
    });
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else window.setTimeout(finish, 240);
  };

  const openExpandedCard = (card: HTMLElement) => {
    if (activeOverlay || isClosing) return;

    const label = card.querySelector(".service-card-label-text, .service-card-media > span")?.textContent?.trim() || "MyPerol";
    const title = card.querySelector("h2")?.textContent?.trim() || "";
    const image = card.querySelector<HTMLImageElement>(".service-card-image");
    const priceSpace = card.dataset.priceSpace || "";

    const overlay = document.createElement("div");
    overlay.className = "service-expanded-overlay";
    overlay.innerHTML = `
      <article class="service-expanded-card" role="dialog" aria-modal="true" aria-labelledby="service-dialog-title">
        <div class="service-expanded-media">
          <div class="service-expanded-media-frame"><img alt="" aria-hidden="true" /></div>
          <p class="service-expanded-summary"></p>
        </div>
        <div class="service-expanded-content">
          <p class="service-expanded-label"></p>
          <h2 class="service-expanded-title" id="service-dialog-title"></h2>
          <p class="service-expanded-copy" role="region" data-i18n-aria-label="service_details" tabindex="0"></p>
          <div class="service-expanded-actions">
            <button class="service-expanded-action" type="button" data-service-price-space=""></button>
            <button class="service-expanded-composition" type="button"><span class="composition-shift-label" data-i18n="service_composition"></span><span class="composition-shift-arrow" aria-hidden="true">&rarr;</span></button>
          </div>
        </div>
      </article>
    `;
    overlay.querySelector<HTMLElement>(".service-expanded-label")!.textContent = label;
    overlay.querySelector<HTMLElement>(".service-expanded-title")!.textContent = title;
    bindText(overlay.querySelector(".service-expanded-summary"), card.querySelector<HTMLElement>(".feature-card-services-text")!.dataset.i18n!);
    bindText(overlay.querySelector(".service-expanded-copy"), card.dataset.serviceTechnicalKey || card.querySelector<HTMLElement>(".feature-card-services-text")!.dataset.i18n!);

    const expandedImage = overlay.querySelector<HTMLImageElement>(".service-expanded-media-frame img")!;
    expandedImage.src = image?.currentSrc || image?.src || "";
    if (image?.classList.contains("service-card-image-cover")) expandedImage.classList.add("service-expanded-image-cover");

    const priceButton = overlay.querySelector<HTMLButtonElement>("[data-service-price-space]")!;
    bindText(priceButton, priceActionKey);
    priceButton.dataset.servicePriceSpace = priceSpace;
    priceButton.addEventListener("click", () => {
      sessionStorage.removeItem("myperol-price-calculator");
      window.location.href = `/?reset=1&space=${encodeURIComponent(priceSpace)}#calculadora`;
    });

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeExpandedCard();
    });

    activeOverlay = overlay;
    document.body.append(overlay);
    applyTranslations(overlay);
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement => element instanceof HTMLElement && element !== overlay && !element.inert
    );
    background.forEach((element) => { element.inert = true; });
    restoreBackground = () => background.forEach((element) => { element.inert = false; });
    restoreDialog = enhanceServiceDialog(overlay, card, closeExpandedCard);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (activeOverlay === overlay) overlay.classList.add("is-open");
    }));
  };

  cards.forEach((card) => {
    if (card.dataset.expansionReady) return;
    card.dataset.expansionReady = "true";
    card.setAttribute("role", "button");
    bindAttribute(card, "aria-label", "service_open", { service: card.querySelector("h2")?.textContent?.trim() || "MyPerol" });
    card.addEventListener("click", () => openExpandedCard(card), { signal });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openExpandedCard(card);
    }, { signal });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeExpandedCard();
  }, { signal });

  document.addEventListener("astro:before-swap", () => listeners.abort(), { once: true, signal });
}
