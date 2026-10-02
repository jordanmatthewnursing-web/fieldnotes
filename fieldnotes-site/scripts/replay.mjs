import { readFile, writeFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { replayDossier } from "../.compiled/dossier.js";
const [input, output] = process.argv.slice(2);
if (!input) {
  console.error("Usage: npm run replay -- dossier.json [replayed.json]");
  process.exit(1);
}
const original = JSON.parse(await readFile(input, "utf8"));
const replayed = replayDossier(original);
if (!isDeepStrictEqual(original.analysis, replayed.analysis)) {
  console.error(
    "Exported analysis differs from the result recomputed from its validated dataset and configuration.",
  );
  process.exit(1);
}
if (output) await writeFile(output, JSON.stringify(replayed, null, 2) + "\n");
console.log("Dossier reproduced: " + JSON.stringify(replayed.configuration));
