import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const languages = ["es", "en", "de", "fr", "ru", "uk", "pl"];
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
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html")!;
      const expected = document.createElement("div");
      expected.innerHTML = dictionary[key];
      if (el.innerHTML !== expected.innerHTML) mismatches.push(`html:${key}`);
    });
    document.querySelectorAll("[data-i18n-template]").forEach(el => {
      const key = el.getAttribute("data-i18n-template")!;
      const expected = dictionary[key]?.replace(/\{(\w+)\}/g, (token: string, name: string) =>
        el.querySelector(`[data-i18n-slot="${name}"]`)?.textContent ?? token);
      if (el.textContent !== expected) mismatches.push(`template:${key}`);
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
        const serviceNames = ["home", "garage", "business", "industry", "outdoor"];
        const allCards = page.locator(".service-card-expandable");
        await expect(allCards).toHaveCount(serviceNames.length);
        for (const [index, service] of serviceNames.entries()) {
          await expect(allCards.nth(index).locator(".feature-card-services-text"))
            .toHaveText(dictionaries[lang][`service_${service}_summary`]);
          await expect(allCards.nth(index)).toHaveAttribute("data-service-technical-key", `service_${service}_technical`);
        }
        const enabledCards = page.locator(".service-card-expandable:not([aria-disabled='true'])");
        await expect(enabledCards).toHaveCount(3);
        for (let index = 0; index < await enabledCards.count(); index++) {
          await enabledCards.nth(index).click();
          const dialog = page.locator(".service-expanded-overlay");
          await expect(dialog).toHaveClass(/is-open/);
          const key = await enabledCards.nth(index).getAttribute("data-service-technical-key");
          await expect(dialog.locator(".service-expanded-copy")).toHaveText(dictionaries[lang][key!]);
          await checkBindings(page, lang);
          const nextLanguage = languages[(languages.indexOf(lang) + 1) % languages.length];
          await page.evaluate(value => window.selectLang(value), nextLanguage);
          await expect(dialog.locator(".service-expanded-copy")).toHaveText(dictionaries[nextLanguage][key!]);
          await checkBindings(page, nextLanguage);
          await page.evaluate(value => window.selectLang(value), lang);
          await expect(dialog.locator(".service-expanded-copy")).toHaveText(dictionaries[lang][key!]);
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
    await page.evaluate(value => window.selectLang(value), nextLanguage);
    await expect(page.locator("[data-price-help-title]")).toHaveText(dictionaries[nextLanguage].help_ceramic_title);
    await page.keyboard.press("Escape");
    await page.locator('[data-ceramic-removal="no"]').click();
    await action.click();
    await page.locator('[data-condition="excelente"]').click();
    await expect(page.locator("[data-price-title]")).toHaveText(dictionaries[nextLanguage].calculator_title_condition);
    await expect(page.locator("[data-price-card]")).toHaveAttribute("data-selected-support", "ceramica-baldosa");
    await page.evaluate(value => window.selectLang(value), lang);
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
    await page.evaluate(value => window.selectLang(value), nextLanguage);
    await expect(country).toHaveText(new Intl.DisplayNames([nextLanguage], { type: "region" }).of("ZA")!);
    await page.evaluate(value => window.selectLang(value), lang);
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

  test(`${lang}: direct contact localizes validation without reviving cleared messages`, async ({ page }) => {
    await page.addInitScript(lang => localStorage.setItem("lang", lang), lang);
    await page.goto("/precios");
    await expect(page).toHaveTitle(dictionaries[lang].prices_page_title);
    await page.locator("[data-price-direct-open]").click();
    const form = page.locator("[data-price-direct-form]");
    await expect(form).toBeVisible();
    await expect(form.locator("[data-i18n='form_email_optional']")).toHaveText(dictionaries[lang].form_email_optional);
    await form.locator("[data-price-direct-submit]").click();
    await expect(form.locator(".price-direct-contact__field-error:visible"))
      .toHaveText(Array(4).fill(dictionaries[lang].form_required_error));
    await form.locator("[data-price-direct-name]").fill("Test");
    await form.locator("[data-price-direct-last-name]").fill("User");
    await form.locator("[data-price-direct-phone]").fill("600000000");
    await form.locator("input[value='Home']").check();
    await form.locator("[data-price-direct-email]").fill("invalid");
    await form.locator("[data-price-direct-submit]").click();
    await expect(form.locator(".price-direct-contact__field-error:visible")).toHaveText([dictionaries[lang].form_email_error]);
    await form.locator("[data-price-direct-email]").fill("");
    await expect(form.locator(".price-direct-contact__field-error:visible")).toHaveCount(0);
    await form.locator("[data-price-direct-submit]").click();
    await expect(form.locator("[data-price-direct-status]")).toHaveText(dictionaries[lang].calculator_direct_preview);
    await form.locator("[data-price-direct-name]").fill("Updated");
    await expect(form.locator("[data-price-direct-status]")).toHaveText("");
    const nextLanguage = languages[(languages.indexOf(lang) + 1) % languages.length];
    await page.evaluate(value => window.selectLang(value), nextLanguage);
    await expect(page.locator("html")).toHaveAttribute("lang", nextLanguage);
    await expect(form.locator("[data-price-direct-status]")).toHaveText("");
    await expect(form.locator("[data-price-direct-name]")).toHaveValue("Updated");
    await expect(form.locator("input[value='Home']")).toBeChecked();
    await checkBindings(page, nextLanguage);
  });
}

test("rapid language selection ignores stale downloads", async ({ page }) => {
  await page.route(/(?:\/_astro\/de\..*\.js|\/src\/i18n\/json\/de\.json(?:\?.*)?)$/, async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto("/precios");
  await page.waitForFunction(() => typeof window.selectLang === "function");
  await page.evaluate(() => { window.selectLang("de"); window.selectLang("fr"); });
  await expect(page).toHaveTitle(dictionaries.fr.prices_page_title);
  await page.waitForTimeout(700);
  await checkBindings(page, "fr");
  await page.reload();
  await expect(page).toHaveTitle(dictionaries.fr.prices_page_title);
});

test("language changes work when saved preferences cannot be updated", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("lang", "de");
    Storage.prototype.setItem = () => { throw new DOMException("Storage unavailable", "QuotaExceededError"); };
  });
  await page.goto("/precios");
  await expect(page).toHaveTitle(dictionaries.de.prices_page_title);
  await page.evaluate(() => window.selectLang("fr"));
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await checkBindings(page, "fr");
  for (const label of await page.locator("[data-current-lang]").all()) {
    await expect(label).toHaveText("FR");
  }
});

test("language menus apply every choice and preserve it on reload", async ({ page }) => {
  await page.goto("/");
  await page.waitForFunction(() => typeof window.selectLang === "function");
  for (const lang of languages) {
    await page.locator("#langToggle").click();
    await page.locator(`#langMenu [data-lang="${lang}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("[data-i18n='hero_identity_copy']")).toHaveText(dictionaries[lang].hero_identity_copy);
    await checkBindings(page, lang);
    for (const label of await page.locator("[data-current-lang]").all()) {
      await expect(label).toHaveText(lang.toUpperCase());
    }
    for (const option of await page.locator(`.lang-option[data-lang="${lang}"]`).all()) {
      await expect(option).toHaveAttribute("aria-pressed", "true");
    }
  }
  await page.reload();
  const lastLanguage = languages[languages.length - 1];
  await expect(page.locator("html")).toHaveAttribute("lang", lastLanguage);
  await checkBindings(page, lastLanguage);
});
