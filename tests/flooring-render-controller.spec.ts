import { test, expect } from "@playwright/test";

test("scroll render bursts keep every frame, settle and sleep", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const path = "/src/scripts/flooring/render-controller.ts";
    const { createRenderController } = await import(/* @vite-ignore */ path);
    const originalRequest = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;
    const callbacks = new Map<number, FrameRequestCallback>();
    let nextId = 0;
    window.requestAnimationFrame = callback => {
      callbacks.set(++nextId, callback);
      return nextId;
    };
    window.cancelAnimationFrame = id => { callbacks.delete(id); };
    let playing = false;
    let requested = false;
    let renders = 0;
    let starts = 0;
    let changed = true;
    let listener: (() => void) | undefined;
    const renderer = {
      play() { playing = true; starts++; },
      stop() { playing = false; },
      requestRender() { requested = true; },
      addEventListener(_type: string, callback: () => void) { listener = callback; },
      removeEventListener() { listener = undefined; },
    };
    const controller = createRenderController(renderer, (force: boolean) => changed || force);
    let frame = 0;
    const tick = (scrolling = false) => {
      const time = ++frame * (1000 / 60);
      const pending = [...callbacks.values()];
      callbacks.clear();
      // GSAP updates before the already-scheduled render callback in this frame.
      if (scrolling) controller.request();
      pending.forEach(callback => callback(time));
      if (playing && requested) {
        requested = false;
        renders++;
        listener?.();
      }
    };
    try {
      controller.setVisible(true);
      for (let i = 0; i < 60; i++) tick(true);
      const moving = { renders, starts };
      changed = false;
      for (let i = 0; i < 40; i++) tick();
      const idle = { renders, playing, pending: callbacks.size };
      changed = true;
      controller.request();
      tick();
      const resumed = renders;
      controller.setVisible(false);
      controller.request(true);
      tick();
      const hidden = { renders, playing, pending: callbacks.size };
      controller.dispose();
      controller.setVisible(true);
      controller.request();
      return { moving, idle, resumed, hidden, disposed: !listener && callbacks.size === 0 };
    } finally {
      controller.dispose();
      window.requestAnimationFrame = originalRequest;
      window.cancelAnimationFrame = originalCancel;
    }
  });
  expect(result.moving).toEqual({ renders: 60, starts: 1 });
  expect(result.idle).toEqual({ renders: 91, playing: false, pending: 0 });
  expect(result.resumed).toBe(92);
  expect(result.hidden).toEqual({ renders: 92, playing: false, pending: 0 });
  expect(result.disposed).toBe(true);
});

test("slow, fast and reverse scroll never clear the visible model", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/#mp-systems");
  const stage = page.locator("[data-flooring-scroll]");
  await expect(stage).toHaveAttribute("data-flooring-initialized", "ready", { timeout: 60000 });
  const metrics = await stage.evaluate(async section => {
    const canvas = section.querySelector("canvas")!;
    const start = section.getBoundingClientRect().top + scrollY;
    const distance = section.clientHeight - innerHeight;
    const scroll = (progress: number) => scrollTo({ top: start + distance * progress, behavior: "instant" });
    scroll(.2);
    await new Promise(resolve => setTimeout(resolve, 1000));
    const sample = document.createElement("canvas");
    sample.width = 120;
    sample.height = 90;
    const context = sample.getContext("2d", { willReadFrequently: true })!;
    const samples: number[] = [];
    let bufferResets = 0;
    const observer = new MutationObserver(records => { bufferResets += records.length; });
    observer.observe(canvas, { attributes: true, attributeFilter: ["width", "height"] });
    const rendered = () => {
      // Read in the render event, before WebGL releases its drawing buffer.
      context.clearRect(0, 0, sample.width, sample.height);
      context.drawImage(canvas, 0, 0, sample.width, sample.height);
      const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
      let modelPixels = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] > 0 && pixels[i] < 235) modelPixels++;
      }
      samples.push(modelPixels);
    };
    canvas.addEventListener("rendered", rendered);
    try {
      let first: number | undefined;
      await new Promise<void>(resolve => {
        const tick = (time: number) => {
          first ??= time;
          const progress = Math.min(1, (time - first) / 800);
          scroll(.2 + progress * .035);
          progress < 1 ? requestAnimationFrame(tick) : resolve();
        };
        requestAnimationFrame(tick);
      });
      for (const progress of [.55, .22, .96, .62]) {
        scroll(progress);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    } finally {
      canvas.removeEventListener("rendered", rendered);
      observer.disconnect();
    }
    return { frames: samples.length, minimumModelPixels: Math.min(...samples), bufferResets };
  });
  expect(metrics.frames).toBeGreaterThan(60);
  expect(metrics.minimumModelPixels).toBeGreaterThan(100);
  expect(metrics.bufferResets).toBe(0);
  expect(errors).toEqual([]);
  await testInfo.attach("scroll-continuity", { body: JSON.stringify(metrics), contentType: "application/json" });
  await page.screenshot({ path: testInfo.outputPath("scroll-settled.png") });
});
