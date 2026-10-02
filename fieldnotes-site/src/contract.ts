import {
  modelSchema,
  tumorSchema,
  type ModelData,
  type TumorData,
} from "./schema.js";
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw Error(message);
}
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;
const median = (values: number[]) => {
  const v = [...values].sort((a, b) => a - b),
    i = Math.floor(v.length / 2);
  return v.length % 2 ? v[i] : (v[i - 1] + v[i]) / 2;
};
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v),
    result: number[] = [];
  for (let start = 0; start < order.length;) {
    let end = start + 1;
    while (end < order.length && order[end].v === order[start].v) end++;
    for (let i = start; i < end; i++)
      result[order[i].i] = (start + end - 1) / 2;
    start = end;
  }
  return result;
}
export function spearman(xs: number[], ys: number[]): number | null {
  ensure(xs.length === ys.length, "Mismatched correlation vectors");
  if (xs.length < 3) return null;
  const x = ranks(xs),
    y = ranks(ys),
    mean = (x.length - 1) / 2;
  let xy = 0,
    xx = 0,
    yy = 0;
  for (let i = 0; i < x.length; i++) {
    xy += (x[i] - mean) * (y[i] - mean);
    xx += (x[i] - mean) ** 2;
    yy += (y[i] - mean) ** 2;
  }
  return xx === 0 || yy === 0 ? null : xy / Math.sqrt(xx * yy);
}
export function validate(input: unknown): ModelData {
  const d = modelSchema.parse(input),
    ids = new Set<string>();
  for (const row of d.models) {
    ensure(!ids.has(row.ModelID), "Duplicate model");
    ids.add(row.ModelID);
  }
  ensure(
    new Set(d.sourceManifest.map((r) => r.file)).size === 4,
    "Repeated source manifest",
  );
  const pairs = d.models.filter(
    (r) => r.MSIScore !== null && r[d.genes.WRN] !== null,
  );
  ensure(
    d.coverage.models === d.models.length &&
      d.coverage.pairedWRNAndMSI === pairs.length &&
      d.coverage.unpaired === d.models.length - pairs.length,
    "Invalid model coverage",
  );
  const check = d.donorSensitivity,
    used = new Set<string>(),
    donorIds = new Set<string>();
  for (const donor of check.donors) {
    ensure(!donorIds.has(donor.donorId), "Duplicate donor");
    donorIds.add(donor.donorId);
    ensure(
      donor.pairedModelCount === donor.modelIds.length &&
        donor.modelNames.length === donor.modelIds.length,
      "Invalid donor member count",
    );
    const members = donor.modelIds.map((id, i) => {
      const r = pairs.find((m) => m.ModelID === id);
      ensure(
        r &&
          !used.has(id) &&
          r.PatientID === donor.donorId &&
          r.CellLineName === donor.modelNames[i],
        "Invalid donor membership",
      );
      used.add(id);
      return r;
    });
    const xs = members.map((r) => r.MSIScore!),
      ys = members.map((r) => r[d.genes.WRN]!);
    ensure(
      near(median(xs), donor.msiScore) && near(median(ys), donor.geneEffect),
      "Invalid donor median",
    );
    ensure(
      near(Math.min(...xs), donor.msiRange[0]) &&
        near(Math.max(...xs), donor.msiRange[1]) &&
        near(Math.min(...ys), donor.effectRange[0]) &&
        near(Math.max(...ys), donor.effectRange[1]),
      "Invalid donor range",
    );
  }
  ensure(
    used.size === pairs.length &&
      check.modelLevel.n === pairs.length &&
      check.donorLevel.n === check.donors.length &&
      check.unpairedModels === d.coverage.unpaired &&
      check.relatedDonors ===
        check.donors.filter((r) => r.pairedModelCount > 1).length,
    "Incomplete donor coverage",
  );
  const modelRho = spearman(
    pairs.map((r) => r.MSIScore!),
    pairs.map((r) => r[d.genes.WRN]!),
  );
  const donorRho = spearman(
    check.donors.map((r) => r.msiScore),
    check.donors.map((r) => r.geneEffect),
  );
  for (const [summary, rho] of [
    [check.modelLevel, modelRho],
    [check.donorLevel, donorRho],
  ] as const)
    ensure(
      rho === null
        ? summary.status === "unavailable"
        : summary.status === "available" && near(summary.spearmanRho, rho),
      "Invalid correlation summary",
    );
  ensure(
    modelRho !== null &&
      near(d.wrnSummary.spearmanRho, modelRho) &&
      d.wrnSummary.n === pairs.length,
    "Invalid WRN summary",
  );
  return d;
}
export function validateTumor(input: unknown): TumorData {
  const d = tumorSchema.parse(input),
    ids = new Set<string>(),
    patients = new Set<string>();
  for (const r of d.records) {
    ensure(
      !ids.has(r.sampleId) && !patients.has(r.patientId),
      "Duplicate tumor identity",
    );
    ids.add(r.sampleId);
    patients.add(r.patientId);
    ensure(
      r.sampleId.startsWith(r.patientId + "-"),
      "Mismatched tumor identity",
    );
    ensure(
      (r.WRN_RSEM === null) === (r.WRN_log2_RSEM_plus_1 === null),
      "Transform missingness",
    );
    if (r.WRN_RSEM !== null)
      ensure(
        r.WRN_RSEM >= 0 &&
          near(Math.log2(r.WRN_RSEM + 1), r.WRN_log2_RSEM_plus_1!),
        "Tumor transform",
      );
  }
  const paired = d.records.filter(
      (r) => r.MSI_SCORE_MANTIS !== null && r.WRN_RSEM !== null,
    ),
    c = d.coverage;
  ensure(
    c.samples === ids.size &&
      c.patients === patients.size &&
      c.sample_types["Primary Solid Tumor"] === ids.size &&
      c.paired_MANTIS_and_WRN === paired.length &&
      c.missing_MANTIS_or_WRN === ids.size - paired.length,
    "Tumor coverage",
  );
  ensure(
    c.observed_measurements.MSI_SCORE_MANTIS ===
      d.records.filter((r) => r.MSI_SCORE_MANTIS !== null).length &&
      c.observed_measurements.WRN_RSEM ===
        d.records.filter((r) => r.WRN_RSEM !== null).length,
    "Tumor measurement coverage",
  );
  ensure(
    Object.values(c.observed_measurements).every((n) => n <= c.samples) &&
      new Set(d.sourceManifest.map((r) => r.file)).size === 6,
    "Tumor provenance",
  );
  return d;
}
