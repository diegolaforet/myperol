import { test, expect } from "@playwright/test";

test("hero does not eagerly initialize 3D or download below-fold images", async ({ page }, testInfo) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.goto("/");
  await page.waitForTimeout(2500);
  expect(requests.some(url => url.includes(".splinecode"))).toBe(false);
  expect(requests.some(url => url.includes("placeholder-index.jpg"))).toBe(false);
  expect(requests.some(url => url.includes("video-intro-index.mov"))).toBe(false);
  expect(requests.some(url => /(?:runtime\.|splinetool)/.test(url))).toBe(false);
  const video = page.locator("video");
  await expect(video).toHaveJSProperty("paused", false);
  expect(await video.evaluate((el: HTMLVideoElement) => el.currentSrc)).toContain(testInfo.project.name === "mobile" ? "hero-720.mp4" : "hero-1080.mp4");
  await page.locator("#calculadora").scrollIntoViewIfNeeded();
  await expect(video).toHaveJSProperty("paused", true);
  await page.evaluate(() => scrollTo(0, 0));
  await expect(video).toHaveJSProperty("paused", false);
});

test("language modules update all copies and survive reload", async ({ page }) => {
  await page.goto("/");
  for (const lang of ["en", "de", "fr", "ru", "uk", "es"]) {
    await page.locator("#langToggle").click();
    await page.locator(`#langMenu [data-lang="${lang}"]`).click();
    await expect(page.locator("html")).toHaveAttribute("lang", lang);
    await expect(page.locator("[data-current-lang]").first()).toHaveText(lang.toUpperCase());
  }
  await page.locator("#langToggle").click();
  await page.locator('#langMenu [data-lang="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator('[data-i18n="nav_services"]').first()).toHaveText("Services");
});

test("section controls reveal and hide through intersection, with unique menus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Mobile retains its shared compact header without duplicate controls.");
  await page.goto("/");
  const controls = page.locator("[data-section-corner-controls]");
  await expect(controls).toHaveCount(5);
  const ids = await page.locator(".lang-menu").evaluateAll(menus => menus.map(menu => menu.id));
  expect(new Set(ids).size).toBe(ids.length);
  for (const id of ["primary-cards", "secondary-cards", "services", "calculator"]) {
    const control = page.locator(`[data-section-corner-controls="${id}"]`);
    await control.evaluate(el => el.closest("section")!.scrollIntoView());
    await expect(control).toHaveClass(/is-visible/);
    await expect(control).toHaveJSProperty("inert", false);
    await control.locator(".lang-button").click();
    await expect(control.locator(".lang-menu")).toBeVisible();
    await page.evaluate(() => scrollTo(0, 0));
    await expect(control).not.toHaveClass(/is-visible/);
    await expect(control).toHaveJSProperty("inert", true);
    await expect(control.locator(".lang-menu")).toBeHidden();
  }
});
