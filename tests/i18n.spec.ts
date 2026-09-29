import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const languages = ["es", "en", "de", "fr", "ru", "uk"];
const dictionaries = Object.fromEntries(languages.map(lang => [
  lang, JSON.parse(readFileSync(`src/i18n/json/${lang}.json`, "utf8")),
]));
async function checkBindings(page: Page, lang: string) {
  const errors = await page.evaluate(dictionary => {
    const mismatches: string[] = [];
    const translated = (key: string, element: Element) => {
      const params = JSON.parse(element.getAttribute("data-i18n-params") || "{}");
      return dictionary[key]?.replace(/\{(\w+)\}/g, (token: string, name: string) => params[name] ?? token);
    };
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n")!;
      if (el.textContent !== translated(key, el)) mismatches.push(key);
    });
    for (const attr of ["aria-label", "placeholder", "content", "alt", "title"]) {
      document.querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
        const key = el.getAttribute(`data-i18n-${attr}`)!;
        if (el.getAttribute(attr) !== translated(key, el)) mismatches.push(`${attr}:${key}`);
      });
    }
    return mismatches;
  }, dictionaries[lang]);
  expect(errors).toEqual([]);
}

for (const lang of languages) {
  test(`${lang}: all routes, service details and metadata use the selected language`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.addInitScript(lang => localStorage.setItem("lang", lang), lang);
    for (const [path, title] of [["/", "page_title"], ["/servicios", "services_page_title"], ["/precios", "prices_page_title"]]) {
      await page.goto(path);
      await expect(page).toHaveTitle(dictionaries[lang][title]);
      await checkBindings(page, lang);
      if (path !== "/precios") {
        const cards = page.locator(".service-card-expandable");
        for (let index = 0; index < 5; index++) {
          await cards.nth(index).click();
          const dialog = page.locator(".service-expanded-overlay");
          await expect(dialog).toHaveClass(/is-open/);
          const key = await cards.nth(index).getAttribute("data-service-technical-key")
            || await cards.nth(index).locator("[data-i18n]").getAttribute("data-i18n");
          await expect(dialog.locator(".service-expanded-copy")).toHaveText(dictionaries[lang][key!]);
          await checkBindings(page, lang);
          await dialog.locator(".service-expanded-close").click();
          await expect(dialog).toHaveCount(0);
        }
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    expect(errors).toEqual([]);
  });

  test(`${lang}: calculator preserves answers across language changes and localizes submission`, async ({ page }, testInfo) => {
    await page.addInitScript(lang => localStorage.setItem("lang", lang), lang);
    await page.goto("/precios");
    await expect(page).toHaveTitle(dictionaries[lang].prices_page_title);
    const action = page.locator("[data-price-action]");
    await action.click();
    await page.locator('[data-space="vivienda"]').click();
    await action.click();
    await page.locator("[data-price-surface-input]").fill("100");
    await action.click();
    await page.locator('[data-support="ceramica-baldosa"]').click();
    await action.click();
    await page.locator("[data-price-help-open]").click();
    await expect(page.locator("[data-price-help-title]")).toHaveText(dictionaries[lang].help_ceramic_title);
    const nextLanguage = languages[(languages.indexOf(lang) + 1) % languages.length];
    await page.evaluate(value => (window as any).selectLang(value), nextLanguage);
    await expect(page.locator("[data-price-help-title]")).toHaveText(dictionaries[nextLanguage].help_ceramic_title);
    await page.keyboard.press("Escape");
    await page.locator('[data-ceramic-removal="no"]').click();
    await action.click();
    await page.locator('[data-condition="excelente"]').click();
    await expect(page.locator("[data-price-title]")).toHaveText(dictionaries[nextLanguage].calculator_title_condition);
    await expect(page.locator("[data-price-card]")).toHaveAttribute("data-selected-support", "ceramica-baldosa");
    await page.evaluate(value => (window as any).selectLang(value), lang);
    await expect(page.locator("[data-price-title]")).toHaveText(dictionaries[lang].calculator_title_condition);
    await page.screenshot({ path: testInfo.outputPath(`condition-${lang}.png`) });
    await action.click();
    await expect(page.locator("[data-price-estimate]")).toBeVisible();
    await expect(page.locator(".price-estimate-status")).toHaveText(dictionaries[lang].estimate_status);
    await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "result");
    await expect(page.locator("[data-price-card]")).toHaveAttribute("data-estimated-price", "1000");
    const money = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
    const expectedRange = dictionaries[lang].result_range.replace("{min}", money.format(900)).replace("{max}", money.format(1100));
    await expect(page.locator("[data-price-result-amount]")).toHaveText(expectedRange);
    await expect(page.locator("[data-price-result-space]")).toHaveText(dictionaries[lang].space_home);
    await page.locator("[data-phone-prefix-button]").click();
    const country = page.locator('[data-country="ZA"] .phone-prefix-option-country');
    await expect(country).toHaveText(new Intl.DisplayNames([lang], { type: "region" }).of("ZA")!);
    await page.evaluate(value => (window as any).selectLang(value), nextLanguage);
    await expect(country).toHaveText(new Intl.DisplayNames([nextLanguage], { type: "region" }).of("ZA")!);
    await page.evaluate(value => (window as any).selectLang(value), lang);
    await expect(country).toHaveText(new Intl.DisplayNames([lang], { type: "region" }).of("ZA")!);
    await page.locator('[data-country="ZA"]').click();
    await page.locator("[data-price-result-name]").fill("Test User");
    await page.locator("[data-price-result-phone]").fill("600000000");
    await page.route("**/.netlify/functions/price-request", route => route.fulfill({ status: 500, json: { error: "Internal Spanish server message" } }));
    await page.locator("[data-price-result-submit]").click();
    await expect(page.locator("[data-price-result-status]")).toHaveText(dictionaries[lang].request_error);
    await page.unroute("**/.netlify/functions/price-request");
    await page.route("**/.netlify/functions/price-request", route => route.fulfill({ json: { ok: true } }));
    await page.locator("[data-price-result-submit]").click();
    await expect(page.locator("[data-price-result-status]")).toHaveText(dictionaries[lang].request_success);
    await checkBindings(page, lang);
    await page.screenshot({ path: testInfo.outputPath(`result-${lang}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test("rapid language selection ignores stale downloads", async ({ page }) => {
  await page.route(/\/_astro\/de\..*\.js$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto("/precios");
  await page.evaluate(() => { (window as any).selectLang("de"); (window as any).selectLang("fr"); });
  await expect(page).toHaveTitle(dictionaries.fr.prices_page_title);
  await page.waitForTimeout(700);
  await checkBindings(page, "fr");
  await page.reload();
  await expect(page).toHaveTitle(dictionaries.fr.prices_page_title);
});
