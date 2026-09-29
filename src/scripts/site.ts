import { messages as i18nMessages, normalizeLanguage, loadLanguage, applyTranslations } from "../i18n/client";

import { initializeScrollReveal } from "./scroll-reveal";
import { initializeSectionControls } from "./section-controls";
import { initializeHeroVideo } from "./hero-video";
import { initializeSmoothNavigation } from "./smooth-navigation";

const normalizeLang = normalizeLanguage;
let selectedLanguage = "es";

function getLang() {
  let storedLang: string | null = null;
  try { storedLang = localStorage.getItem("lang"); } catch { /* Storage may be disabled. */ }
  const lang = normalizeLang(storedLang ?? selectedLanguage);

  if (lang !== storedLang) {
    setLang(lang);
  }

  return lang;
}

function setLang(lang) {
  selectedLanguage = normalizeLang(lang);
  try { localStorage.setItem("lang", selectedLanguage); } catch { /* Keep the selection in memory. */ }
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

let languageRequest = 0;
async function syncLanguageUI(value: string) {
  const lang = normalizeLang(value);
  const request = ++languageRequest;
  try {
    await loadLanguage(lang);
  } catch (error) {
    if (request === languageRequest) setLang(document.documentElement.lang);
    console.error("Unable to load language", lang, error);
    return;
  }
  if (request !== languageRequest) return;
  updateDocumentLang(lang);
  updateLangLabel(lang);
  markActiveLang(lang);
  applyTranslations();
  window.dispatchEvent(new Event("i18n:updated"));
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
