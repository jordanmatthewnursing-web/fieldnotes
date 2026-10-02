const {
  chromium,
  launchOptions,
  baseURL,
  artifact,
  axePath,
} = require("./test-runtime.cjs");
const fs = require("node:fs");
(async () => {
  const b = await chromium.launch(launchOptions),
    results = [];
  for (const width of [1440, 390]) {
    const p = await b.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(baseURL);
    await p.waitForSelector("#gene");
    if (
      (await p.locator("tbody tr").count()) !== 96 ||
      (await p.locator("circle").count()) !== 63
    )
      throw Error("Coverage");
    await p.screenshot({
      path: artifact(`continuous-${width}.png`),
      fullPage: true,
    });
    await p.locator(".donor-check summary").click();
    if (
      !(await p
        .locator(".donor-check")
        .innerText()
        .then(
          (t) => t.includes("COLO 201") && t.includes("Donor medians · 61"),
        ))
    )
      throw Error("Donor details");
    const wrnDownload = p.waitForEvent("download");
    await p.click("#export");
    const wrnFile = await wrnDownload;
    const wrnPayload = JSON.parse(fs.readFileSync(await wrnFile.path()));
    if (
      wrnPayload.dataset.donorSensitivity.donorLevel.n !== 61 ||
      wrnPayload.dataset.donorSensitivity.modelLevel.n !== 63
    )
      throw Error("Missing donor export");
    await p.selectOption("#gene", "RPL4");
    const d = p.waitForEvent("download");
    await p.click("#export");
    const download = await d;
    const payload = JSON.parse(fs.readFileSync(await download.path()));
    if (
      payload.configuration.gene !== "RPL4" ||
      payload.dataset.models.some((r) => "msi_group" in r || "CCLE_MSI" in r) ||
      payload.analysis.summary.spearmanRho !== undefined
    )
      throw Error("Export contamination");
    await p.reload();
    await p.waitForSelector("#gene");
    if ((await p.inputValue("#gene")) !== "RPL4") throw Error("URL");
    await p.locator("tbody button").first().focus();
    await p.keyboard.press("Enter");
    if (width === 390) {
      await p.waitForSelector("dialog[open]");
      await p.keyboard.press("Escape");
      if (
        !(await p
          .locator("tbody button")
          .first()
          .evaluate((el) => el === document.activeElement))
      )
        throw Error("Focus");
    }
    if (
      errors.length ||
      (await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ))
    )
      throw Error("Runtime/layout");
    results.push({
      width,
      rows: 96,
      paired: 63,
      exportLabelsAbsent: true,
      comparatorStatisticsAbsent: true,
      selection: true,
    });
    await p.close();
  }
  console.log(results);
  fs.writeFileSync(
    artifact("continuous-checks.json"),
    JSON.stringify(results, null, 2),
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
