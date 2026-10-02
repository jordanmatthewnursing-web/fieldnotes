const {
  chromium,
  launchOptions,
  baseURL,
  artifact,
  axePath,
} = require("./test-runtime.cjs");
const fs = require("node:fs");
(async () => {
  const b = await chromium.launch(launchOptions);
  for (const width of [1440, 390]) {
    const p = await b.newPage({ viewport: { width, height: 900 } });
    await p.goto(baseURL);
    await p.waitForSelector("#gene");
    await p.addScriptTag({ path: axePath });
    for (const state of ["overview", "selection"]) {
      if (state === "selection")
        await p.locator("tbody button").first().click();
      const r = await p.evaluate(() =>
        axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      console.log(
        width,
        state,
        r.violations.map((v) => v.id),
      );
      if (r.violations.length) throw Error("Accessibility violations");
    }
    await p.close();
  }
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
