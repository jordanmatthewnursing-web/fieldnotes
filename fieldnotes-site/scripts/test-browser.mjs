import { spawn } from "node:child_process";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { serve } from "./serve.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const { server, url } = await serve();
const checks = [];
let child;
const stop = () => {
  child?.kill();
  server.close();
};
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  for (const script of [
    "check-site.cjs",
    "check-tumors.cjs",
    "check-a11y.cjs",
    "check-invalid.cjs",
    "check-dossier.cjs",
    "check-uncertainty.cjs",
    "check-nearby.cjs",
    "check-evidence-tool.cjs",
  ]) {
    let output = "";
    const code = await new Promise((accept, reject) => {
      child = spawn(process.execPath, ["scripts/" + script], {
        cwd: root,
        env: { ...process.env, BASE_URL: url },
        stdio: ["ignore", "pipe", "pipe"],
      });
      for (const stream of [child.stdout, child.stderr])
        stream.on("data", (data) => {
          output += data;
          process.stdout.write(data);
        });
      child.once("error", reject);
      child.once("close", accept);
    });
    checks.push({ script, passed: code === 0, output });
    if (code !== 0) throw Error(`Browser check failed: ${script}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  server.closeAllConnections();
  await new Promise((accept) => server.close(accept));
  await mkdir(new URL("../artifacts/", import.meta.url), { recursive: true });
  await writeFile(
    new URL("../artifacts/browser-checks.json", import.meta.url),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: process.env.BROWSER_CHANNEL || "playwright-chromium",
        checks,
      },
      null,
      2,
    ) + "\n",
  );
}
