const { chromium, launchOptions, baseURL } = require("./test-runtime.cjs");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch(launchOptions);
  try {
    for (const layer of ["models", "tumors"]) {
      const page = await browser.newPage();
      const filename =
        layer === "models" ? "continuous-evidence.json" : "tumor-evidence.json";
      await page.route("**/" + filename, async (route) => {
        const response = await route.fetch();
        const data = await response.json();
        if (layer === "models") data.wrnSummary.spearmanRho = 0;
        else data.records[0].patientId = "wrong-patient";
        await route.fulfill({ response, json: data });
      });
      await page.goto(baseURL);
      if (layer === "tumors") {
        await page.waitForSelector("#gene");
        await page.click("#tumor-layer");
      }
      await page.waitForSelector("#workspace [role=alert]");
      assert(await page.locator("#export").isDisabled());
      assert.equal(await page.locator("#workspace circle").count(), 0);
      if (layer === "models") {
        await page.click("#tumor-layer");
        await page.waitForSelector("[data-sample]");
        assert.equal(await page.locator("tbody tr").count(), 594);
        await page.click("#model-layer");
        await page.waitForSelector("#workspace [role=alert]");
        assert(await page.locator("#export").isDisabled());
        assert.equal(await page.locator("#workspace circle").count(), 0);
        assert(!new URL(page.url()).hash.includes("layer=tumors"));
      } else {
        await page.click("#model-layer");
        await page.waitForSelector("#gene");
        assert(!(await page.locator("#export").isDisabled()));
      }
      console.log(
        `Rejected corrupt ${layer} before render/export; independent layer remains usable.`,
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
