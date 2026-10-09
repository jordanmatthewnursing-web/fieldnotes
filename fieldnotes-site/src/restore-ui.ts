import {
  MAX_DOSSIER_BYTES,
  verifySavedDossier,
  restoreHash,
} from "./restore.js";
export function setupDossierRestore() {
  const file = document.querySelector<HTMLInputElement>("#dossier-file")!;
  const status = document.querySelector<HTMLElement>("#dossier-status")!;
  const open = document.querySelector<HTMLButtonElement>("#dossier-open")!;
  let generation = 0,
    hash: string | undefined;
  file.addEventListener("change", async () => {
    const token = ++generation;
    hash = undefined;
    open.hidden = true;
    file.removeAttribute("aria-invalid");
    const chosen = file.files?.[0];
    if (!chosen) {
      status.textContent =
        "Choose an observation dossier exported by Fieldnotes.";
      return;
    }
    status.textContent = "Checking the saved analysis on this device…";
    try {
      if (chosen.size > MAX_DOSSIER_BYTES)
        throw Error(
          "Choose a Fieldnotes observation dossier smaller than 2 MB.",
        );
      const dossier = verifySavedDossier(await chosen.text());
      const response = await fetch(
        dossier.configuration.layer === "models"
          ? "continuous-evidence.json"
          : "tumor-evidence.json",
        { signal: AbortSignal.timeout(10000) },
      );
      if (!response.ok)
        throw Error(
          "The current snapshot is unavailable. Try again when it loads.",
        );
      const target = restoreHash(dossier, await response.json());
      if (token !== generation) return;
      hash = target;
      const c = dossier.configuration;
      status.textContent =
        c.layer === "models"
          ? `Verified against this snapshot: ${c.gene} · ${c.unit === "donors" ? "donor medians" : "individual models"}${c.selectedId ? " · saved observation included" : ""}.`
          : "Verified against this snapshot: human-tumor context" +
            (c.selectedSample ? " · saved sample included." : ".");
      open.hidden = false;
    } catch (error) {
      if (token !== generation) return;
      file.setAttribute("aria-invalid", "true");
      status.textContent =
        error instanceof Error &&
        /^(Choose a Fieldnotes|The saved analysis|This dossier uses|The current snapshot)/.test(
          error.message,
        )
          ? error.message
          : "This file could not be verified. Choose an unmodified Fieldnotes observation dossier (JSON). Your current view has not changed.";
    } finally {
      if (token === generation) file.value = "";
    }
  });
  open.addEventListener("click", () => {
    if (!hash) return;
    location.hash = hash;
    location.reload();
  });
}
