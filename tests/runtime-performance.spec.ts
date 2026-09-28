import { test, expect } from "@playwright/test";
import sharp from "sharp";

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

test("estimate WebGL moves, sleeps offscreen, resumes and respects reduced motion", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("myperol-price-calculator", JSON.stringify({
      step: "5", selectedSpace: "vivienda", surface: "100",
      selectedSupport: "hormigon", selectedCondition: "excelente",
    }));
    // Keep the loading view open long enough to inspect its renderer lifecycle.
    const timeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler, delay, ...args) => timeout(handler, delay === 2500 ? 60000 : delay, ...args)) as typeof window.setTimeout;
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/precios");
  const canvas = page.locator("[data-price-estimate-canvas]");
  await canvas.evaluate(el => {
    Object.assign(window, { estimateDraws: 0 });
    el.addEventListener("rendered", () => (window as any).estimateDraws++);
  });
  await page.locator("[data-price-action]").click();
  await expect(canvas).toHaveClass(/is-ready/, { timeout: 60000 });
  const draws = () => page.evaluate(() => (window as any).estimateDraws as number);
  await expect.poll(draws).toBeGreaterThan(2);
  const pixelRatio = () => canvas.evaluate((el: HTMLCanvasElement) => el.width / el.clientWidth);
  const initialPixelRatio = await pixelRatio();
  const pixels = await sharp(await canvas.screenshot()).resize(120, 120, { fit: "fill" }).removeAlpha().raw().toBuffer();
  let modelPixels = 0;
  for (let index = 0; index < pixels.length; index += 3) {
    if (pixels[index] > 70 || pixels[index + 1] > 70 || pixels[index + 2] > 70) modelPixels++;
  }
  expect(modelPixels).toBeGreaterThan(100);
  await page.screenshot({ path: testInfo.outputPath("estimate-model.png") });
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ width: viewport.width + 40, height: viewport.height });
  await expect.poll(pixelRatio).toBeCloseTo(initialPixelRatio, 1);

  await canvas.evaluate(el => { el.style.transform = "translateY(200vh)"; });
  await page.waitForTimeout(250);
  const offscreenDraws = await draws();
  await page.waitForTimeout(350);
  expect(await draws()).toBe(offscreenDraws);
  await canvas.evaluate(el => { el.style.transform = ""; });
  await expect.poll(draws).toBeGreaterThan(offscreenDraws);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(300);
  const restingDraws = await draws();
  await page.waitForTimeout(350);
  expect(await draws()).toBe(restingDraws);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(draws).toBeGreaterThan(restingDraws);
  expect(errors).toEqual([]);
});
