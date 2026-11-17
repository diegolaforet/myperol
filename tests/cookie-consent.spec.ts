import { test, expect } from "@playwright/test";
import { CALCULATOR_STORAGE_KEY, COOKIE_CHOICE_DAYS, COOKIE_CHOICE_KEY, COOKIE_POLICY_VERSION } from "../src/data/cookies";

test("optional storage is off until consent and rejection survives navigation", async ({ page }) => {
  await page.goto("/precios");
  await expect(page.locator("[data-cookie-panel]")).toBeVisible();
  expect(await page.evaluate(key => sessionStorage.getItem(key), CALCULATOR_STORAGE_KEY)).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("lang"))).toBeNull();
  await page.locator("[data-cookie-reject]").click();
  await page.locator("[data-price-action]").click();
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "space");
  expect(await page.evaluate(key => sessionStorage.getItem(key), CALCULATOR_STORAGE_KEY)).toBeNull();
  await page.reload();
  await expect(page.locator("[data-cookie-panel]")).toBeHidden();
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "intro");
  await page.evaluate(() => window.selectLang("en"));
  await page.locator('.site-footer a[href="/politica-cookies"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("[data-cookie-panel]")).toBeHidden();
  await expect(page.locator("#legal-title")).toHaveText("Cookie policy");
});

test("accepting restores calculator progress and withdrawal deletes only saved progress", async ({ page }) => {
  await page.goto("/precios");
  await page.locator("[data-cookie-accept]").click();
  await page.locator("[data-price-action]").click();
  await page.reload();
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "space");
  const otherTab = await page.context().newPage();
  await otherTab.goto("/politica-cookies");
  await otherTab.locator(".legal-document [data-cookie-settings]").click();
  await expect(otherTab.locator("[data-cookie-optional]")).toBeChecked();
  await otherTab.locator("[data-cookie-reject]").click();
  await expect.poll(() => page.evaluate(key => sessionStorage.getItem(key), CALCULATOR_STORAGE_KEY)).toBeNull();
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "space");
  await otherTab.close();
  await page.reload();
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "intro");
});

test("expired, obsolete and malformed choices never authorize old calculator data", async ({ page }) => {
  const lifetime = COOKIE_CHOICE_DAYS * 86400000;
  const now = Date.now();
  for (const value of [
    { version: COOKIE_POLICY_VERSION, calculator: true, savedAt: now - lifetime - 1000, expiresAt: now - 1000 },
    { version: "old-version", calculator: true, savedAt: now, expiresAt: now + lifetime },
    { version: COOKIE_POLICY_VERSION, calculator: "true", savedAt: now, expiresAt: now + lifetime },
  ]) {
    await page.goto("/politica-cookies");
    await page.evaluate(({ value, choiceKey, calculatorKey }) => {
      localStorage.setItem(choiceKey, JSON.stringify(value));
      sessionStorage.setItem(calculatorKey, JSON.stringify({ step: "2" }));
    }, { value, choiceKey: COOKIE_CHOICE_KEY, calculatorKey: CALCULATOR_STORAGE_KEY });
    await page.goto("/precios");
    await expect(page.locator("[data-cookie-panel]")).toBeVisible();
    await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "intro");
    expect(await page.evaluate(key => sessionStorage.getItem(key), CALCULATOR_STORAGE_KEY)).toBeNull();
  }
});

test("settings are opt-in and the site remains usable when storage is blocked", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => {
    // Astro's development-only toolbar itself requires localStorage.
    if (!error.stack?.includes("/dev-toolbar/")) errors.push(error.message);
  });
  await page.addInitScript(() => {
    for (const name of ["localStorage", "sessionStorage"]) {
      Object.defineProperty(window, name, { get() { throw Object.assign(new Error("Blocked"), { name: "SecurityError" }); } });
    }
  });
  await page.goto("/precios");
  await page.locator(".cookie-panel summary").click();
  await expect(page.locator("[data-cookie-optional]")).not.toBeChecked();
  await page.locator("[data-cookie-save]").click();
  await expect(page.locator("[data-cookie-panel]")).toBeHidden();
  await page.locator("[data-price-action]").click();
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "space");
  await page.locator('.site-footer a[href="/politica-cookies"]').click();
  await page.locator("[data-cookie-reject]").click();
  await page.locator(".legal-document [data-cookie-settings]").click();
  await expect(page.locator("[data-cookie-optional]")).not.toBeChecked();
  await page.locator("[data-cookie-accept]").click();
  await expect(page.locator("[data-cookie-panel]")).toBeHidden();
  expect(errors).toEqual([]);
});
