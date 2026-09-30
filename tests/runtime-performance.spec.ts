import { test, expect } from "@playwright/test";

const savedResult = {
  step: "result", selectedSpace: "vivienda", surface: "100",
  selectedSupport: "hormigon", selectedCondition: "excelente", estimatedPrice: "1000",
};

test("calculator defers WebGL and phone options until interaction", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.addInitScript(state => sessionStorage.setItem("myperol-price-calculator", JSON.stringify(state)), savedResult);
  await page.goto("/precios");
  await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", "result");
  await page.waitForTimeout(1000);
  expect(requests.some(url => /runtime\.|\.splinecode/.test(url))).toBe(false);
  await expect(page.locator(".phone-prefix-option")).toHaveCount(0);
  await page.locator("[data-phone-prefix-button]").click();
  const options = page.locator(".phone-prefix-option");
  const count = await options.count();
  expect(count).toBeGreaterThan(80);
  await page.locator('[data-phone-prefix-menu] [data-country="ZA"]').click();
  await expect(page.locator("[data-phone-prefix-value]")).toHaveValue("+27");
  await page.locator("[data-phone-prefix-button]").click();
  await expect(options).toHaveCount(count);
  await expect(page.locator('[data-country="ZA"]')).toHaveClass(/is-selected/);
});

test("both Spline views reuse one scene request", async ({ page }) => {
  let requests = 0;
  page.on("request", request => { if (request.url().includes(".splinecode")) requests++; });
  await page.goto("/#mp-systems");
  await expect(page.locator("[data-flooring-scroll]")).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
  await page.locator("[data-price-action]").click();
  await page.waitForTimeout(800);
  expect(requests).toBe(1);
});

test("carousel arrows finish hiding while scroll events continue", async ({ page }) => {
  await page.goto("/");
  const track = page.locator(".home-secondary-cards-track");
  await track.scrollIntoViewIfNeeded();
  const previous = page.locator(".home-secondary-cards [data-carousel-prev]");
  await track.evaluate(el => el.scrollTo({ left: 400, behavior: "instant" }));
  await expect(previous).toHaveAttribute("data-arrow-visible", "true");
  // Repeated events near the edge must not cancel the pending fade-out timer.
  await track.evaluate(async el => {
    el.scrollTo({ left: 0, behavior: "instant" });
    await new Promise<void>(resolve => {
      const start = performance.now();
      const tick = () => {
        el.dispatchEvent(new Event("scroll"));
        performance.now() - start < 400 ? requestAnimationFrame(tick) : resolve();
      };
      requestAnimationFrame(tick);
    });
  });
  await expect(previous).toBeHidden();
  await expect(page.locator(".home-secondary-cards .feature-cards-dot.is-active")).toHaveCount(1);
});

test("price estimate loading does not mount a 3D renderer", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", request => requests.push(request.url()));
  await page.addInitScript(() => {
    sessionStorage.setItem("myperol-price-calculator", JSON.stringify({
      step: "5", selectedSpace: "vivienda", surface: "100",
      selectedSupport: "hormigon", selectedCondition: "excelente",
    }));
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: any[]) =>
      timeout(handler, delay === 2500 ? 60000 : delay, ...args)) as typeof window.setTimeout;
  });
  await page.goto("/precios");
  await page.locator("[data-price-action]").click();
  await expect(page.locator("[data-price-estimate]")).toBeVisible();
  await expect(page.locator("[data-price-estimate] canvas")).toHaveCount(0);
  expect(requests.some(url => /\.splinecode/.test(url))).toBe(false);
});
