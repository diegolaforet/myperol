import { test, expect } from "@playwright/test";

test("footer is shared, responsive and translated without dead legal links", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of ["/", "/servicios", "/precios"]) {
    await page.goto(route);
    const footer = page.locator(".site-footer");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toHaveCount(1);
    await expect(footer).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(footer.locator('a[href="mailto:myperolepoxy@gmail.com"]')).toBeVisible();
    await expect(footer.locator('a[href="tel:+34663108027"]')).toBeVisible();
    await expect(footer.locator('a[href="https://wa.me/34663108027"]')).toBeVisible();
    await expect(footer.locator('a[href="https://www.instagram.com/myperol/"]')).toBeVisible();
    for (const social of await footer.locator(".social-link").all()) {
      await expect(social).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(social).toHaveCSS("box-shadow", "none");
    }
    await expect(footer.locator(".site-footer__legal li")).toHaveCount(3);
    await expect(footer.locator(".site-footer__legal a")).toHaveCount(0);
    await expect.poll(() => footer.locator(".site-footer__logo img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const columns = await footer.locator(".site-footer__grid").evaluate(el => getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(columns).toBe(testInfo.project.name === "mobile" ? 1 : 4);
  }

  for (const language of ["es", "en", "fr", "de", "ru", "uk"]) {
    await page.evaluate(lang => window.selectLang(lang), language);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    const footer = page.locator(".site-footer");
    const localized = await footer.evaluate(el => [...el.querySelectorAll<HTMLElement>("[data-i18n]")].every(node => {
      const params = JSON.parse(node.dataset.i18nParams || "{}");
      const value = window.I18N_MESSAGES[document.documentElement.lang][node.dataset.i18n!];
      return node.textContent === value.replace(/\{(\w+)\}/g, (_, key) => String(params[key]));
    }));
    expect(localized, language).toBe(true);
    expect(await footer.evaluate(el => [...el.querySelectorAll<HTMLElement>(".site-footer__grid > *, a, h2, small")].every(node => {
      const rect = node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth + 1 && node.scrollWidth <= node.clientWidth + 1;
    })), language).toBe(true);
  }
  await page.evaluate(() => window.selectLang("es"));
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.locator(".site-footer").screenshot({
    path: testInfo.outputPath("footer.png"),
    style: ".site-header, body > .social-float, astro-dev-toolbar { visibility: hidden !important; }",
  });
});

test("footer navigation reuses smooth scroll and cross-page section links", async ({ page }) => {
  await page.goto("/precios");
  await page.locator('.site-footer a[href="/#servicios"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.locator("#servicios").evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(3);
  await page.locator('.site-footer a[href="/#calculadora"]').click();
  await expect.poll(() => page.locator("#calculadora").evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(3);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.site-footer nav a[href="/"]').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(1);
});
