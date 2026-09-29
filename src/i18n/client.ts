import es from "./json/es.json";

export const supportedLanguages = ["es", "en", "de", "fr", "ru", "uk"] as const;
export type Language = typeof supportedLanguages[number];
export type MessageParams = Record<string, string | number>;
export const messages: Record<string, Record<string, string>> = { es };
const loaders = {
  en: () => import("./json/en.json"), de: () => import("./json/de.json"),
  fr: () => import("./json/fr.json"), ru: () => import("./json/ru.json"),
  uk: () => import("./json/uk.json"),
};
const pending = new Map<Language, Promise<void>>();

export function normalizeLanguage(value: unknown): Language {
  return supportedLanguages.includes(value as Language) ? value as Language : "es";
}

export function currentLanguage(): Language {
  return normalizeLanguage(document.documentElement.lang);
}

export function loadLanguage(language: Language): Promise<void> {
  if (language === "es" || messages[language]) return Promise.resolve();
  if (!pending.has(language)) {
    pending.set(language, loaders[language]().then(module => {
      messages[language] = module.default;
    }).finally(() => pending.delete(language)));
  }
  return pending.get(language)!;
}

export function t(key: string, params: MessageParams = {}): string {
  const template = messages[currentLanguage()]?.[key] ?? messages.es[key];
  if (template === undefined) throw new Error(`Unknown translation key: ${key}`);
  return template.replace(/\{(\w+)\}/g, (token, name) => String(params[name] ?? token));
}

export function bindText(element: Element | null, key: string, params: MessageParams = {}) {
  if (!element) return;
  element.setAttribute("data-i18n", key);
  element.setAttribute("data-i18n-params", JSON.stringify(params));
  element.textContent = t(key, params);
}

export function bindAttribute(element: Element | null, attribute: string, key: string, params: MessageParams = {}) {
  if (!element) return;
  element.setAttribute(`data-i18n-${attribute}`, key);
  element.setAttribute("data-i18n-params", JSON.stringify(params));
  element.setAttribute(attribute, t(key, params));
}

export function clearTranslation(element: Element | null) {
  if (!element) return;
  element.removeAttribute("data-i18n");
  element.removeAttribute("data-i18n-params");
  element.textContent = "";
}

export function applyTranslations(root: ParentNode = document) {
  const paramsFor = (element: Element): MessageParams => JSON.parse(element.getAttribute("data-i18n-params") || "{}");
  root.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.getAttribute("data-i18n")!, paramsFor(element));
  });
  // HTML is limited to trusted, checked-in dictionary markup, never user input.
  root.querySelectorAll("[data-i18n-html]").forEach(element => {
    element.innerHTML = t(element.getAttribute("data-i18n-html")!);
  });
  for (const attribute of ["aria-label", "alt", "title", "placeholder", "content"]) {
    root.querySelectorAll(`[data-i18n-${attribute}]`).forEach(element => {
      element.setAttribute(attribute, t(element.getAttribute(`data-i18n-${attribute}`)!, paramsFor(element)));
    });
  }
  // Preserve functional child nodes while letting translations reorder their slots.
  root.querySelectorAll("[data-i18n-template]").forEach(element => {
    const slots = new Map(Array.from(element.querySelectorAll<HTMLElement>("[data-i18n-slot]"))
      .map(slot => [slot.dataset.i18nSlot!, slot]));
    const parts = t(element.getAttribute("data-i18n-template")!).split(/(\{\w+\})/);
    element.replaceChildren(...parts.map(part => {
      const slot = /^\{\w+\}$/.test(part) ? slots.get(part.slice(1, -1)) : undefined;
      return slot ?? document.createTextNode(part);
    }));
  });
}

const currencyFormatters = new Map<Language, Intl.NumberFormat>();
export function formatCurrency(value: number): string {
  const language = currentLanguage();
  if (!currencyFormatters.has(language)) currencyFormatters.set(language, new Intl.NumberFormat(language, {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  }));
  return currencyFormatters.get(language)!.format(value);
}
