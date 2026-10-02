import fs from "node:fs";
import assert from "node:assert/strict";
import { validate, spearman } from "../.compiled/contract.js";
const original = JSON.parse(
  fs.readFileSync(new URL("../src/continuous-evidence.json", import.meta.url)),
);
validate(original);
const cases = {
  "unknown record field": (d) => (d.models[0].msi_group = "MSS"),
  "missing measurement": (d) => delete d.models[0].MSIScore,
  "string measurement": (d) => (d.models[0].MSIScore = "0"),
  "nonfinite measurement": (d) => (d.models[0].MSIScore = Infinity),
  "duplicate identity": (d) => d.models.push(d.models[0]),
  "wrong gene mapping": (d) => (d.genes.WRN = d.genes.PCNA),
  "missing provenance": (d) => delete d.sources,
  "wrong license": (d) => (d.sources[0].license = "ODbL-1.0"),
  "unsafe source URL": (d) => (d.sources[0].url = "javascript:alert(1)"),
  "bad checksum": (d) => (d.sourceManifest[0].md5 = "abc"),
  "repeated source": (d) => (d.sourceManifest[1] = d.sourceManifest[0]),
  "wrong coverage": (d) => d.coverage.unpaired++,
  "wrong summary": (d) => (d.wrnSummary.spearmanRho = 0),
  "wrong donor summary": (d) => (d.donorSensitivity.donorLevel.spearmanRho = 0),
  "repeated donor": (d) =>
    (d.donorSensitivity.donors[1].donorId =
      d.donorSensitivity.donors[0].donorId),
  "fabricated donor member": (d) =>
    (d.donorSensitivity.donors[0].modelIds[0] = "unobserved"),
  "wrong donor name": (d) =>
    (d.donorSensitivity.donors[0].modelNames[0] = "incorrect"),
  "wrong donor median": (d) => d.donorSensitivity.donors[0].msiScore++,
  "wrong donor range": (d) => d.donorSensitivity.donors[0].effectRange[1]++,
  "wrong related donor count": (d) => d.donorSensitivity.relatedDonors++,
};
for (const [name, mutate] of Object.entries(cases)) {
  const d = structuredClone(original);
  mutate(d);
  assert.throws(() => validate(d), undefined, name);
}
assert.equal(spearman([1, 2, 3], [3, 2, 1]), -1);
assert.equal(spearman([1, 1, 2], [4, 4, 8]), 1);
assert.equal(spearman([1, 1, 1], [1, 2, 3]), null);
assert.equal(spearman([], []), null);
assert.equal(spearman([1, 2], [2, 1]), null);
console.log(
  `Model contract: ${Object.keys(cases).length} corruptions rejected; tied ranks and unavailable correlation checked.`,
);
