import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { readFile, writeFile, mkdir, rm, copyFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { validate } from "../.compiled/contract.js";
import { validateTumor } from "../.compiled/contract.js";
const root = new URL("../", import.meta.url);
const data = validate(
  JSON.parse(
    await readFile(new URL("src/continuous-evidence.json", root), "utf8"),
  ),
);
const { validateUncertainty } = await import("../.compiled/uncertainty.js");
await validateUncertainty(JSON.parse(await readFile(new URL("src/fieldnotes-uncertainty.json", root), "utf8")), data);
const expectedGenes = {
  WRN: "WRN (7486)",
  BRAF: "BRAF (673)",
  KRAS: "KRAS (3845)",
  PCNA: "PCNA (5111)",
  RPL4: "RPL4 (6124)",
};
if (JSON.stringify(data.genes) !== JSON.stringify(expectedGenes))
  throw Error("Unexpected gene schema");
const allowed = new Set([
  "ModelID",
  "PatientID",
  "CellLineName",
  "MSIScore",
  ...Object.values(expectedGenes),
]);
for (const row of data.models)
  if (Object.keys(row).some((k) => !allowed.has(k)))
    throw Error("Unapproved record field");
if (
  data.sources.length !== 1 ||
  data.sources[0].license !== "CC BY 4.0" ||
  data.release !== "10.25452/figshare.plus.27993248.v1"
)
  throw Error("Unexpected licensed source");
if (data.sourceManifest.some((s) => s.license !== "CC BY 4.0"))
  throw Error("Unexpected manifest license");
validateTumor(
  JSON.parse(await readFile(new URL("src/tumor-evidence.json", root), "utf8")),
);
const out = new URL("dist/", root);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const files = [
  "index.html",
  "newsreader.woff2",
  "plex-sans.woff2",
  "newsreader-OFL.txt",
  "ibmplexsans-OFL.txt",
  "fieldnotes-uncertainty.json",
  "style.css",
  "continuous-evidence.json",
  "ATTRIBUTION.txt",
  "tumor-evidence.json",
  "TUMOR_ATTRIBUTION.txt",
  "THIRD_PARTY_NOTICES.txt",
];
const records = [];
for (const file of files) {
  const bytes = await readFile(new URL("src/" + file, root));
  await copyFile(new URL("src/" + file, root), new URL(file, out));
  records.push({
    file,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await build({
  entryPoints: [fileURLToPath(new URL("src/continuous.ts", root))],
  outfile: fileURLToPath(new URL("continuous.js", out)),
  bundle: true,
  format: "esm",
  target: "es2022",
  minify: true,
  legalComments: "eof",
});
const bytes = await readFile(new URL("continuous.js", out));
records.push({
  file: "continuous.js",
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
});
await writeFile(
  new URL("build-manifest.json", out),
  JSON.stringify(
    {
      schemaVersion: 1,
      evidenceMode: data.evidenceMode,
      release: data.release,
      files: records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Validated separate-evidence build: ${records.length} files, ${records.reduce((s, r) => s + r.bytes, 0)} bytes.`,
);
