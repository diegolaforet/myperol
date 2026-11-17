import { test, expect } from "@playwright/test";

test("below-fold sections skip rendering and retain measured height", async ({ page }) => {
  await page.goto("/");
  for (const selector of ["#servicios", "#calculadora"]) {
    const section = page.locator(selector);
    expect(await section.evaluate(el => {
      const style = getComputedStyle(el);
      return { visibility: style.contentVisibility, intrinsic: style.containIntrinsicSize };
    })).toMatchObject({ visibility: "auto", intrinsic: expect.stringContaining("auto") });
    await expect.poll(() => section.evaluate(el => el.children[1].checkVisibility({ contentVisibilityAuto: true }))).toBe(false);
  }
  expect(await page.locator("[data-flooring-scroll]").evaluate(el => getComputedStyle(el).contentVisibility)).toBe("visible");
  const calculator = page.locator("#calculadora");
  await calculator.scrollIntoViewIfNeeded();
  await expect(page.locator("[data-price-action]")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const measuredHeight = await calculator.evaluate(el => el.getBoundingClientRect().height);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect.poll(() => calculator.evaluate(el => el.children[1].checkVisibility({ contentVisibilityAuto: true }))).toBe(false);
  expect(await calculator.evaluate(el => el.getBoundingClientRect().height)).toBeCloseTo(measuredHeight, 0);
});

test("glass cards animate only opacity and transforms", async ({ page }) => {
  await page.goto("/servicios");
  const card = page.locator(".service-card-expandable").first();
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveClass(/is-visible/);
  await card.hover();
  const properties = await card.evaluate(el => ({
    transition: getComputedStyle(el).transitionProperty,
    backface: getComputedStyle(el).backfaceVisibility,
    arrow: getComputedStyle(el, "::after").transitionProperty,
  }));
  expect(properties.transition.split(",").map(p => p.trim()).sort()).toEqual(["opacity", "transform"]);
  expect(properties.backface).toBe("hidden");
  expect(properties.arrow).toBe("transform");
  await page.goto("/precios");
  const calculator = page.locator("[data-price-card]");
  await expect.poll(() => calculator.evaluate(el => getComputedStyle(el).backfaceVisibility)).toBe("hidden");
  await page.locator("[data-price-action]").click();
  for (const selector of ["[data-price-action]", ".price-space-option"]) {
    const transition = await page.locator(selector).first().evaluate(el => getComputedStyle(el).transitionProperty);
    expect(transition.split(",").map(p => p.trim()).sort()).toEqual(["opacity", "transform"]);
  }
});

test("surface persistence is debounced without delaying validation", async ({ page }) => {
  await page.goto("/precios?reset=1");
  const next = page.locator("[data-price-action]");
  await next.click();
  await page.locator('[data-space="vivienda"]').click();
  await next.click();
  const immediate = await page.evaluate(() => {
    const state = window as typeof window & { storageWrites: number };
    state.storageWrites = 0;
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "myperol-price-calculator") state.storageWrites++;
      original.call(this, key, value);
    };
    const input = document.querySelector<HTMLInputElement>("[data-price-surface-input]")!;
    for (const value of ["1", "12", "123"]) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return { writes: state.storageWrites, disabled: document.querySelector<HTMLButtonElement>("[data-price-action]")!.disabled };
  });
  expect(immediate).toEqual({ writes: 0, disabled: false });
  await expect.poll(() => page.evaluate(() => (window as typeof window & { storageWrites: number }).storageWrites)).toBe(1);
  const flushed = await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("[data-price-surface-input]")!;
    input.value = "456";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    window.dispatchEvent(new PageTransitionEvent("pagehide"));
    return JSON.parse(sessionStorage.getItem("myperol-price-calculator")!).surface;
  });
  expect(flushed).toBe("456");
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => (window as typeof window & { storageWrites: number }).storageWrites)).toBe(2);
  await page.goto("/precios");
  await expect(page.locator("[data-price-surface-input]")).toHaveValue("456");
  await page.locator("[data-price-surface-input]").fill("");
  await expect(next).toBeDisabled();
});

test("calculator help still covers the viewport outside containment", async ({ page }, testInfo) => {
  for (const route of ["/precios?reset=1", "/?reset=1#calculadora"]) {
    await page.goto(route);
    const next = page.locator("[data-price-action]");
    await next.click();
    await page.locator('[data-space="vivienda"]').click();
    await next.click();
    await page.locator("[data-price-surface-input]").fill("100");
    await next.click();
    await page.locator('[data-support="hormigon"]').click();
    await next.click();
    await page.locator("[data-price-condition-help-open]").click();
    const overlay = page.locator("[data-price-help-overlay]");
    await expect(overlay).toHaveClass(/is-open/);
    const box = await overlay.boundingBox();
    expect(box!.x).toBe(0);
    expect(box!.y).toBe(0);
    expect(box!.width).toBe(page.viewportSize()!.width);
    expect(box!.height).toBe(page.viewportSize()!.height);
    await page.screenshot({ path: testInfo.outputPath(route.startsWith("/precios") ? "help-standalone.png" : "help-home.png") });
    await page.keyboard.press("Escape");
    await expect(overlay).toBeHidden();
  }
});

test("phone prefix popup can escape the contained result section", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("myperol-price-calculator", JSON.stringify({
    step: "result", selectedSpace: "vivienda", surface: "100",
    selectedSupport: "hormigon", selectedCondition: "excelente", estimatedPrice: "1000",
  })));
  await page.goto("/precios");
  await page.locator("[data-phone-prefix-button]").click();
  await expect(page.locator(".prices-page")).toHaveCSS("content-visibility", "visible");
  await page.locator('[data-phone-prefix-menu] [data-country="ZA"]').click();
  await expect(page.locator("[data-phone-prefix-value]")).toHaveValue("+27");
  await expect(page.locator(".prices-page")).toHaveCSS("content-visibility", "auto");
});

test("entry scroll yields to navigation into services", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Entry snap is desktop-only.");
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.locator("[data-entry-scroll-target]").evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(2);
  await page.mouse.wheel(0, -120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(5);
  await page.locator("#servicios").evaluate(el => el.scrollIntoView());
  await page.waitForTimeout(1600);
  await expect(page.locator('#servicios .lang-button')).toBeInViewport();
});
