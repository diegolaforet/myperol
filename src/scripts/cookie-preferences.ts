import { CALCULATOR_STORAGE_KEY, COOKIE_CHOICE_DAYS, COOKIE_CHOICE_KEY, COOKIE_POLICY_VERSION } from "../data/cookies";

interface CookiePreference {
  version: string;
  calculator: boolean;
  savedAt: number;
  expiresAt: number;
}

const lifetime = COOKIE_CHOICE_DAYS * 24 * 60 * 60 * 1000;

function clearCalculatorStorage() {
  try { sessionStorage.removeItem(CALCULATOR_STORAGE_KEY); } catch { /* Storage can be disabled. */ }
}

function readPreference(): CookiePreference | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(COOKIE_CHOICE_KEY) || "null");
    if (value && typeof value === "object" && "version" in value && "calculator" in value
      && "savedAt" in value && "expiresAt" in value
      && value.version === COOKIE_POLICY_VERSION && typeof value.calculator === "boolean"
      && typeof value.savedAt === "number" && typeof value.expiresAt === "number"
      && Number.isFinite(value.savedAt) && value.savedAt > 0 && value.savedAt <= Date.now()
      && value.expiresAt === value.savedAt + lifetime && value.expiresAt > Date.now()) {
      return { version: value.version, calculator: value.calculator, savedAt: value.savedAt, expiresAt: value.expiresAt };
    }
  } catch { /* Invalid or unavailable storage must never enable optional persistence. */ }
  try { localStorage.removeItem(COOKIE_CHOICE_KEY); } catch { /* Keep the default in memory. */ }
  return null;
}

let preference = readPreference();
if (!preference?.calculator) clearCalculatorStorage();

export function getCookiePreference(): CookiePreference | null {
  if (preference && preference.expiresAt <= Date.now()) {
    preference = null;
    try { localStorage.removeItem(COOKIE_CHOICE_KEY); } catch { /* Storage can be disabled. */ }
    clearCalculatorStorage();
  }
  return preference;
}

export function allowsCalculatorStorage() {
  return getCookiePreference()?.calculator === true;
}

export function saveCookiePreference(calculator: boolean) {
  const now = Date.now();
  preference = { version: COOKIE_POLICY_VERSION, calculator, savedAt: now, expiresAt: now + lifetime };
  try { localStorage.setItem(COOKIE_CHOICE_KEY, JSON.stringify(preference)); } catch { /* Honor the choice in this page when persistence is blocked. */ }
  if (!calculator) clearCalculatorStorage();
  window.dispatchEvent(new Event("cookie-preferences:change"));
}

window.addEventListener("storage", (event) => {
  if (event.key !== COOKIE_CHOICE_KEY && event.key !== null) return;
  preference = readPreference();
  if (!preference?.calculator) clearCalculatorStorage();
  window.dispatchEvent(new Event("cookie-preferences:change"));
});
