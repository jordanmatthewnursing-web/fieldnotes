import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import {
  verifySavedDossier,
  restoreHash,
  MAX_DOSSIER_BYTES,
} from "../.compiled/restore.js";
import { makeModelDossier, makeTumorDossier } from "../.compiled/dossier.js";
const models = JSON.parse(
  await readFile("src/continuous-evidence.json", "utf8"),
);
const tumors = JSON.parse(await readFile("src/tumor-evidence.json", "utf8"));
const donor = makeModelDossier(models, "BRAF", "donors", null);
donor.configuration.selectedId = donor.analysis.observations[0].id;
const good = verifySavedDossier(JSON.stringify(donor));
assert.match(restoreHash(good, models), /^#gene=BRAF&unit=donors&observation=/);
const tumor = makeTumorDossier(tumors, tumors.records[0].sampleId);
assert.match(
  restoreHash(verifySavedDossier(JSON.stringify(tumor)), tumors),
  /^#layer=tumors&gene=WRN&unit=models&sample=/,
);
const altered = structuredClone(donor);
altered.analysis.coverage.plotted = 999;
assert.throws(
  () => verifySavedDossier(JSON.stringify(altered)),
  /does not match/,
);
assert.throws(
  () => restoreHash(good, { ...models, release: "different" }),
  /different snapshot/,
);
assert.throws(
  () => verifySavedDossier(" ".repeat(MAX_DOSSIER_BYTES + 1)),
  /smaller than/,
);
assert.throws(() => verifySavedDossier("{broken"));
const reordered = {
  ...donor,
  analysis: Object.fromEntries(Object.entries(donor.analysis).reverse()),
};
assert.doesNotThrow(() => verifySavedDossier(JSON.stringify(reordered)));
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/restore-model.json", JSON.stringify(donor));
await writeFile("artifacts/restore-tumor.json", JSON.stringify(tumor));
await writeFile("artifacts/restore-altered.json", JSON.stringify(altered));
console.log("7 dossier restore checks passed; browser fixtures written.");
