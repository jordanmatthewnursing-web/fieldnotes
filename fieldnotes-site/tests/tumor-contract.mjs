import fs from "node:fs";
import assert from "node:assert/strict";
import { validateTumor } from "../.compiled/contract.js";
const original = JSON.parse(
  fs.readFileSync(new URL("../src/tumor-evidence.json", import.meta.url)),
);
validateTumor(original);
for (const mutate of [
  (d) => d.records.push(d.records[0]),
  (d) => (d.records[0].WRN_RSEM = -1),
  (d) => (d.records[0].WRN_log2_RSEM_plus_1 = 0),
  (d) => (d.records[0].msi_group = "MSS"),
  (d) => d.coverage.paired_MANTIS_and_WRN++,
  (d) => (d.source.license = "CC BY 4.0"),
]) {
  const d = structuredClone(original);
  mutate(d);
  assert.throws(() => validateTumor(d));
}
console.log("Tumor contract: six corruption cases rejected.");
const additional = {
  "empty patient": (d) => (d.records[0].patientId = ""),
  "patient mismatch": (d) => (d.records[0].patientId = "TCGA-wrong"),
  "wrong sample type": (d) => (d.records[0].sampleType = "Metastasis"),
  "nonfinite measurement": (d) => (d.records[0].MSI_SCORE_MANTIS = Infinity),
  "missing measurement": (d) => delete d.records[0].WRN_RSEM,
  "wrong patient count": (d) => d.coverage.patients++,
  "wrong observation count": (d) => d.coverage.observed_measurements.WRN_RSEM++,
  "bad provenance hash": (d) => (d.sourceManifest[0].sha256 = "incorrect"),
  "unsafe provenance URL": (d) => (d.source.url = "javascript:alert(1)"),
};
for (const [name, mutate] of Object.entries(additional)) {
  const d = structuredClone(original);
  mutate(d);
  assert.throws(() => validateTumor(d), undefined, name);
}
console.log(
  `Tumor contract: ${Object.keys(additional).length} additional corruption cases rejected.`,
);
