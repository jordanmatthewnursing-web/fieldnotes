import { makeTumorDossier } from "./dossier.js";
import { $, esc, fmt } from "./dom.js";
import { validateTumor } from "./contract.js";
import type { TumorData, TumorRow } from "./schema.js";
let snapshot: TumorData | undefined, selected: TumorRow | undefined;
export function readTumor() {
  if (!snapshot) throw Error("Tumor evidence unavailable");
  return {
    layer: "tumors",
    selectedSample: selected?.sampleId ?? null,
    coverage: snapshot.coverage,
    source: snapshot.source,
  };
}
export async function showTumor() {
  selected = undefined;
  $("#export").disabled = true;
  $("#workspace").setAttribute("aria-busy", "true");
  $("#workspace").innerHTML =
    '<p role="status">Loading the tumor evidence…</p>';
  try {
    if (!snapshot) {
      const r = await fetch("tumor-evidence.json");
      if (!r.ok) throw Error("Unavailable");
      snapshot = validateTumor(await r.json());
    }
    if (new URLSearchParams(location.hash.slice(1)).get("layer") !== "tumors")
      return;
    render();
  } catch {
    if (new URLSearchParams(location.hash.slice(1)).get("layer") !== "tumors")
      return;
    $("#workspace").innerHTML =
      '<p role="alert">Tumor evidence could not be loaded. Cell-model evidence remains available.</p>';
    $("#workspace").setAttribute("aria-busy", "false");
  }
}
function render() {
  const d = snapshot;
  if (!d) return;
  const phone = matchMedia("(max-width:760px)").matches,
    W = phone ? 380 : 840,
    H = 350,
    L = 45,
    R = 20,
    T = 20,
    B = 60,
    rows = d.records.filter(
      (r) => r.MSI_SCORE_MANTIS !== null && r.WRN_RSEM !== null,
    );
  const x = (v: number) => L + ((v - 0.15) / 1.35) * (W - L - R),
    y = (v: number) => T + ((11 - v) / 11) * (H - T - B);
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="WRN expression against continuous MANTIS MSI score in human tumor samples. Values are also available in the table.">`;
  for (let tick = 0; tick <= 10; tick += 2)
    svg += `<line x1="${L}" x2="${W - R}" y1="${y(tick)}" y2="${y(tick)}" stroke="#d8ded3"/><text x="${L - 10}" y="${y(tick) + 5}" text-anchor="end">${tick}</text>`;
  for (const tick of [0.2, 0.6, 1, 1.4])
    svg += `<text x="${x(tick)}" y="${H - 30}" text-anchor="middle">${tick}</text>`;
  for (const r of rows)
    svg += `<circle class="point" data-sample="${esc(r.sampleId)}" cx="${x(r.MSI_SCORE_MANTIS!)}" cy="${y(r.WRN_log2_RSEM_plus_1!)}" r="3.5" fill="#35644b" opacity=".45"><title>${esc(r.sampleId)}</title></circle>`;
  svg += `<text x="${W / 2}" y="${H - 5}" text-anchor="middle">MANTIS MSI score · continuous</text></svg>`;
  $("#workspace").innerHTML =
    `<div class="grid"><div><h2>WRN expression in human tumors</h2><p class="sub">log₂(RSEM + 1) · batch-normalized RNA expression</p>${svg}<p class="notice">MANTIS and DepMap MSI scores use different scales. No sample-level matching to cell models is performed.</p></div><aside><div class="eyebrow">PAIRED MEASUREMENTS</div><div class="stat">${rows.length} / ${d.records.length}</div><p class="sub">${d.coverage.missing_MANTIS_or_WRN} samples lack at least one measurement. They remain in the table.</p><p class="sub">Expression provides tumor context. It does not measure WRN dependency or treatment response.</p><div class="detail" id="detail"><h3>Inspect a tumor sample</h3><p class="sub">Choose a point or table row.</p></div></aside></div><h2>Samples <span class="sub">${d.records.length} records</span></h2><div class="tablewrap" tabindex="0" aria-label="Scrollable tumor sample table"><table><thead><tr><th scope="col">Sample</th><th scope="col">MANTIS score</th><th scope="col">WRN expression</th></tr></thead><tbody>${d.records.map((r) => `<tr data-row="${esc(r.sampleId)}"><td><button data-sample="${esc(r.sampleId)}">${esc(r.sampleId)}</button></td><td>${fmt(r.MSI_SCORE_MANTIS)}</td><td>${fmt(r.WRN_log2_RSEM_plus_1)}</td></tr>`).join("")}</tbody></table></div>`;
  $("#workspace").setAttribute("aria-busy", "false");
  $("#export").disabled = false;
  const restore = new URLSearchParams(location.hash.slice(1)).get("sample");
  if (restore) {
    inspect(restore, false);
    if (!selected) {
      const p = new URLSearchParams(location.hash.slice(1));
      p.delete("sample");
      history.replaceState(null, "", "#" + p);
    }
  }
  document
    .querySelectorAll<HTMLElement | SVGElement>("[data-sample]")
    .forEach((el) => (el.onclick = () => inspect(el.dataset.sample)));
  $("#export").onclick = () => {
    const out = makeTumorDossier(d, selected?.sampleId ?? null);
    const url = URL.createObjectURL(
        new Blob([JSON.stringify(out, null, 2)], { type: "application/json" }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = "wrn-tumor-context.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
}
function inspect(id: string | undefined, openDialog = true) {
  if (!snapshot) return;
  selected = snapshot.records.find((r) => r.sampleId === id);
  if (!selected) return;
  const r = selected;
  const html = `<h3>${esc(r.sampleId)}</h3><dl><dt>Source patient</dt><dd>${esc(r.patientId)}</dd><dt>Sample type</dt><dd>${esc(r.sampleType)}</dd><dt>MANTIS score</dt><dd>${fmt(r.MSI_SCORE_MANTIS)}</dd><dt>RSEM</dt><dd>${fmt(r.WRN_RSEM)}</dd><dt>log₂(RSEM + 1)</dt><dd>${fmt(r.WRN_log2_RSEM_plus_1)}</dd></dl>`;
  $("#detail").innerHTML = html;
  $("#mobile-detail").innerHTML = html;
  document
    .querySelectorAll<HTMLElement | SVGElement>("[data-row],[data-sample]")
    .forEach((el) =>
      el.classList.toggle(
        "selected",
        (el.dataset.row || el.dataset.sample) === id,
      ),
    );
  $("#announcement").textContent =
    `Selected tumor ${r.sampleId}. MANTIS ${fmt(r.MSI_SCORE_MANTIS)}; expression ${fmt(r.WRN_log2_RSEM_plus_1)}.`;
  const p = new URLSearchParams(location.hash.slice(1));
  p.set("sample", r.sampleId);
  history.replaceState(null, "", "#" + p);
  if (openDialog && matchMedia("(max-width:760px)").matches)
    $("#observation-dialog").showModal();
}
