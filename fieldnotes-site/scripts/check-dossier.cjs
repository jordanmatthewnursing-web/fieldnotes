const {
  chromium,
  launchOptions,
  baseURL,
  artifact,
  axePath,
} = require("./test-runtime.cjs");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  const { replayDossier } = await import("../.compiled/dossier.js");
  const browser = await chromium.launch(launchOptions);
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 1000 } });
      await page.goto(baseURL);
      await page.waitForSelector("#unit");
      await page.selectOption("#unit", "donors");
      assert.equal(await page.locator("tbody tr").count(), 61);
      assert.equal(await page.locator("circle.point").count(), 61);
      await page.locator("tbody button").first().focus();
      await page.keyboard.press("Enter");
      if (width === 390) {
        await page.waitForSelector("dialog[open]");
        await page.keyboard.press("Escape");
      }
      const selected = new URL(page.url()).hash;
      assert(selected.includes("observation=PT-"));
      await page.reload();
      await page.waitForSelector("#unit");
      assert.equal(await page.inputValue("#unit"), "donors");
      assert.equal(await page.locator("tr.selected").count(), 1);
      assert.equal(await page.locator("dialog[open]").count(), 0);
      assert.equal(new URL(page.url()).hash, selected);
      const download = page.waitForEvent("download");
      await page.click("#export");
      const file = await download;
      const payload = JSON.parse(fs.readFileSync(await file.path()));
      assert.deepEqual(replayDossier(payload), payload);
      assert.equal(payload.configuration.unit, "donors");
      assert(payload.configuration.selectedId.startsWith("PT-"));
      assert.equal(payload.analysis.coverage.observations, 61);
      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () =>
        (
          await axe.run(document, {
            runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
          })
        ).violations.map((r) => r.id),
      );
      assert.deepEqual(violations, []);
      await page.screenshot({
        path: artifact(`dossier-donors-${width}.png`),
        fullPage: true,
      });
      await page.selectOption("#gene", "RPL4");
      assert.equal(await page.inputValue("#unit"), "donors");
      assert(!new URL(page.url()).hash.includes("observation="));
      await page.click("#tumor-layer");
      await page.waitForSelector("[data-sample]");
      await page.locator("tbody button").first().click();
      if (width === 390) await page.keyboard.press("Escape");
      const sampleHash = new URL(page.url()).hash;
      assert(sampleHash.includes("sample=TCGA"));
      await page.reload();
      await page.waitForSelector("[data-sample]");
      assert.equal(await page.locator("tr.selected").count(), 1);
      assert.equal(new URL(page.url()).hash, sampleHash);
      const td = page.waitForEvent("download");
      await page.click("#export");
      const tf = await td;
      const tumor = JSON.parse(fs.readFileSync(await tf.path()));
      assert.deepEqual(replayDossier(tumor), tumor);
      await page.click("#model-layer");
      await page.waitForSelector("#unit");
      assert.equal(await page.inputValue("#unit"), "donors");
      assert.equal(await page.inputValue("#gene"), "RPL4");
      assert(
        !(await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        )),
      );
      console.log({
        width,
        donorRows: 61,
        selectedURL: true,
        tumorSelectedURL: true,
        exportReplay: true,
        unitAcrossLayers: true,
        axe: 0,
      });
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
