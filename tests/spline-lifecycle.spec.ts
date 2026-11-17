import { test, expect } from "@playwright/test";

test("Spline downloads near the section but allocates WebGL only on entry", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.assign(window, { flooringContexts: 0 });
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: any[]) {
      if (this.hasAttribute("data-flooring-canvas") && /webgl/.test(type)) {
        (window as any).flooringContexts++;
      }
      return original.call(this, type as any, ...args);
    } as typeof original;
  });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const stage = page.locator("[data-flooring-scroll]");
  const sceneResponse = page.waitForResponse(response => response.url().endsWith(".splinecode"));
  await stage.evaluate(el => scrollTo({
    top: el.getBoundingClientRect().top + scrollY - innerHeight - 250,
    behavior: "instant",
  }));
  await sceneResponse;
  await expect(stage).toHaveAttribute("data-flooring-initialized", "loading");
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => (window as any).flooringContexts)).toBe(0);

  // Leaving the proximity area during download must not initialize a hidden scene.
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => (window as any).flooringContexts)).toBe(0);
  await stage.evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await expect(stage).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
  expect(await page.evaluate(() => (window as any).flooringContexts)).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
