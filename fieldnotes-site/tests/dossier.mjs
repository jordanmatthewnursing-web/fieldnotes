import fs from "node:fs";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { validate, validateTumor } from "../.compiled/contract.js";
import {
  analyzeModels,
  makeModelDossier,
  makeTumorDossier,
  replayDossier,
} from "../.compiled/dossier.js";
const data = validate(
  JSON.parse(
    fs.readFileSync(
      new URL("../src/continuous-evidence.json", import.meta.url),
    ),
  ),
);
for (const gene of Object.keys(data.genes)) {
  const complete = data.models.filter(
    (r) => r.MSIScore !== null && r[data.genes[gene]] !== null,
  );
  const donor = analyzeModels(data, gene, "donors");
  assert.equal(
    donor.coverage.plotted,
    new Set(complete.map((r) => r.PatientID)).size,
  );
  assert.equal(
    donor.observations.reduce((sum, r) => sum + r.modelIds.length, 0),
    complete.length,
  );
  const ids = donor.observations.flatMap((r) => r.modelIds);
  assert.equal(new Set(ids).size, ids.length);
  for (const unit of ["models", "donors"]) {
    const first = analyzeModels(data, gene, unit).observations[0];
    const dossier = makeModelDossier(data, gene, unit, first.id);
    assert.deepEqual(replayDossier(dossier), dossier);
    if (gene !== "WRN")
      assert.equal(dossier.analysis.summary.spearmanRho, undefined);
  }
}
const wrn = analyzeModels(data, "WRN", "donors");
assert.equal(wrn.coverage.observations, 61);
assert.equal(wrn.coverage.completeModels, 63);
assert(
  Math.abs(
    wrn.summary.spearmanRho - data.donorSensitivity.donorLevel.spearmanRho,
  ) < 1e-8,
);
for (const row of wrn.observations) {
  const original = data.donorSensitivity.donors.find(
    (r) => r.donorId === row.id,
  );
  assert(Math.abs(row.msi - original.msiScore) < 1e-8);
  assert(Math.abs(row.effect - original.geneEffect) < 1e-8);
}
const tumor = validateTumor(
  JSON.parse(
    fs.readFileSync(new URL("../src/tumor-evidence.json", import.meta.url)),
  ),
);
const dossier = makeTumorDossier(tumor, tumor.records[0].sampleId);
assert.deepEqual(replayDossier(dossier), dossier);
assert.throws(() => makeModelDossier(data, "WRN", "donors", "ACH-000003"));
assert.throws(() => makeTumorDossier(tumor, "unknown"));
assert.throws(() =>
  replayDossier({
    ...dossier,
    configuration: { ...dossier.configuration, unit: "donors" },
  }),
);
const dir = await mkdtemp(join(tmpdir(), "fieldnotes-dossier-"));
try {
  const input = join(dir, "dossier.json"),
    output = join(dir, "replayed.json");
  fs.writeFileSync(input, JSON.stringify(dossier));
  const good = spawnSync(
    process.execPath,
    ["scripts/replay.mjs", input, output],
    { encoding: "utf8" },
  );
  assert.equal(good.status, 0, good.stderr);
  assert.deepEqual(JSON.parse(fs.readFileSync(output)), dossier);
  dossier.analysis.coverage.samples++;
  // Preserve source snapshot to test an incorrect reported analysis.
  dossier.dataset = structuredClone(tumor);
  dossier.dataset.coverage.samples = 594;
  fs.writeFileSync(input, JSON.stringify(dossier));
  const bad = spawnSync(process.execPath, ["scripts/replay.mjs", input], {
    encoding: "utf8",
  });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /differs/);
} finally {
  await rm(dir, { recursive: true, force: true });
}
console.log(
  "Dossier: 10 gene/unit replay combinations, donor membership/medians, tumor replay, invalid selection/configuration and CLI tamper rejection passed.",
);
