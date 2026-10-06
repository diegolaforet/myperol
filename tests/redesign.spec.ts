import { test, expect, type Page } from "@playwright/test";
import sharp from "sharp";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const style = document.createElement("style");
    style.textContent = "astro-dev-toolbar { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => document.head.append(style), { once: true });
  });
});

async function checkWidth(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test("services grid, images, keyboard dialog and calculator navigation", async ({ page }, testInfo) => {
  await page.goto("/servicios");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".services-feature-heading")).toBeVisible();
  await checkWidth(page);
  const cards = page.locator(".service-card-expandable");
  await expect(cards).toHaveCount(5);
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded();
    await expect(card).toHaveClass(/is-visible/);
    await expect.poll(() => card.locator(".service-card-image").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: testInfo.outputPath("services.png"), fullPage: true });
  await cards.first().focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator(".service-expanded-close")).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(page.locator(".service-expanded-composition")).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath("service-dialog.png") });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(cards.first()).toBeFocused();
  await cards.first().click();
  await page.locator("[data-service-price-space]").click();
  await expect(page).toHaveURL(/\?reset=1&space=vivienda#calculadora/);
  await expect(page.locator("#calculadora [data-price-card]")).toHaveAttribute("data-selected-space", "vivienda");
});

test("service cards keep their copy in an editorial dialog on both routes", async ({ page }, testInfo) => {
  for (const route of ["/#servicios", "/servicios"]) {
    await page.goto(route);
    const cards = page.locator(".services-feature-cards .service-card-expandable");
    await expect(cards).toHaveCount(5);
    await checkWidth(page);

    const firstCard = cards.first();
    await firstCard.scrollIntoViewIfNeeded();
    await expect(firstCard).toHaveClass(/is-visible/);
    const cardBox = await firstCard.boundingBox();
    expect(cardBox!.height).toBeLessThan(testInfo.project.name === "desktop" ? 380 : 330);
    const summary = await firstCard.locator(".feature-card-services-text").innerText();
    const technical = await firstCard.getAttribute("data-service-technical") || summary;
    await firstCard.click();

    const dialog = page.getByRole("dialog", { name: "HOME" });
    await expect(dialog).toBeVisible();
    await expect(page.locator("main")).toHaveJSProperty("inert", true);
    await expect(dialog.locator(".service-expanded-summary")).toHaveText(summary);
    await expect(dialog.locator(".service-expanded-copy")).toHaveText(technical);
    await expect.poll(() => dialog.locator(".service-expanded-media-frame img").evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
    const animation = await page.locator(".service-expanded-overlay").evaluate(el => {
      const overlayStyle = getComputedStyle(el);
      const cardStyle = getComputedStyle(el.querySelector(".service-expanded-card")!);
      return {
        overlayTransition: overlayStyle.transitionProperty,
        overlayFilter: overlayStyle.backdropFilter,
        cardTransition: cardStyle.transitionProperty,
        cardFilter: cardStyle.backdropFilter,
        cardDuration: cardStyle.transitionDuration,
      };
    });
    expect(animation.overlayTransition).toBe("opacity");
    expect(animation.overlayFilter).toBe("none");
    expect(animation.cardTransition.split(",").map(value => value.trim()).sort()).toEqual(["opacity", "transform"]);
    expect(animation.cardFilter).toBe("none");
    expect(animation.cardDuration.split(",").every(value => Number.parseFloat(value) <= .22)).toBe(true);

    const layout = await dialog.evaluate(el => {
      const media = el.querySelector(".service-expanded-media")!.getBoundingClientRect();
      const content = el.querySelector(".service-expanded-content")!.getBoundingClientRect();
      return { horizontalGap: content.left - media.right, verticalGap: content.top - media.bottom };
    });
    if (testInfo.project.name === "desktop") expect(layout.horizontalGap).toBeGreaterThan(-1);
    else {
      expect(layout.verticalGap).toBeGreaterThan(-1);
      const copy = dialog.locator(".service-expanded-copy");
      await copy.focus();
      await page.keyboard.press("End");
      expect(await copy.evaluate(el => el.scrollHeight - el.clientHeight)).toBeGreaterThan(0);
      await expect.poll(() => copy.evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThan(2);
    }

    await dialog.locator(".service-expanded-composition").scrollIntoViewIfNeeded();
    await expect(dialog.locator(".service-expanded-composition")).toBeInViewport();
    await page.mouse.click(5, 5);
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("main")).toHaveJSProperty("inert", false);
    await expect(firstCard).toBeFocused();
  }
});

test("service dialog closes immediately with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#servicios");
  const card = page.locator(".home-services-showcase .service-card-expandable").first();
  await card.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(card).toBeFocused();
  await card.click();
  await page.locator(".service-expanded-overlay .service-expanded-composition").click();
  await expect(page).toHaveURL(/#mp-systems$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("service detail stays readable in short landscape", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.setViewportSize({ width: 800, height: 500 });
  await page.goto("/servicios");
  await page.locator(".service-card-expandable").first().click();
  const dialog = page.getByRole("dialog", { name: "HOME" });
  await expect(dialog).toBeVisible();
  const copyHeight = await dialog.locator(".service-expanded-copy").evaluate(el => el.clientHeight);
  expect(copyHeight).toBeGreaterThan(150);
  await expect(dialog.locator("[data-service-price-space]")).toBeInViewport();
  await expect(dialog.locator(".service-expanded-composition")).toBeInViewport();
  await checkWidth(page);
  await page.screenshot({ path: testInfo.outputPath("service-landscape.png") });
});

for (const ceramic of [false, true]) {
  test(`calculator completes and retains state (${ceramic ? "ceramic" : "concrete"})`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/precios?reset=1");
    await page.evaluate(() => document.fonts.ready);
    const card = page.locator("[data-price-card]");
    const next = page.locator("[data-price-action]");
    await page.screenshot({ path: testInfo.outputPath("calculator-intro.png"), fullPage: true });
    await next.click();
    await expect(next).toBeDisabled();
    await page.locator('[data-space="vivienda"]').click();
    await next.click();
    await expect(next).toBeDisabled();
    await page.locator("[data-price-surface-input]").fill("100");
    await next.click();
    await page.locator(`[data-support="${ceramic ? "ceramica-baldosa" : "hormigon"}"]`).click();
    await next.click();
    if (ceramic) {
      await expect(card).toHaveAttribute("data-view", "ceramic-removal");
      await page.locator('[data-ceramic-removal="si"]').click();
      await next.click();
    }
    await expect(card).toHaveAttribute("data-view", "condition");
    await page.locator('[data-condition="excelente"]').click();
    await checkWidth(page);
    await page.screenshot({ path: testInfo.outputPath("calculator-condition.png"), fullPage: true });
    await next.click();
    await expect(card).toHaveAttribute("data-view", "result", { timeout: 15000 });
    await expect(card).toHaveAttribute("data-estimated-price", ceramic ? "1400" : "1000");
    await checkWidth(page);
    await page.screenshot({ path: testInfo.outputPath("calculator-result.png"), fullPage: true });
    await page.goto("/precios");
    await expect(card).toHaveAttribute("data-view", "result");
    await expect(card).toHaveAttribute("data-estimated-price", ceramic ? "1400" : "1000");
    const submit = page.locator("[data-price-result-submit]");
    await expect(submit).toBeDisabled();
    await page.locator("[data-price-result-name]").fill("Prueba local");
    await page.locator("[data-price-result-phone]").fill("600123456");
    let payload: Record<string, string> | undefined;
    // Never send a real lead from the test suite.
    await page.route("**/.netlify/functions/price-request", route => {
      payload = route.request().postDataJSON();
      return route.fulfill({ json: { ok: true } });
    });
    await submit.click();
    await expect.poll(() => payload?.squareMeters).toBe("100");
    expect(errors).toEqual([]);
  });
}

test("home video and 3D render, move, reverse and fit the viewport", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  const heroTitle = page.locator(".hero-identity h1");
  await expect(heroTitle).toHaveAttribute("aria-label", "MyPerol");
  await expect(heroTitle.locator("img")).toBeVisible();
  const heroAlignment = await page.evaluate(() => {
    const modelLeft = document.querySelector(".flooring-copy-panel")!.getBoundingClientRect().left;
    return {
      modelLeft,
      heroLeft: document.querySelector(".hero-identity")!.getBoundingClientRect().left,
      titleLeft: document.querySelector(".hero-identity h1")!.getBoundingClientRect().left,
      copyLeft: document.querySelector(".hero-identity__copy")!.getBoundingClientRect().left,
      actionsLeft: document.querySelector(".hero-identity__actions")!.getBoundingClientRect().left,
    };
  });
  for (const left of [heroAlignment.heroLeft, heroAlignment.titleLeft, heroAlignment.copyLeft, heroAlignment.actionsLeft]) {
    expect(Math.abs(left - heroAlignment.modelLeft)).toBeLessThan(1);
  }
  expect(heroAlignment.heroLeft).toBeLessThan(page.viewportSize()!.width * .045);
  await checkWidth(page);
  await expect.poll(() => page.locator("video").evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThan(1);
  await page.screenshot({ path: testInfo.outputPath("hero.png") });
  const stage = page.locator("[data-flooring-scroll]");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
  await stage.evaluate(el => {
    const top = el.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + (el.clientHeight - innerHeight) * .03);
  });
  const intro = page.locator('[data-flooring-panel="0"] h2');
  await expect(intro).toBeVisible();
  const introGeometry = await intro.evaluate(el => ({ left: el.getBoundingClientRect().left, size: parseFloat(getComputedStyle(el).fontSize) }));
  expect(introGeometry.left).toBeLessThan(page.viewportSize()!.width * .045);
  expect(introGeometry.size).toBeGreaterThan(testInfo.project.name === "mobile" ? 30 : 60);
  const goTo = async (progress: number) => {
    await stage.evaluate((el, progress) => {
      const top = el.getBoundingClientRect().top + scrollY;
      const height = el.querySelector(".flooring-sticky")!.clientHeight;
      scrollTo(0, top + (el.clientHeight - height) * progress);
    }, progress);
    await page.waitForTimeout(900);
  };
  const samples: number[] = [];
  for (const progress of [.22, .55, .96, .22]) {
    await goTo(progress);
    const canvas = page.locator("[data-flooring-canvas]");
    const hideOverlay = await page.addStyleTag({ content: ".flooring-copy-stack, .flooring-progress, .section-corner-controls, .site-header, body > .social-float { visibility: hidden !important; }" });
    const buffer = await canvas.screenshot();
    await hideOverlay.evaluate(el => el.parentNode?.removeChild(el));
    const pixels = await sharp(buffer).resize(120, 120, { fit: "fill" }).removeAlpha().raw().toBuffer();
    let nonWhite = 0;
    for (let i = 0; i < pixels.length; i += 3) if (pixels[i] < 225 || pixels[i + 1] < 225 || pixels[i + 2] < 225) nonWhite++;
    expect(nonWhite).toBeGreaterThan(100);
    let edgePixels = 0;
    for (let y = 0; y < 120; y++) {
      for (const x of [0, 1, 118, 119]) {
        const offset = (y * 120 + x) * 3;
        if (pixels[offset] < 200 && pixels[offset + 1] < 200 && pixels[offset + 2] < 200) edgePixels++;
      }
    }
    expect(edgePixels, "3D model must not be clipped horizontally").toBeLessThan(5);
    samples.push(nonWhite);
    await page.screenshot({ path: testInfo.outputPath(`model-${progress}.png`) });
    await checkWidth(page);
    await expect.poll(() => page.locator(".flooring-copy-panel.is-active").evaluate(el => el.getBoundingClientRect().bottom <= innerHeight)).toBe(true);
  }
  expect(Math.abs(samples[0] - samples[1])).toBeGreaterThan(10);
  await page.locator("#servicios").scrollIntoViewIfNeeded();
  await page.locator("#servicios .feature-card").first().scrollIntoViewIfNeeded();
  await expect(page.locator("#servicios .feature-card").first()).toHaveClass(/is-visible/);
  await page.waitForTimeout(800);
  await page.screenshot({ path: testInfo.outputPath("home-services.png") });
  expect(errors).toEqual([]);
});

test("reduced motion keeps the final 3D view without a long scroll lock", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#mp-systems");
  const stage = page.locator("[data-flooring-scroll]");
  await expect(stage).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
  await expect(page.locator('[data-flooring-panel="5"]')).toHaveClass(/is-active/);
  expect(await stage.evaluate(el => el.clientHeight <= innerHeight + 1)).toBe(true);
});

test("3D rendering sleeps offscreen and records scroll frame intervals", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const metrics = { draws: 0 };
    Object.assign(window, { gpuMetrics: metrics });
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      const original = prototype.drawElements;
      prototype.drawElements = function (...args) {
        metrics.draws++;
        return original.apply(this, args);
      };
    }
  });
  await page.goto("/#mp-systems");
  await expect(page.locator("[data-flooring-scroll]")).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
  const frameMetrics = await page.evaluate(async () => {
    const stage = document.querySelector<HTMLElement>("[data-flooring-scroll]")!;
    const start = stage.getBoundingClientRect().top + scrollY;
    const distance = stage.clientHeight - innerHeight;
    scrollTo(0, start + distance * .2);
    await new Promise(resolve => setTimeout(resolve, 600));
    const canvas = stage.querySelector<HTMLCanvasElement>("canvas")!;
    const renderedAt: number[] = [];
    const recordRender = () => renderedAt.push(performance.now());
    canvas.addEventListener("rendered", recordRender);
    const intervals: number[] = [];
    let first = 0;
    let previous = 0;
    await new Promise<void>(resolve => {
      const tick = (time: number) => {
        if (!first) first = previous = time;
        else intervals.push(time - previous);
        previous = time;
        const progress = Math.min(1, (time - first) / 2000);
        scrollTo(0, start + distance * (.2 + progress * .55));
        progress < 1 ? requestAnimationFrame(tick) : resolve();
      };
      requestAnimationFrame(tick);
    });
    intervals.sort((a, b) => a - b);
    canvas.removeEventListener("rendered", recordRender);
    const drawIntervals = renderedAt.slice(1).map((time, i) => time - renderedAt[i]).sort((a, b) => a - b);
    return {
      frames: intervals.length,
      medianMs: intervals[Math.floor(intervals.length / 2)],
      p95Ms: intervals[Math.floor(intervals.length * .95)],
      renderedFrames: renderedAt.length,
      renderMedianMs: drawIntervals[Math.floor(drawIntervals.length / 2)],
      renderP95Ms: drawIntervals[Math.floor(drawIntervals.length * .95)],
      bufferPixels: canvas.width * canvas.height,
    };
  });
  await testInfo.attach("scroll-frame-intervals", { body: JSON.stringify(frameMetrics), contentType: "application/json" });
  console.log(testInfo.project.name, "Scroll frame intervals:", frameMetrics);
  expect(frameMetrics.renderedFrames).toBeGreaterThan(0);
  expect(frameMetrics.renderedFrames).toBeLessThanOrEqual(125);
  expect(frameMetrics.bufferPixels).toBeLessThanOrEqual(testInfo.project.name === "mobile" ? 1105000 : 2080000);
  if (testInfo.project.name === "mobile") {
    await page.locator("[data-flooring-canvas]").evaluate((canvas: HTMLCanvasElement) => {
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;
    });
    await expect.poll(() => page.locator("[data-flooring-canvas]").evaluate((canvas: HTMLCanvasElement) => canvas.width * canvas.height)).toBeLessThanOrEqual(1105000);
  }
  await page.waitForTimeout(1000);
  const idleRenders = await page.locator("[data-flooring-canvas]").evaluate(async canvas => {
    let count = 0;
    const rendered = () => count++;
    canvas.addEventListener("rendered", rendered);
    await new Promise(resolve => setTimeout(resolve, 400));
    canvas.removeEventListener("rendered", rendered);
    return count;
  });
  expect(idleRenders).toBe(0);
  const draws = () => page.evaluate(() => (window as unknown as { gpuMetrics: { draws: number } }).gpuMetrics.draws);
  for (const selector of ["#servicios", "#calculadora"]) {
    await page.locator(selector).scrollIntoViewIfNeeded();
    await expect(page.locator("[data-flooring-scroll]")).not.toHaveClass(/is-render-active/);
    await page.waitForTimeout(800);
    const before = await draws();
    expect(before).toBeGreaterThan(0);
    await page.evaluate(() => scrollBy({ top: 60, behavior: "instant" }));
    await page.waitForTimeout(500);
    expect(await draws()).toBe(before);
  }
});

test("small portrait and landscape layouts keep controls and 3D copy in view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/#mp-systems");
    const leftEdges = await page.evaluate(() => [
      document.querySelector(".hero-identity")!.getBoundingClientRect().left,
      document.querySelector(".flooring-copy-panel")!.getBoundingClientRect().left,
    ]);
    expect(Math.abs(leftEdges[0] - leftEdges[1])).toBeLessThan(1);
    const stage = page.locator("[data-flooring-scroll]");
    await expect(stage).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
    await stage.evaluate(el => scrollTo(0, el.getBoundingClientRect().top + scrollY + (el.clientHeight - innerHeight) * .55));
    await page.waitForTimeout(800);
    await checkWidth(page);
    await expect.poll(() => page.locator(".flooring-copy-panel.is-active").evaluate(el => {
      const bounds = el.getBoundingClientRect();
      return bounds.top >= 64 && bounds.bottom <= innerHeight;
    })).toBe(true);
    const logo = await page.locator(".mobile-logo").boundingBox();
    const contacts = await page.locator("body > .social-float").boundingBox();
    expect(logo!.x + logo!.width).toBeLessThanOrEqual(contacts!.x);
    const hideOverlay = await page.addStyleTag({ content: ".flooring-copy-stack, .flooring-progress, .section-corner-controls, .site-header, body > .social-float { visibility: hidden !important; }" });
    const buffer = await page.locator("[data-flooring-canvas]").screenshot();
    await hideOverlay.evaluate(el => el.parentNode?.removeChild(el));
    const pixels = await sharp(buffer).resize(120, 120, { fit: "fill" }).removeAlpha().raw().toBuffer();
    let edgePixels = 0;
    for (let y = 0; y < 120; y++) {
      for (const x of [0, 1, 118, 119]) {
        const offset = (y * 120 + x) * 3;
        if (pixels[offset] < 200 && pixels[offset + 1] < 200 && pixels[offset + 2] < 200) edgePixels++;
      }
    }
    expect(edgePixels, `3D model must fit ${viewport.width}px viewport`).toBeLessThan(5);
    await page.screenshot({ path: testInfo.outputPath(`viewport-${viewport.width}.png`) });
  }
});

test("navigation, service cards and calculator use neutral glass surfaces", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator(".desktop-nav");
  const navStyle = await nav.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, filter: getComputedStyle(el).backdropFilter }));
  expect(navStyle.background).toMatch(/0\.[0-9]+\)/);
  expect(navStyle.filter).toContain("blur(22px)");
  await page.goto("/servicios");
  const serviceStyle = await page.locator(".services-feature-cards .feature-card").first().evaluate(el => ({ background: getComputedStyle(el).backgroundColor, filter: getComputedStyle(el).backdropFilter }));
  expect(serviceStyle.background).toMatch(/0\.[0-9]+\)/);
  expect(serviceStyle.filter).toContain("blur(16px)");
  await page.goto("/precios?reset=1");
  const calcStyle = await page.locator("#prices-calculator-card").evaluate(el => ({ background: getComputedStyle(el).backgroundColor, filter: getComputedStyle(el).backdropFilter }));
  expect(calcStyle.background).toMatch(/0\.[0-9]+\)/);
  expect(calcStyle.filter).toContain("blur(24px)");
  const calculatorLayout = await page.locator("#calculadora").evaluate(section => ({
    background: getComputedStyle(section).backgroundColor,
  }));
  expect(calculatorLayout.background).toBe("rgb(32, 33, 36)");
  await expect.poll(() => page.locator("#calculadora").evaluate(section =>
    Math.abs(section.querySelector(".prices-section-heading h2")!.getBoundingClientRect().left
      - section.querySelector("#prices-calculator-card")!.getBoundingClientRect().left)
  )).toBeLessThan(1);
  await expect(page.locator(".prices-page .service-expanded-media-frame img")).toHaveJSProperty("naturalWidth", 1200);
  await page.locator("[data-price-action]").click();
  if (page.viewportSize()!.width <= 902) {
    await expect(page.locator(".prices-page .service-expanded-media")).toBeHidden();
  }
});

test("full-width sections keep the 3D stage sticky", async ({ page }) => {
  await page.goto("/");
  const widths = await page.locator("main > section").evaluateAll(sections => sections.map(section => {
    const bounds = section.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right };
  }));
  for (const bounds of widths) {
    expect(Math.abs(bounds.left)).toBeLessThan(1);
    expect(Math.abs(bounds.right - page.viewportSize()!.width)).toBeLessThan(1);
  }
  await page.locator("[data-flooring-scroll]").evaluate(el => {
    const top = el.getBoundingClientRect().top + scrollY;
    scrollTo(0, top + el.clientHeight * .45);
  });
  await expect.poll(() => page.locator(".flooring-sticky").evaluate(el => Math.abs(el.getBoundingClientRect().top))).toBeLessThan(1);
  await checkWidth(page);
});

test("desktop navigation highlights the whole link", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.goto("/");
  const link = page.locator(".desktop-nav .floating-nav-link").last();
  await link.hover();
  await page.waitForTimeout(250);
  const hover = await link.evaluate(el => ({
    color: getComputedStyle(el).backgroundColor,
    label: getComputedStyle(el.querySelector(".floating-nav-label")!).backgroundColor,
    height: el.getBoundingClientRect().height,
    navHeight: el.parentElement!.getBoundingClientRect().height,
  }));
  expect(hover.color).toContain("0.16");
  expect(hover.label).toBe("rgba(0, 0, 0, 0)");
  expect(hover.navHeight - hover.height).toBeLessThan(3);
  await page.screenshot({ path: testInfo.outputPath("navigation-hover.png") });
});

test("home calculator completes within the continuous page", async ({ page }, testInfo) => {
  await page.goto("/#calculadora");
  const calculator = page.locator("#calculadora");
  const card = calculator.locator("[data-price-card]");
  const next = card.locator("[data-price-action]");
  await expect(card).toBeVisible();
  await expect(page.locator("#servicios")).toBeAttached();
  await next.click();
  await card.locator('[data-space="vivienda"]').click();
  await next.click();
  await card.locator("[data-price-surface-input]").fill("100");
  await next.click();
  await card.locator('[data-support="hormigon"]').click();
  await next.click();
  await card.locator('[data-condition="excelente"]').click();
  await next.click();
  await expect(card).toHaveAttribute("data-estimated-price", "1000", { timeout: 15000 });
  await expect(card).toHaveAttribute("data-view", "result");
  const overview = await card.locator(".price-result-overview").boundingBox();
  const details = await card.locator(".price-result-details").boundingBox();
  if (testInfo.project.name === "desktop") {
    expect(details!.x).toBeGreaterThan(overview!.x + overview!.width);
  } else {
    expect(details!.y).toBeGreaterThan(overview!.y + overview!.height);
  }
  await expect(page.locator("#calculadora")).toBeInViewport();
  await checkWidth(page);
  await page.screenshot({ path: testInfo.outputPath("home-calculator-result.png") });
  await card.locator("[data-price-result-name]").fill("Prueba local");
  await card.locator("[data-price-result-phone]").fill("600123456");
  let payload: Record<string, string> | undefined;
  await page.route("**/.netlify/functions/price-request", route => {
    payload = route.request().postDataJSON();
    return route.fulfill({ json: { ok: true } });
  });
  await card.locator("[data-price-result-submit]").click();
  await expect.poll(() => payload?.squareMeters).toBe("100");
  await card.locator("[data-price-back]").click();
  await expect(card).toHaveAttribute("data-view", "intro");
  await expect(calculator).toBeInViewport();
  await expect.poll(() => card.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(testInfo.project.name === "mobile" ? 70 : 96);
});

test("navigation reaches the calculator in the home scroll", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "mobile") {
    await page.locator(".mobile-menu-button").click();
    await page.locator('#primaryNav a[href="/#calculadora"]').click();
  } else {
    await page.locator('.desktop-nav a[href="/#calculadora"]').click();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect(page.locator("#calculadora")).toBeInViewport();
});

test("hero cue and navbar animate internal navigation without changing the route", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.evaluate(() => {
    const samples: number[] = [];
    const recordPosition = () => samples.push(window.scrollY);
    (window as typeof window & { __smoothScrollSamples?: number[] }).__smoothScrollSamples = samples;
    window.addEventListener("scroll", recordPosition, { passive: true });
    window.setTimeout(() => window.removeEventListener("scroll", recordPosition), 3000);
  });

  await page.locator(".hero-scroll-cue").click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect.poll(() => page.locator("#experiencia").evaluate(element =>
    Math.abs(element.getBoundingClientRect().top)
  )).toBeLessThanOrEqual(80);

  const sampledPositions = await page.evaluate(() =>
    (window as typeof window & { __smoothScrollSamples?: number[] }).__smoothScrollSamples ?? []
  );
  expect(new Set(sampledPositions.map(position => Math.round(position))).size).toBeGreaterThan(2);
  await page.waitForTimeout(500);

  if (testInfo.project.name === "mobile") {
    await page.locator(".mobile-menu-button").click();
    await page.locator('#primaryNav a[href="/#servicios"]').click();
  } else {
    await page.locator('.desktop-nav a[href="/#servicios"]').click();
  }
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => location.hash)).toBe("");
  await expect(page.locator("#servicios")).toBeInViewport({ timeout: 30000 });
});

test("dark carousel centers when space allows and services use an asymmetric grid", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "desktop") await page.setViewportSize({ width: 2100, height: 1000 });
  const track = page.locator(".home-secondary-cards-track");
  const first = track.locator(".home-secondary-card").first();
  const geometry = await track.evaluate(el => {
    const firstCard = el.querySelector(".home-secondary-card")!.getBoundingClientRect();
    const lastCard = el.querySelector(".home-secondary-card:last-child")!.getBoundingClientRect();
    return {
      left: firstCard.left,
      right: innerWidth - lastCard.right,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    };
  });
  if (testInfo.project.name === "desktop") {
    expect(Math.abs(geometry.left - geometry.right)).toBeLessThan(3);
    expect(geometry.left).toBeGreaterThan(20);
    const widths = await page.locator("#servicios .feature-card").evaluateAll(cards => cards.slice(0, 3).map(card => card.getBoundingClientRect().width));
    expect(widths[0]).toBeGreaterThan(widths[1]);
    expect(widths[1]).toBeGreaterThan(widths[2]);
  } else {
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    await track.evaluate(el => el.scrollBy({ left: 250, behavior: "instant" }));
    await expect.poll(() => track.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  }
});

test("calculator intro and steps fit within one viewport", async ({ page }, testInfo) => {
  await page.goto("/precios?reset=1");
  const section = page.locator("#calculadora");
  const card = page.locator("[data-price-card]");
  const assertFits = async () => {
    const geometry = await section.evaluate(el => {
      const heading = el.querySelector(".prices-section-heading")!.getBoundingClientRect();
      const calculator = el.querySelector("[data-price-card]")!.getBoundingClientRect();
      const sectionRect = el.getBoundingClientRect();
      return {
        sectionTop: sectionRect.top,
        sectionHeight: sectionRect.height,
        headingTop: heading.top,
        headingBottom: heading.bottom,
        cardTop: calculator.top,
        cardBottom: calculator.bottom,
        viewportHeight: innerHeight,
      };
    });
    expect(Math.abs(geometry.sectionTop)).toBeLessThan(2);
    expect(Math.abs(geometry.sectionHeight - geometry.viewportHeight)).toBeLessThan(2);
    expect(geometry.headingTop).toBeGreaterThanOrEqual(0);
    expect(geometry.cardTop).toBeGreaterThanOrEqual(geometry.headingBottom);
    expect(geometry.cardBottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  };
  await assertFits();
  const next = page.locator("[data-price-action]");
  await next.click();
  await page.locator('[data-space="vivienda"]').click();
  await next.click();
  await page.locator("[data-price-surface-input]").fill("100");
  await next.click();
  await page.locator('[data-support="hormigon"]').click();
  await page.locator(".prices-step-content").evaluate(el => { el.scrollTop = el.scrollHeight; });
  await next.click();
  await expect(card).toHaveAttribute("data-view", "condition");
  await expect.poll(() => page.locator(".prices-step-content").evaluate(el => el.scrollTop)).toBe(0);
  const conditionLayout = await card.evaluate(el => {
    const content = el.querySelector<HTMLElement>(".prices-step-content")!;
    const options = el.querySelector<HTMLElement>("[data-price-condition-step]")!;
    const footer = el.querySelector<HTMLElement>(".prices-card-footer")!;
    const image = el.querySelector<HTMLImageElement>(".service-expanded-media-frame img")!;
    return {
      contentClientHeight: content.clientHeight,
      contentScrollHeight: content.scrollHeight,
      optionsBottom: options.getBoundingClientRect().bottom,
      footerTop: footer.getBoundingClientRect().top,
      objectFit: getComputedStyle(image).objectFit,
      imageHeight: image.getBoundingClientRect().height,
      frameHeight: image.parentElement!.getBoundingClientRect().height,
    };
  });
  expect(conditionLayout.contentScrollHeight).toBeLessThanOrEqual(conditionLayout.contentClientHeight + 1);
  expect(conditionLayout.optionsBottom).toBeLessThanOrEqual(conditionLayout.footerTop + 1);
  expect(conditionLayout.objectFit).toBe("cover");
  if (page.viewportSize()!.width > 902) {
    expect(Math.abs(conditionLayout.imageHeight - conditionLayout.frameHeight)).toBeLessThan(1);
  }
  await assertFits();
  await page.screenshot({ path: testInfo.outputPath("calculator-condition.png") });
});

test("calculator intro offers a direct quote without changing the calculator flow", async ({ page }) => {
  let requestCount = 0;
  await page.route("**/.netlify/functions/price-request", async route => {
    requestCount += 1;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.goto("/precios?reset=1");
  const card = page.locator("[data-price-card]");
  const form = card.locator("[data-price-direct-form]");

  await expect(card.locator("[data-price-direct-panel]")).toBeVisible();
  await expect(card.locator("[data-price-media]")).toBeHidden();
  await card.locator("[data-price-direct-open]").click();
  await expect(form).toBeVisible();
  await expect(card.locator("[data-price-title]")).toBeHidden();

  const submit = form.locator("[data-price-direct-submit]");
  const errors = form.locator(".price-direct-contact__field-error:visible");
  await expect(submit).toHaveClass(/is-incomplete/);
  await expect(form).not.toHaveClass(/is-revealing/);
  const initialStyle = await submit.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, transform: getComputedStyle(el).transform }));
  await submit.hover();
  expect(await submit.evaluate(el => ({ background: getComputedStyle(el).backgroundColor, transform: getComputedStyle(el).transform }))).toEqual(initialStyle);
  await submit.click();
  await expect(errors).toHaveCount(4);
  await expect(errors.first()).toHaveText("Rellena este campo para continuar");
  await expect(form.locator("[data-price-direct-email]")).not.toHaveAttribute("required");
  await expect(form.locator('[data-i18n="form_email_optional"]')).toContainText("opcional");

  await form.locator("[data-price-direct-name]").fill("Cliente");
  await form.locator("[data-price-direct-last-name]").fill("de prueba");
  await form.locator("[data-price-direct-phone-prefix-button]").click();
  await form.locator("[data-price-direct-phone-prefix-menu] [data-country='FR']").click();
  await form.locator("[data-price-direct-phone]").fill("600123456");
  await expect(form.locator("textarea")).toHaveCount(0);
  await expect(form.getByRole("radio")).toHaveCount(5);
  await expect(form.getByRole("radio", { checked: true })).toHaveCount(0);
  expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(false);
  await form.getByRole("radio", { name: "Home", exact: true }).check();
  await form.getByRole("radio", { name: "Business", exact: true }).check();
  await expect(form.getByRole("radio", { name: "Home", exact: true })).not.toBeChecked();
  await expect(form.getByRole("radio", { checked: true })).toHaveCount(1);
  await expect(errors).toHaveCount(0);
  await expect(submit).not.toHaveClass(/is-incomplete/);
  await form.locator("[data-price-direct-email]").fill("invalid");
  await expect(errors).toHaveCount(1);
  await expect(submit).toHaveClass(/is-incomplete/);
  await form.locator("[data-price-direct-email]").fill("");
  await expect(submit).not.toHaveClass(/is-incomplete/);
  await submit.click();
  await expect(form.locator("[data-price-direct-status]")).toHaveAttribute("data-status", "info");
  await expect(form.locator("[data-price-direct-status]")).toContainText("no est");
  expect(requestCount).toBe(0);
  await expect(form.getByRole("radio", { checked: true })).toHaveCount(1);

  await card.locator("[data-price-direct-close]").click();
  await expect(form).toBeHidden();
  await card.locator("[data-price-action]").click();
  await expect(card).toHaveAttribute("data-view", "space");
});

test("final polish reuses carousel pagination and exposes premium navigation cues", async ({ page }, testInfo) => {
  await page.goto("/");
  const cue = page.locator(".hero-scroll-cue");
  await expect(cue).toBeVisible();
  await expect(cue).toHaveAttribute("href", "#experiencia");
  await page.screenshot({ path: testInfo.outputPath("hero-scroll-cue.png") });

  const secondaryArrow = page.locator(".home-secondary-cards-next");
  await expect(secondaryArrow.locator("svg path")).toHaveCount(1);
  const arrowStyle = await secondaryArrow.evaluate(el => ({
    borderRadius: getComputedStyle(el).borderRadius,
    backdropFilter: getComputedStyle(el).backdropFilter,
  }));
  expect(arrowStyle.borderRadius).toBe("999px");
  expect(arrowStyle.backdropFilter).toContain("blur");

  const carouselDot = page.locator(".home-secondary-cards-dots .feature-cards-dot.is-active");
  await expect(carouselDot).toHaveCount(1);
  const carouselDotStyle = await carouselDot.evaluate(el => {
    const style = getComputedStyle(el);
    return {
      width: style.width,
      height: style.height,
      background: style.backgroundColor,
      opacity: style.opacity,
      transition: style.transition,
      transform: style.transform,
    };
  });

  await page.goto("/precios?reset=1");
  const calculatorDot = page.locator(".prices-progress-dots .feature-cards-dot.is-active");
  const calculatorDotStyle = await calculatorDot.evaluate(el => {
    const style = getComputedStyle(el);
    return {
      width: style.width,
      height: style.height,
      background: style.backgroundColor,
      opacity: style.opacity,
      transition: style.transition,
      transform: style.transform,
    };
  });
  expect(calculatorDotStyle.width).toBe(carouselDotStyle.width);
  expect(calculatorDotStyle.height).toBe(carouselDotStyle.height);
  expect(calculatorDotStyle.background).toBe(carouselDotStyle.background);
  expect(calculatorDotStyle.transition).toBe(carouselDotStyle.transition);
  expect(Number(calculatorDotStyle.opacity)).toBeCloseTo(Number(carouselDotStyle.opacity), 2);
  expect(Number(calculatorDotStyle.transform.match(/[\d.]+/)?.[0])).toBeCloseTo(Number(carouselDotStyle.transform.match(/[\d.]+/)?.[0]), 2);

  if (testInfo.project.name === "desktop") {
    await expect(page.locator('[data-section-corner-controls="calculator"] .language-control')).toBeVisible();
  } else {
    await expect(page.locator(".mobile-header-bar .language-control")).toBeVisible();
  }
});
