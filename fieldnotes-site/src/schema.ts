import { z } from "zod/v3";
const text = z.string().min(1),
  number = z.number().finite(),
  count = z.number().int().nonnegative();
const measurement = number.nullable(),
  https = z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"));
export const genes = {
  WRN: "WRN (7486)",
  BRAF: "BRAF (673)",
  KRAS: "KRAS (3845)",
  PCNA: "PCNA (5111)",
  RPL4: "RPL4 (6124)",
} as const;
export type Gene = keyof typeof genes;
export function parseGene(value: string | null): Gene {
  return value !== null && Object.hasOwn(genes, value)
    ? (value as Gene)
    : "WRN";
}
const model = z
  .object({
    ModelID: text,
    PatientID: text,
    CellLineName: text,
    MSIScore: measurement,
    "WRN (7486)": measurement,
    "BRAF (673)": measurement,
    "KRAS (3845)": measurement,
    "PCNA (5111)": measurement,
    "RPL4 (6124)": measurement,
  })
  .strict();
const correlation = z.discriminatedUnion("status", [
  z
    .object({
      status: z.literal("available"),
      n: count,
      spearmanRho: number.min(-1).max(1),
    })
    .strict(),
  z
    .object({
      status: z.literal("unavailable"),
      n: count,
      spearmanRho: z.null(),
    })
    .strict(),
]);
const donor = z
  .object({
    donorId: text,
    modelIds: z.array(text).min(1),
    modelNames: z.array(text).min(1),
    pairedModelCount: count,
    msiScore: number,
    geneEffect: number,
    msiRange: z.tuple([number, number]),
    effectRange: z.tuple([number, number]),
  })
  .strict();
export const modelSchema = z
  .object({
    schemaVersion: z.literal(2),
    evidenceMode: z.literal("continuous-depmap"),
    release: z.literal("10.25452/figshare.plus.27993248.v1"),
    question: text,
    genes: z
      .object({
        WRN: z.literal(genes.WRN),
        BRAF: z.literal(genes.BRAF),
        KRAS: z.literal(genes.KRAS),
        PCNA: z.literal(genes.PCNA),
        RPL4: z.literal(genes.RPL4),
      })
      .strict(),
    models: z.array(model).min(1),
    coverage: z
      .object({ models: count, pairedWRNAndMSI: count, unpaired: count })
      .strict(),
    wrnSummary: z
      .object({ spearmanRho: number.min(-1).max(1), n: count, inference: text })
      .strict(),
    sources: z
      .array(
        z
          .object({
            name: text,
            url: https,
            license: z.literal("CC BY 4.0"),
            licenseUrl: z.literal(
              "https://creativecommons.org/licenses/by/4.0/",
            ),
            attribution: text,
          })
          .strict(),
      )
      .length(1),
    sourceManifest: z
      .array(
        z
          .object({
            file: text,
            source: https,
            md5: z.string().regex(/^[a-f0-9]{32}$/),
            bytes: count.positive(),
            license: z.literal("CC BY 4.0"),
            release: z.literal("DepMap 24Q4 Public"),
          })
          .strict(),
      )
      .length(4),
    limits: z.array(text).min(1),
    donorSensitivity: z
      .object({
        method: text,
        modelLevel: correlation,
        donorLevel: correlation,
        donors: z.array(donor).min(1),
        relatedDonors: count,
        unpairedModels: count,
        limits: z.array(text).min(1),
      })
      .strict(),
  })
  .strict();
const tumor = z
  .object({
    sampleId: text,
    patientId: text,
    sampleType: z.literal("Primary Solid Tumor"),
    MSI_SCORE_MANTIS: measurement,
    WRN_RSEM: measurement,
    WRN_log2_RSEM_plus_1: measurement,
  })
  .strict();
const study = z.literal("coadread_tcga_pan_can_atlas_2018");
export const tumorSchema = z
  .object({
    schemaVersion: z.literal(1),
    evidenceMode: z.literal("tcga-tumor-context"),
    records: z.array(tumor).min(1),
    coverage: z
      .object({
        study,
        profile: z.literal("coadread_tcga_pan_can_atlas_2018_rna_seq_v2_mrna"),
        retrieved_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        samples: count,
        patients: count,
        sample_types: z.object({ "Primary Solid Tumor": count }).strict(),
        observed_measurements: z
          .object({
            MSI_SCORE_MANTIS: count,
            MSI_SENSOR_SCORE: count,
            MUTATION_COUNT: count,
            WRN_RSEM: count,
          })
          .strict(),
        paired_MANTIS_and_WRN: count,
        missing_MANTIS_or_WRN: count,
        expression_transform: z.literal(
          "log2(batch-normalized RSEM + 1); not a dependency score",
        ),
        limits: z.array(text).min(1),
      })
      .strict(),
    sourceManifest: z
      .array(
        z
          .object({
            file: text,
            sha256: z.string().regex(/^[a-f0-9]{64}$/),
            bytes: count.positive(),
          })
          .strict(),
      )
      .length(6),
    source: z
      .object({
        study,
        url: https,
        citation: text,
        license: z.literal("ODbL-1.0"),
        licenseUrl: z.literal("https://opendatacommons.org/licenses/odbl/1-0/"),
        termsSource: https,
        adaptations: text,
      })
      .strict(),
  })
  .strict();
export type ModelData = z.infer<typeof modelSchema>;
export type ModelRow = ModelData["models"][number];
export type TumorData = z.infer<typeof tumorSchema>;
export type TumorRow = TumorData["records"][number];
