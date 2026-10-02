import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { cpus, platform, arch } from "node:os";
import { gzipSync } from "node:zlib";
import { serve } from "./serve.mjs";
const profiles = [
  {
    name: "desktop-local",
    viewport: { width: 1440, height: 1000 },
    cpu: 1,
    network: null,
  },
  {
    name: "phone-throttled",
    viewport: { width: 390, height: 844 },
    cpu: 4,
    network: {
      offline: false,
      latency: 150,
      downloadThroughput: 200000,
      uploadThroughput: 93750,
    },
  },
];
const runs = 5;
const budgets = {
  modelReadyMs: 3000,
  donorMs: 200,
  geneMs: 200,
  tumorColdMs: 2000,
  modelReturnMs: 200,
};
const { server, url } = await serve();
const browser = await chromium.launch({ headless: true });
const records = [];
try {
  for (const profile of profiles) {
    for (let run = 1; run <= runs; run++) {
      const context = await browser.newContext({ viewport: profile.viewport });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: profile.cpu });
      if (profile.network)
        await cdp.send("Network.emulateNetworkConditions", profile.network);
      await page.addInitScript(() => {
        window.__timing = {
          modelReadyMs: null,
          lcpMs: null,
          layoutShiftSum: 0,
          longTasks: [],
        };
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.__timing.lcpMs = entry.startTime;
        }).observe({ type: "largest-contentful-paint", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            if (!entry.hadRecentInput)
              window.__timing.layoutShiftSum += entry.value;
        }).observe({ type: "layout-shift", buffered: true });
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries())
            window.__timing.longTasks.push(entry.duration);
        }).observe({ type: "longtask", buffered: true });
        const observe = new MutationObserver(() => {
          if (
            document.querySelector("#gene") &&
            document.querySelector("#workspace")?.getAttribute("aria-busy") ===
              "false"
          ) {
            window.__timing.modelReadyMs = performance.now();
            observe.disconnect();
          }
        });
        observe.observe(document, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["aria-busy"],
        });
      });
      await page.goto(url);
      await page.waitForFunction(() => window.__timing.modelReadyMs !== null);
      // Give paint observers a bounded settling window; modelReady is recorded earlier by the observer.
      await page.waitForTimeout(250);
      const navigation = await page.evaluate(() => ({
        ...window.__timing,
        resources: performance
          .getEntriesByType("resource")
          .map((r) => ({
            name: new URL(r.name).pathname,
            bytes: r.transferSize,
            durationMs: r.duration,
          })),
      }));
      async function change(selector, value, ready) {
        return page.evaluate(
          async ({ selector, value, ready }) => {
            const start = performance.now();
            const element = document.querySelector(selector);
            if (value !== null) {
              element.value = value;
              element.dispatchEvent(new Event("change", { bubbles: true }));
            } else element.click();
            while (
              !document.querySelector(ready) ||
              document.querySelector("#workspace").getAttribute("aria-busy") !==
                "false"
            ) {
              if (performance.now() - start > 15000)
                throw Error("Interaction timeout");
              await new Promise((resolve) => setTimeout(resolve, 10));
            }
            await new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
            return performance.now() - start;
          },
          { selector, value, ready },
        );
      }
      const donorMs = await change("#unit", "donors", "#unit");
      const geneMs = await change("#gene", "RPL4", "#gene");
      const tumorColdMs = await change("#tumor-layer", null, "[data-sample]");
      const modelReturnMs = await change("#model-layer", null, "#gene");
      if (errors.length) throw Error(errors.join("; "));
      records.push({
        profile: profile.name,
        run,
        ...navigation,
        donorMs,
        geneMs,
        tumorColdMs,
        modelReturnMs,
      });
      await context.close();
      console.log(
        `${profile.name} ${run}/${runs}: model ${Math.round(navigation.modelReadyMs)} ms, tumor ${Math.round(tumorColdMs)} ms`,
      );
    }
  }
} finally {
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
const summary = profiles.map((profile) => {
  const selected = records.filter((r) => r.profile === profile.name);
  const metrics = {};
  for (const key of [
    "modelReadyMs",
    "lcpMs",
    "donorMs",
    "geneMs",
    "tumorColdMs",
    "modelReturnMs",
    "layoutShiftSum",
  ]) {
    const values = selected
      .map((r) => r[key])
      .filter((v) => typeof v === "number")
      .sort((a, b) => a - b);
    metrics[key] = {
      median: values[Math.floor(values.length / 2)],
      max: Math.max(...values),
      ...(key in budgets
        ? {
            budget: budgets[key],
            allRunsWithinBudget: values.every((v) => v <= budgets[key]),
          }
        : {}),
    };
  }
  return { profile: profile.name, metrics };
});
const manifest = JSON.parse(
  await readFile(
    new URL("../dist/build-manifest.json", import.meta.url),
    "utf8",
  ),
);
const assets = [];
for (const item of manifest.files) {
  const bytes = await readFile(
    new URL("../dist/" + item.file, import.meta.url),
  );
  assets.push({ ...item, gzipBytes: gzipSync(bytes).length });
}
const result = {
  measuredAt: new Date().toISOString(),
  environment: {
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0].model,
    browser: "Playwright Chromium",
    node: process.version,
  },
  profiles,
  runs,
  budgets,
  method:
    "Loopback uncompressed server; fresh browser context and disabled cache per run. Navigation ready measured by DOM observer. Interaction time is programmatic state change through two animation frames, not field INP. LCP observed before interactions. Layout shift sum is not session-window CLS.",
  limitations: [
    "Not hosted CDN or sign-in performance",
    "Phone viewport, CPU and network emulation on desktop hardware; not a physical phone",
    "Five runs per profile; medians and maxima, not population percentiles",
    "gzip sizes calculated locally; server sends uncompressed bytes",
    "No real-user Core Web Vitals claim",
  ],
  assets,
  summary,
  records,
};
await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../artifacts/performance.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(summary, null, 2));
