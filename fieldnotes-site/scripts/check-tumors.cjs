const {
  chromium,
  launchOptions,
  baseURL,
  artifact,
  axePath,
} = require("./test-runtime.cjs");
const fs = require("node:fs");
(async () => {
  const browser = await chromium.launch(launchOptions);
  for (const width of [1440, 390]) {
    const p = await browser.newPage({ viewport: { width, height: 1000 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(baseURL);
    await p.waitForSelector("#gene");
    await p.selectOption("#gene", "RPL4");
    await p.click("#tumor-layer");
    await p.waitForSelector("[data-sample]");
    if (
      (await p.locator("tbody tr").count()) !== 594 ||
      (await p.locator("circle").count()) !== 555
    )
      throw Error("Tumor counts");
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
    const dl = p.waitForEvent("download");
    await p.click("#export");
    const file = await dl;
    const out = JSON.parse(fs.readFileSync(await file.path()));
    if (
      out.configuration.layer !== "tumors" ||
      !out.configuration.selectedSample ||
      out.dataset.records.length !== 594 ||
      out.dataset.source.license !== "ODbL-1.0" ||
      out.dataset.donorSensitivity ||
      out.dataset.models
    )
      throw Error("Export separation");
    await p.reload();
    await p.waitForSelector("[data-sample]");
    await p.screenshot({
      path: artifact(`tumors-${width}.png`),
      fullPage: true,
    });
    await p.addScriptTag({ path: axePath });
    const violations = await p.evaluate(async () =>
      (
        await axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        })
      ).violations.map((v) => v.id),
    );
    if (violations.length) throw Error(JSON.stringify(violations));
    await p.click("#model-layer");
    await p.waitForSelector("#gene");
    if (
      (await p.inputValue("#gene")) !== "RPL4" ||
      (await p.locator("tbody tr").count()) !== 96
    )
      throw Error("Return model state");
    if (
      errors.length ||
      (await p.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ))
    )
      throw Error("Runtime/layout");
    console.log({
      width,
      tumors: 594,
      paired: 555,
      export: "separate ODbL dataset",
      reload: true,
      modelReturn: true,
      axe: 0,
    });
    await p.close();
  }
  const p = await browser.newPage();
  await p.route("**/tumor-evidence.json", (r) => r.abort());
  await p.goto(baseURL);
  await p.waitForSelector("#gene");
  await p.click("#tumor-layer");
  await p.waitForSelector("[role=alert]");
  if (!(await p.locator("#export").isDisabled()))
    throw Error("Failed export enabled");
  await p.click("#model-layer");
  await p.waitForSelector("#gene");
  if (await p.locator("#export").isDisabled())
    throw Error("Model recovery failed");
  console.log("Tumor fetch failure and independent model recovery passed");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
