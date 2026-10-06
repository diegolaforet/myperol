import { test, expect, type Page } from "@playwright/test";
import type { Application, SPEObject } from "@splinetool/runtime";
import sharp from "sharp";

type ObservedWindow = Window & { flooringTestObjects: SPEObject[]; flooringTestApplication: Application };

async function openScene(page: Page) {
  await page.goto("/");
  // Observe the public runtime API without adding debug hooks to production.
  await page.evaluate(async () => {
    const modulePath = "/src/scripts/spline/resources.ts";
    const { loadFlooringResources } = await import(/* @vite-ignore */ modulePath);
    const [{ Application }] = await loadFlooringResources();
    const original = Application.prototype.getAllObjects;
    Application.prototype.getAllObjects = function () {
      const objects = original.call(this);
      Object.assign(window, { flooringTestObjects: objects, flooringTestApplication: this });
      return objects;
    };
  });
  await page.locator("[data-flooring-scroll]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-flooring-scroll]"))
    .toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
}

async function scrollScene(page: Page, progress: number) {
  await page.locator("[data-flooring-scroll]").evaluate((section, value) => {
    scrollTo({ top: section.getBoundingClientRect().top + scrollY +
      (section.clientHeight - innerHeight) * value, behavior: "instant" });
  }, progress);
  await page.waitForTimeout(500);
}

async function geometry(page: Page) {
  return page.evaluate(() => (window as unknown as ObservedWindow).flooringTestObjects.map(object => ({
    name: object.name,
    position: { x: object.position.x, y: object.position.y, z: object.position.z },
    rotation: { x: object.rotation.x, y: object.rotation.y, z: object.rotation.z },
    scale: { x: object.scale.x, y: object.scale.y, z: object.scale.z },
    intensity: object.intensity,
  })));
}

async function material(page: Page) {
  return page.evaluate(async () => {
    const layer = (window as unknown as ObservedWindow).flooringTestObjects.find(object => object.name === "epoxi")!;
    const layers = layer.material!.layers;
    const texture = layers.find(entry => entry.type === "texture")!;
    const data = texture.texture.image.data;
    const bytes = typeof data === "string" ? new TextEncoder().encode(data) : new Uint8Array(data);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
    const reflection = layers.find(entry => entry.type === "matcap");
    const sourceColor: unknown = layers.find(entry => entry.type === "color")!.color;
    const color = sourceColor && typeof sourceColor === "object" && "r" in sourceColor &&
      "g" in sourceColor && "b" in sourceColor
      ? `rgb(${Number(sourceColor.r) * 255}, ${Number(sourceColor.g) * 255}, ${Number(sourceColor.b) * 255})`
      : sourceColor;
    return {
      hash,
      color,
      alpha: texture.alpha,
      shininess: layers.find(entry => entry.type === "light" && entry.category === "phong")!.shininess,
      reflection: reflection && "alpha" in reflection ? reflection.alpha : undefined,
    };
  });
}

async function modelPixels(page: Page) {
  // Compare like-for-like temporal antialiasing, independent of the number of scroll frames.
  await page.evaluate(async () => {
    const application = (window as unknown as ObservedWindow).flooringTestApplication;
    application.play();
    for (let frame = 0; frame < 40; frame++) {
      application.requestRender();
      await new Promise(requestAnimationFrame);
    }
    application.stop();
  });
  const style = await page.addStyleTag({ content:
    ".flooring-copy-stack,.flooring-progress,.section-corner-controls,.site-header,body>.social-float,astro-dev-toolbar { visibility:hidden!important }",
  });
  const buffer = await page.locator("[data-flooring-canvas]").screenshot();
  await style.evaluate(el => el.parentNode?.removeChild(el));
  return sharp(buffer).resize(240, 180, { fit: "fill" }).removeAlpha().raw().toBuffer();
}

test("surface comparison preserves geometry and restores the original resin", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await openScene(page);
  await scrollScene(page, .62);
  const stage = page.locator("[data-flooring-scroll]");
  const originalGeometry = await geometry(page);
  const originalMaterial = await material(page);
  const resinPixels = await modelPixels(page);
  const main = stage.locator('[data-flooring-panel="3"]');
  await page.screenshot({ path: testInfo.outputPath("resin.png") });
  await main.locator('[data-flooring-variant="mineral"]').click();
  await expect(stage).toHaveAttribute("data-flooring-material", "mineral");
  await expect(stage).not.toHaveAttribute("data-flooring-material-transition");
  expect(await geometry(page)).toEqual(originalGeometry);
  const mineralPixels = await modelPixels(page);
  let different = 0;
  for (let i = 0; i < resinPixels.length; i += 3) {
    if (Math.abs(resinPixels[i] - mineralPixels[i]) > 12) different++;
  }
  expect(different, "The finish must change visibly, not only its description").toBeGreaterThan(60);
  await page.screenshot({ path: testInfo.outputPath("mineral.png") });

  // Scroll never chooses a finish; backwards scrolling returns the exact geometry.
  await scrollScene(page, .74);
  await scrollScene(page, .22);
  await scrollScene(page, .62);
  await expect(stage).toHaveAttribute("data-flooring-material", "mineral");
  expect(await geometry(page)).toEqual(originalGeometry);
  for (const variant of ["resin", "mineral", "resin", "mineral", "resin"]) {
    await main.locator(`[data-flooring-variant="${variant}"]`).click();
    await page.waitForTimeout(40);
  }
  await expect(stage).toHaveAttribute("data-flooring-material", "resin");
  await expect(stage).not.toHaveAttribute("data-flooring-material-transition");
  expect(await material(page)).toEqual(originalMaterial);
  expect(await geometry(page)).toEqual(originalGeometry);
  const restoredPixels = await modelPixels(page);
  const meanError = resinPixels.reduce((sum, value, i) => sum + Math.abs(value - restoredPixels[i]), 0) / resinPixels.length;
  expect(meanError, "Returning to resin restores the original appearance").toBeLessThan(.5);
  await page.screenshot({ path: testInfo.outputPath("restored.png") });
  expect(errors).toEqual([]);
});

test("failed mineral download retains resin and permits retry", async ({ page }) => {
  await page.route("**/assets/3d/mineral-finish.webp", route => route.fulfill({ status: 503, body: "" }));
  await openScene(page);
  await scrollScene(page, .62);
  const stage = page.locator("[data-flooring-scroll]");
  const original = await material(page);
  const main = stage.locator('[data-flooring-panel="3"]');
  await main.locator('[data-flooring-variant="mineral"]').click();
  await expect(stage).toHaveAttribute("data-flooring-variant", "resin");
  await expect(stage).not.toHaveAttribute("data-flooring-material-transition");
  expect(await material(page)).toEqual(original);
  await page.unroute("**/assets/3d/mineral-finish.webp");
  await main.locator('[data-flooring-variant="mineral"]').click();
  await expect(stage).toHaveAttribute("data-flooring-material", "mineral");
});

test("corrupt mineral image does not block the selector", async ({ page }) => {
  await page.route("**/assets/3d/mineral-finish.webp", route =>
    route.fulfill({ status: 200, contentType: "image/webp", body: "invalid image" }));
  await openScene(page);
  await scrollScene(page, .62);
  const stage = page.locator("[data-flooring-scroll]");
  const original = await material(page);
  await stage.locator('[data-flooring-panel="3"] [data-flooring-variant="mineral"]').click();
  await expect(stage).toHaveAttribute("data-flooring-variant", "resin");
  await expect(stage).not.toHaveAttribute("data-flooring-material-transition");
  expect(await material(page)).toEqual(original);
});

test("mobile translations remain in view with the original animation", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  for (const viewport of [{ width: 320, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await openScene(page);
    await scrollScene(page, .62);
    const main = page.locator('[data-flooring-panel="3"]');
    await main.locator('[data-flooring-variant="mineral"]').click();
    await expect(page.locator("[data-flooring-scroll]")).toHaveAttribute("data-flooring-material", "mineral");
    for (const language of ["es", "en", "fr", "de", "ru", "uk"]) {
      await page.evaluate(lang => window.selectLang(lang), language);
      // Translated sections above the model can change the document's height.
      await scrollScene(page, .62);
      const rect = await main.boundingBox();
      expect(rect!.y, `${viewport.width} ${language}: below navigation`).toBeGreaterThan(64);
      expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height);
      await page.screenshot({ path: testInfo.outputPath(`fit-${viewport.width}-${language}.png`) });
    }
  }
});

test("original reading holds are stable and scroll is reversible", async ({ page }) => {
  await openScene(page);
  for (const [start, end] of [[.28, .295], [.445, .47], [.62, .64], [.755, .77]]) {
    await scrollScene(page, start);
    const first = await geometry(page);
    await scrollScene(page, end);
    expect(await geometry(page)).toEqual(first);
    await scrollScene(page, .03);
    await scrollScene(page, start);
    expect(await geometry(page)).toEqual(first);
  }
});
