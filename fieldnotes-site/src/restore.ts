import { replayDossier, modelHash } from "./dossier.js";
export const MAX_DOSSIER_BYTES = 2 * 1024 * 1024;
// JSON object property order has no meaning; array order remains significant.
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (
    a === null ||
    b === null ||
    typeof a !== "object" ||
    typeof b !== "object"
  )
    return false;
  if (Array.isArray(a) || Array.isArray(b))
    return (
      Array.isArray(a) &&
      Array.isArray(b) &&
      a.length === b.length &&
      a.every((v, i) => sameJson(v, b[i]))
    );
  const x = a as Record<string, unknown>,
    y = b as Record<string, unknown>,
    keys = Object.keys(x);
  return (
    keys.length === Object.keys(y).length &&
    keys.every((k) => Object.hasOwn(y, k) && sameJson(x[k], y[k]))
  );
}
export function verifySavedDossier(text: string) {
  if (new TextEncoder().encode(text).length > MAX_DOSSIER_BYTES)
    throw Error("Choose a Fieldnotes observation dossier smaller than 2 MB.");
  const original: unknown = JSON.parse(text);
  const replayed = replayDossier(original);
  const originalAnalysis = (original as { analysis: unknown }).analysis;
  if (!sameJson(originalAnalysis, replayed.analysis))
    throw Error(
      "The saved analysis does not match its data and settings. Your current view has not changed.",
    );
  return replayed;
}
export function restoreHash(
  dossier: ReturnType<typeof replayDossier>,
  currentDataset: unknown,
) {
  if (!sameJson(dossier.dataset, currentDataset))
    throw Error(
      "This dossier uses a different snapshot. It can be checked with the command-line replay tool, but cannot replace the current chart.",
    );
  const c = dossier.configuration;
  if (c.layer === "models")
    return modelHash(c.gene, c.unit, c.selectedId ?? undefined);
  const p = new URLSearchParams({
    layer: "tumors",
    gene: "WRN",
    unit: "models",
  });
  if (c.selectedSample) p.set("sample", c.selectedSample);
  return "#" + p;
}
