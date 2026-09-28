import esMessages from "../i18n/json/es.json";

import { initializeScrollReveal } from "./scroll-reveal";
import { initializeSectionControls } from "./section-controls";
import { initializeHeroVideo } from "./hero-video";
import { initializeSmoothNavigation } from "./smooth-navigation";

const i18nMessages: Record<string, Record<string, string>> = { es: esMessages };
const languageLoaders = {
  en: () => import("../i18n/json/en.json"),
  de: () => import("../i18n/json/de.json"),
  fr: () => import("../i18n/json/fr.json"),
  ru: () => import("../i18n/json/ru.json"),
  uk: () => import("../i18n/json/uk.json"),
};

const DEFAULT_LANG = "es";
const SUPPORTED_LANGS = ["es", "en", "de", "fr", "ru", "uk"];

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : DEFAULT_LANG;
}

function getLang() {
  const storedLang = localStorage.getItem("lang");
  const lang = normalizeLang(storedLang);

  if (lang !== storedLang) {
    localStorage.setItem("lang", lang);
  }

  return lang;
}

function setLang(lang) {
  localStorage.setItem("lang", normalizeLang(lang));
}

function updateLangLabel(lang: string) {
  document.querySelectorAll("#currentLang, [data-current-lang]").forEach((label) => {
    label.textContent = lang.toUpperCase();
  });
}

function updateDocumentLang(lang) {
  document.documentElement.lang = normalizeLang(lang);
}

function setFloatingMenuOpen(menu, toggle, isOpen) {
  if (!menu) return;

  window.clearTimeout(Number(menu.dataset.closeTimeout || 0));

  if (isOpen) {
    menu.hidden = false;
    menu.classList.remove("is-closing");
    menu.classList.add("is-opening");
    window.requestAnimationFrame(() => {
      if (toggle?.getAttribute("aria-expanded") !== "true") return;
      menu.classList.add("open");
      menu.classList.remove("is-opening");
    });
  } else if (!menu.classList.contains("open")) {
    menu.hidden = true;
  } else {
    menu.classList.remove("open");
    menu.classList.add("is-closing");
    menu.dataset.closeTimeout = String(
      window.setTimeout(() => {
        if (menu.classList.contains("open")) return;

        menu.hidden = true;
        menu.classList.remove("is-closing");
        delete menu.dataset.closeTimeout;
      }, 180)
    );
  }

  if (toggle) {
    toggle.setAttribute("aria-expanded", String(isOpen));
  }
}

function getLangMenu(toggle) {
  const menuId = toggle?.getAttribute("aria-controls");
  return menuId ? document.getElementById(menuId) : null;
}

function setLangMenuOpen(toggle, isOpen) {
  setFloatingMenuOpen(getLangMenu(toggle), toggle, isOpen);
}

function toggleLangMenu(toggle = document.getElementById("langToggle")) {
  const menu = getLangMenu(toggle);
  const shouldOpen = menu ? !menu.classList.contains("open") : false;

  if (shouldOpen) {
    closeLangMenu();
    closeMobileMenu();
  }

  setLangMenuOpen(toggle, shouldOpen);
}

function closeLangMenu() {
  document.querySelectorAll('.lang-button[aria-controls][aria-expanded="true"]').forEach((toggle) => {
    setLangMenuOpen(toggle, false);
  });
}

function setMobileMenuOpen(isOpen) {
  setFloatingMenuOpen(
    document.getElementById("primaryNav"),
    document.getElementById("mobileMenuToggle"),
    isOpen
  );
}

function toggleMobileMenu() {
  const menu = document.getElementById("primaryNav");
  const shouldOpen = menu ? !menu.classList.contains("open") : false;
  if (shouldOpen) closeLangMenu();
  setMobileMenuOpen(shouldOpen);
}

function closeMobileMenu() {
  if (document.getElementById("mobileMenuToggle")?.getAttribute("aria-expanded") !== "true") return;
  setMobileMenuOpen(false);
}

function selectLang(lang) {
  setLang(normalizeLang(lang));
  closeLangMenu();
  window.dispatchEvent(new Event("language-change"));
}

function markActiveLang(lang) {
  const items = document.querySelectorAll(".lang-option");

  items.forEach((item) => {
    if (item.dataset.lang === lang) {
      item.classList.add("active");
      item.setAttribute("aria-pressed", "true");
    } else {
      item.classList.remove("active");
      item.setAttribute("aria-pressed", "false");
    }
  });
}

function getMessage(lang, key) {
  return i18nMessages[lang]?.[key] || i18nMessages.es?.[key] || "";
}

function translateTextNodes(lang) {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const value = key ? getMessage(lang, key) : "";

    if (value) el.textContent = value;
  });
}

function translateHtmlNodes(lang) {
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    const value = key ? getMessage(lang, key) : "";

    if (value) el.innerHTML = value;
  });
}

function translateAttributes(lang) {
  document.querySelectorAll("[data-i18n-aria-label]").forEach((el) => {
    const key = el.getAttribute("data-i18n-aria-label");
    const value = key ? getMessage(lang, key) : "";

    if (value) el.setAttribute("aria-label", value);
  });
}

function updateDocumentMeta(lang) {
  const title = getMessage(lang, "page_title");
  const description = getMessage(lang, "page_description");

  if (title) document.title = title;

  if (description) {
    const descriptionMeta = document.querySelector('meta[name="description"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');

    descriptionMeta?.setAttribute("content", description);
    ogDescription?.setAttribute("content", description);
    twitterDescription?.setAttribute("content", description);
  }
}

function translatePage(lang) {
  translateTextNodes(lang);
  translateHtmlNodes(lang);
  translateAttributes(lang);
  updateDocumentMeta(lang);
}

async function syncLanguageUI(lang) {
  if (!i18nMessages[lang]) {
    try {
      i18nMessages[lang] = (await languageLoaders[lang]()).default;
    } catch {
      return;
    }
    // Ignore a stale import when another language was selected meanwhile.
    if (getLang() !== lang) return;
  }
  updateDocumentLang(lang);
  updateLangLabel(lang);
  markActiveLang(lang);
  translatePage(lang);
}

function initializePage() {
  syncLanguageUI(getLang());
}

function handleLanguageChange() {
  syncLanguageUI(getLang());
}

document.addEventListener("click", (event) => {
  const dropdown = event.target instanceof Element
    ? event.target.closest(".lang-dropdown")
    : null;

  if (!dropdown) {
    closeLangMenu();
  }

  const header = document.querySelector(".site-header");
  if (header && !header.contains(event.target)) {
    closeMobileMenu();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLangMenu();
    closeMobileMenu();
  }
});


window.toggleLangMenu = toggleLangMenu;
window.selectLang = selectLang;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.I18N_MESSAGES = i18nMessages;

initializePage();
window.addEventListener("language-change", handleLanguageChange);

initializeScrollReveal();
initializeSectionControls();
initializeHeroVideo();
initializeSmoothNavigation();
