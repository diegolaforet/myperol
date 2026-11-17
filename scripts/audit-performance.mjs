import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const label = process.argv[2] || "current";
const baseURL = process.env.AUDIT_URL || "http://127.0.0.1:4324";
const directory = new URL(`../performance-artifacts/${label}/`, import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: "chrome" });
try {
  for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } })) {
    const page = await browser.newPage({ viewport, isMobile: device === "mobile", deviceScaleFactor: 1 });
    await page.addInitScript(() => {
      window.auditLongTasks = [];
      new PerformanceObserver(list => window.auditLongTasks.push(...list.getEntries().map(e => e.duration))).observe({ type: "longtask", buffered: true });
      window.auditDisplayNames = 0;
      const DisplayNames = Intl.DisplayNames;
      Intl.DisplayNames = class extends DisplayNames {
        constructor(...args) {
          super(...args);
          window.auditDisplayNames++;
        }
      };
    });
    const session = await page.context().newCDPSession(page);
    await session.send("Network.enable");
    await session.send("Network.setCacheDisabled", { cacheDisabled: true });
    let transferred = 0;
    session.on("Network.dataReceived", event => { transferred += event.encodedDataLength; });
    await page.goto(baseURL, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(6000);
    const metrics = await page.evaluate(() => ({
      navigation: performance.getEntriesByType("navigation")[0].toJSON(),
      paints: performance.getEntriesByType("paint").map(e => e.toJSON()),
      longTasks: window.auditLongTasks,
      resources: performance.getEntriesByType("resource").map(e => ({ name: new URL(e.name).pathname, bytes: e.encodedBodySize, duration: e.duration })),
      modelInitialized: document.querySelector("[data-flooring-scroll]")?.dataset.flooringInitialized || false,
      calculatorContract: Array.from(document.querySelectorAll("[data-price-card], [data-price-card] *")).map(el => ({
        tag: el.tagName,
        attrs: Array.from(el.attributes).filter(a => /^(id|name|value|class|data-)/.test(a.name)).map(a => [a.name, a.value]),
      })),
    }));
    await writeFile(new URL(`${device}.json`, directory), JSON.stringify({ ...metrics, transferred }, null, 2));
    console.log(JSON.stringify({ label, device, transferred, longTaskCount: metrics.longTasks.length, longTaskMs: metrics.longTasks.reduce((a, b) => a + b, 0), modelInitialized: metrics.modelInitialized }));
    for (const [name, route] of [["services", "/servicios"], ["calculator", "/precios?reset=1"]]) {
      await page.goto(`${baseURL}${route}`);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      await page.screenshot({ path: new URL(`${device}-${name}.png`, directory).pathname.replace(/^\/(\w:)/, "$1") });
      const routeMetrics = await page.evaluate(() => ({
        longTasks: window.auditLongTasks,
        displayNamesConstructed: window.auditDisplayNames,
        phoneOptions: document.querySelectorAll(".phone-prefix-option").length,
        resources: performance.getEntriesByType("resource").map(e => ({
          name: new URL(e.name).pathname, bytes: e.encodedBodySize, duration: e.duration,
        })),
      }));
      await writeFile(new URL(`${device}-${name}.json`, directory), JSON.stringify(routeMetrics, null, 2));
    }
    await page.close();
  }
} finally {
  await browser.close();
}
