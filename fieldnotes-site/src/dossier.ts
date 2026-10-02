import { z } from "zod/v3";
import { validate, validateTumor, spearman } from "./contract.js";
import { genes, type Gene, type ModelData, type TumorData } from "./schema.js";
export type Unit = "models" | "donors";
export const parseUnit = (value: string | null): Unit =>
  value === "donors" ? "donors" : "models";
export type Observation = {
  id: string;
  name: string;
  donorId: string;
  modelIds: string[];
  msi: number | null;
  effect: number | null;
};
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b),
    i = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[i] : (sorted[i - 1] + sorted[i]) / 2;
};
export function analyzeModels(data: ModelData, gene: Gene, unit: Unit) {
  const complete = data.models.filter(
    (r) => r.MSIScore !== null && r[genes[gene]] !== null,
  );
  let observations: Observation[];
  if (unit === "models")
    observations = data.models.map((r) => ({
      id: r.ModelID,
      name: r.CellLineName,
      donorId: r.PatientID,
      modelIds: [r.ModelID],
      msi: r.MSIScore,
      effect: r[genes[gene]],
    }));
  else {
    const groups = new Map<string, typeof complete>();
    for (const row of complete) {
      const group = groups.get(row.PatientID) ?? [];
      group.push(row);
      groups.set(row.PatientID, group);
    }
    observations = [...groups]
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([id, rows]) => ({
        id,
        name: rows.map((r) => r.CellLineName).join(" / "),
        donorId: id,
        modelIds: rows.map((r) => r.ModelID),
        msi: median(rows.map((r) => r.MSIScore!)),
        effect: median(rows.map((r) => r[genes[gene]]!)),
      }));
  }
  const paired = observations.filter(
    (r) => r.msi !== null && r.effect !== null,
  );
  return {
    gene,
    unit,
    observations,
    coverage: {
      sourceModels: data.models.length,
      completeModels: complete.length,
      excludedFromPairs: data.models.length - complete.length,
      observations: observations.length,
      plotted: paired.length,
    },
    summary:
      gene === "WRN"
        ? {
            method:
              "Descriptive Spearman association; no causal or clinical estimate.",
            n: paired.length,
            spearmanRho: spearman(
              paired.map((r) => r.msi!),
              paired.map((r) => r.effect!),
            ),
          }
        : {
            method: "Descriptive comparator; no inferential statistics.",
            n: paired.length,
          },
    pairing:
      "Require both measurements on the same model before donor aggregation.",
    aggregation:
      unit === "donors"
        ? "Median of each measurement within each source donor; excludes unpaired models."
        : "Individual models; unpaired models remain in the table.",
    multipleComparisons:
      "No exploratory significance tests or target ranking are performed.",
  };
}
const configuration = z.discriminatedUnion("layer", [
  z
    .object({
      layer: z.literal("models"),
      gene: z.enum(["WRN", "BRAF", "KRAS", "PCNA", "RPL4"]),
      unit: z.enum(["models", "donors"]),
      selectedId: z.string().nullable(),
    })
    .strict(),
  z
    .object({
      layer: z.literal("tumors"),
      gene: z.literal("WRN"),
      selectedSample: z.string().nullable(),
    })
    .strict(),
]);
export type Configuration = z.infer<typeof configuration>;
export function makeModelDossier(
  data: ModelData,
  gene: Gene,
  unit: Unit,
  selectedId: string | null,
) {
  const analysis = analyzeModels(data, gene, unit);
  if (
    selectedId !== null &&
    !analysis.observations.some((r) => r.id === selectedId)
  )
    throw Error("Selected observation is outside the analysis");
  return {
    dossierVersion: 1,
    configuration: { layer: "models" as const, gene, unit, selectedId },
    dataset: data,
    analysis,
    replay: "npm run replay -- dossier.json",
  };
}
export function makeTumorDossier(
  data: TumorData,
  selectedSample: string | null,
) {
  if (
    selectedSample !== null &&
    !data.records.some((r) => r.sampleId === selectedSample)
  )
    throw Error("Selected sample is outside the cohort");
  return {
    dossierVersion: 1,
    configuration: {
      layer: "tumors" as const,
      gene: "WRN" as const,
      selectedSample,
    },
    dataset: data,
    analysis: {
      coverage: data.coverage,
      transformation: data.coverage.expression_transform,
      pairedSampleIds: data.records
        .filter((r) => r.MSI_SCORE_MANTIS !== null && r.WRN_RSEM !== null)
        .map((r) => r.sampleId),
    },
    replay: "npm run replay -- dossier.json",
  };
}
export function replayDossier(input: unknown) {
  const envelope = z
    .object({
      dossierVersion: z.literal(1),
      configuration,
      dataset: z.unknown(),
      analysis: z.unknown(),
      replay: z.string(),
    })
    .strict()
    .parse(input);
  const config = envelope.configuration;
  return config.layer === "models"
    ? makeModelDossier(
        validate(envelope.dataset),
        config.gene,
        config.unit,
        config.selectedId,
      )
    : makeTumorDossier(validateTumor(envelope.dataset), config.selectedSample);
}
export function modelHash(gene: Gene, unit: Unit, selectedId?: string) {
  const p = new URLSearchParams({ gene, unit });
  if (selectedId) p.set("observation", selectedId);
  return "#" + p;
}
