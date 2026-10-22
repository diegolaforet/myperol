import { getCookiePreference, saveCookiePreference } from "./cookie-preferences";

const panel = document.querySelector<HTMLElement>("[data-cookie-panel]");
const optional = panel?.querySelector<HTMLInputElement>("[data-cookie-optional]");
const details = panel?.querySelector<HTMLDetailsElement>("details");

if (panel && optional && details) {
  let opener: HTMLElement | null = null;

  const showPanel = () => {
    optional.checked = getCookiePreference()?.calculator === true;
    panel.hidden = false;
  };
  const hidePanel = () => {
    const restoreFocus = panel.contains(document.activeElement);
    panel.hidden = true;
    details.open = false;
    if (restoreFocus) (opener ?? document.querySelector<HTMLElement>(".site-header a"))?.focus({ preventScroll: true });
    opener = null;
  };
  const refresh = () => {
    if (getCookiePreference()) hidePanel();
    else showPanel();
  };

  panel.querySelector("[data-cookie-accept]")?.addEventListener("click", () => saveCookiePreference(true));
  panel.querySelector("[data-cookie-reject]")?.addEventListener("click", () => saveCookiePreference(false));
  panel.querySelector("[data-cookie-save]")?.addEventListener("click", () => saveCookiePreference(optional.checked));
  document.querySelectorAll<HTMLElement>("[data-cookie-settings]").forEach(button => {
    button.hidden = false;
    button.addEventListener("click", () => {
      opener = button;
      showPanel();
      details.open = true;
      panel.focus({ preventScroll: true });
    });
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    // Dismissal is never consent; an undecided visitor keeps optional storage off.
    hidePanel();
  });
  window.addEventListener("cookie-preferences:change", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !getCookiePreference()) showPanel();
  });
  refresh();
}
