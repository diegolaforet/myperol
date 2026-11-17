import { test, expect, type Page } from "@playwright/test";

async function scrollAt(page: Page, x: number, y: number, delta: number, touch: boolean) {
  if (!touch) {
    await page.mouse.move(x, y);
    await page.mouse.wheel(0, delta);
    return;
  }
  const session = await page.context().newCDPSession(page);
  try {
    await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let frame = 1; frame <= 12; frame++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ x, y: y - delta * frame / 12 }],
      });
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } finally {
    await session.detach();
  }
}

const scrollCases = ["wheel", "touch"].flatMap(input =>
  [["1", "intro"], ["2", "space"], ["result", "result"]].map(([step, view]) => ({ input, step, view }))
);

for (const { input, step, view } of scrollCases) {
  test(`calculator ${view} allows scrolling back to the page with ${input}`, async ({ page }, testInfo) => {
    test.skip(input === "touch" && testInfo.project.name !== "mobile", "Touch gestures require the mobile viewport.");
    await page.addInitScript(step => {
      sessionStorage.setItem("myperol-price-calculator", JSON.stringify({
        step, selectedSpace: "vivienda", surface: "100",
        selectedSupport: "hormigon", selectedCondition: "excelente",
      }));
    }, step);
    await page.goto("/");
    await expect(page.locator("[data-price-card]")).toHaveAttribute("data-view", view);
    await page.evaluate(() => document.fonts.ready);
    const calculator = page.locator("#calculadora");
    await calculator.evaluate(el => el.scrollIntoView({ behavior: "instant" }));
    const panel = page.locator(view === "result" ? ".price-result-step" : ".prices-step-content");
    await panel.evaluate(el => { el.scrollTop = 0; });
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    const start = await page.evaluate(() => scrollY);
    await scrollAt(page, box!.x + box!.width / 2, Math.max(120, box!.y + 30), -300, input === "touch");
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(start - 100);

    // At the other boundary, the document must also receive downward input.
    await calculator.evaluate(el => scrollTo({ top: el.getBoundingClientRect().top + scrollY - 200, behavior: "instant" }));
    await panel.evaluate(el => { el.scrollTop = el.scrollHeight; });
    const nextBox = await panel.boundingBox();
    const beforeDown = await page.evaluate(() => scrollY);
    await scrollAt(page, nextBox!.x + nextBox!.width / 2, Math.min(page.viewportSize()!.height - 80, nextBox!.y + 30), 200, input === "touch");
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(beforeDown + 50);
  });
}
