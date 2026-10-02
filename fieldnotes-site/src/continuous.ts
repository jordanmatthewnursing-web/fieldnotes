import { validateUncertainty, uncertaintyPanel, type Uncertainty } from "./uncertainty.js";
import {
  analyzeModels,
  makeModelDossier,
  modelHash,
  parseUnit,
  type Observation,
} from "./dossier.js";
import { $, esc, fmt } from "./dom.js";
import { parseGene, type ModelData } from "./schema.js";
import { showTumor, readTumor } from "./tumor.js";
import { validate } from "./contract.js";
let uncertainty: Uncertainty | undefined;
let uncertaintyFailed = false;
const mobile = matchMedia("(max-width:760px)");
let data: ModelData | undefined, selected: Observation | undefined;
const params = new URLSearchParams(location.hash.slice(1));
let gene = parseGene(params.get("gene"));
let unit = parseUnit(params.get("unit"));
let restoreId = params.get("observation") ?? undefined;
function chart() {
  const d = data;
  if (!d) return "";
  const W = mobile.matches ? 380 : 840,
    H = 350,
    L = 50,
    R = 20,
    T = 20,
    B = 65;
  const pairs = analyzeModels(d, gene, unit).observations.filter(
    (r) => r.msi !== null && r.effect !== null,
  );
  const xs = d.models.map((r) => r.MSIScore).filter((v) => v !== null),
    ys = d.models
      .flatMap((r) => Object.values(d.genes).map((k) => r[k]))
      .filter((v) => v !== null);
  const xmin = Math.floor(Math.min(...xs) * 10) / 10,
    xmax = Math.ceil(Math.max(...xs) * 10) / 10,
    ymin = Math.floor(Math.min(...ys)),
    ymax = Math.ceil(Math.max(...ys));
  const x = (v: number) => L + ((v - xmin) / (xmax - xmin)) * (W - L - R),
    y = (v: number) => T + ((ymax - v) / (ymax - ymin)) * (H - T - B);
  let out = `<svg data-plot-left="${L}" data-plot-bottom="${H - B}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${gene} gene effect by continuous MSI score; observations are also available in the table.">`;
  for (let t = ymin; t <= ymax; t++)
    out += `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="#d8ded3"/><text x="${L - 12}" y="${y(t) + 5}" text-anchor="end">${t}</text>`;
  for (let i = 0; i <= 4; i++) {
    const tick = xmin + ((xmax - xmin) * i) / 4;
    out += `<text x="${x(tick)}" y="${H - 32}" text-anchor="middle">${tick.toFixed(2)}</text>`;
  }
  for (const r of pairs)
    out += `<circle class="point" data-id="${esc(r.id)}" cx="${x(r.msi!)}" cy="${y(r.effect!)}" r="5" fill="#35644b" opacity=".7"><title>${esc(r.name)} · ${fmt(r.effect)}</title></circle>`;
  return (
    out +
    `<text x="${W / 2}" y="${H - 4}" text-anchor="middle">DepMap MSI score · continuous</text></svg>`
  );
}
function render() {
  const d = data;
  if (!d) return;
  if (!Object.hasOwn(d.genes, gene)) gene = "WRN";
  const analysis = analyzeModels(d, gene, unit);
  const selection = restoreId ?? selected?.id;
  selected = analysis.observations.find((r) => r.id === selection);
  restoreId = undefined;
  history.replaceState(null, "", modelHash(gene, unit, selected?.id));
  const summary = analysis.summary;
  $("#workspace").innerHTML =
    `<div class="grid"><div><div class="charthead"><div><h2>${gene} gene effect</h2><div class="sub">Chronos score · more negative means stronger depletion</div></div><div class="cohort-controls"><label>Gene<select id="gene">${Object.keys(
      d.genes,
    )
      .map((g) => `<option ${g === gene ? "selected" : ""}>${g}</option>`)
      .join(
        "",
      )}</select></label><label>Observation unit<select id="unit"><option value="models" ${unit === "models" ? "selected" : ""}>Individual models</option><option value="donors" ${unit === "donors" ? "selected" : ""}>Donor medians</option></select></label></div></div>${chart()}<p class="notice">${analysis.coverage.plotted} paired ${unit === "models" ? "models" : "donor groups"} from ${analysis.coverage.completeModels} complete model pairs. ${analysis.coverage.excludedFromPairs} of ${analysis.coverage.sourceModels} source models lack one or both measurements. ${unit === "models" ? "Unpaired models remain in the table." : "Only complete pairs enter donor aggregation."} Gene-effect scales stay fixed.</p><details class="analysis-method"><summary>Analysis choices &amp; provenance</summary><p class="sub">Colorectal adenocarcinoma · DepMap 24Q4 Public v1 · ${esc(analysis.aggregation)}</p><p class="sub">${esc(analysis.pairing)} Changing the observation unit changes the weighting of related models; it does not control other confounders.</p><p class="sub">${esc(analysis.multipleComparisons)} Every export includes the validated source snapshot, configuration and results for command-line replay.</p><a href="ATTRIBUTION.txt">Source attribution</a></details></div><aside><div class="eyebrow">${gene === "WRN" ? "SPEARMAN CORRELATION" : "DESCRIPTIVE COMPARATOR"}</div><div class="stat">${gene === "WRN" ? fmt(summary.spearmanRho ?? null) : gene}</div><p class="sub">${gene === "WRN" ? `${unit === "models" ? "Model-level" : "Donor-median"} association. No causal or clinical conclusion.` : "No hypothesis test, target ranking or inferred MSI category."}</p><div class="detail" id="detail"><h3>Inspect an observation</h3><p class="sub">Choose a point or row to inspect its source models.</p></div>${gene === "WRN" && unit === "donors" ? uncertaintyPanel(uncertainty, uncertaintyFailed) : ""}${gene === "WRN" ? donorPanel() : ""}</aside></div><h2>Observations <span class="sub">${analysis.observations.length} records</span></h2><div class="tablewrap" tabindex="0" aria-label="Scrollable observation table"><table><thead><tr><th scope="col">${unit === "models" ? "Model" : "Source models"}</th><th scope="col">MSI score</th><th scope="col">${gene} effect</th></tr></thead><tbody>${analysis.observations.map((r) => `<tr data-row="${esc(r.id)}"><td><button data-id="${esc(r.id)}">${esc(r.name)}</button></td><td>${fmt(r.msi)}</td><td>${fmt(r.effect)}</td></tr>`).join("")}</tbody></table></div>`;
  const support = document.createElement("div");
  support.className = "supporting-evidence";
  document.querySelectorAll("#workspace .uncertainty, #workspace .donor-check").forEach(panel => support.append(panel));
  if (support.childElementCount) document.querySelector("#workspace .grid")!.after(support);
  $("#workspace").setAttribute("aria-busy", "false");
  $("#gene").onchange = () => {
    gene = parseGene($("#gene").value);
    selected = undefined;
    render();
    $("#gene").focus();
  };
  $("#unit").onchange = () => {
    unit = parseUnit($("#unit").value);
    selected = undefined;
    render();
    $("#unit").focus();
  };
  if (selected) inspect(selected.id, false);
  document
    .querySelectorAll<HTMLElement | SVGElement>("[data-id]")
    .forEach((el) => (el.onclick = () => inspect(el.dataset.id)));
}
function donorPanel() {
  if (!data) return "";
  const d = data.donorSensitivity;
  return `<section class="donor-check" aria-label="Donor sensitivity"><h3>Does the result depend on related models?</h3><dl><dt>Individual models · ${d.modelLevel.n}</dt><dd>${fmt(d.modelLevel.spearmanRho)}</dd><dt>Donor medians · ${d.donorLevel.n}</dt><dd>${fmt(d.donorLevel.spearmanRho)}</dd></dl><p class="sub">${d.relatedDonors} donor groups contain multiple paired models.</p><details><summary>How this check works</summary><p class="sub">Keep models with both measurements, then take each measurement's median within a donor. This reduces repeated representation of donors; it doesn't control other differences between models.</p>${d.donors
    .filter((r) => r.pairedModelCount > 1)
    .map(
      (r) =>
        `<p class="sub"><strong>${r.modelNames.map(esc).join(" / ")}</strong><br>${esc(r.donorId)} · ${r.pairedModelCount} paired models</p>`,
    )
    .join("")}</details></section>`;
}
function nearbyPoints(id: string) {
  const points = [...document.querySelectorAll<SVGCircleElement>("svg[data-plot-left] circle.point")];
  const chosen = points.find(p => p.dataset.id === id);
  if (!chosen || !data) return "";
  const center = (p: SVGCircleElement) => { const r = p.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; };
  const origin = center(chosen);
  const nearby = points.map(p => ({id:p.dataset.id!, position:center(p)}))
    .filter(p => Math.hypot(p.position.x-origin.x,p.position.y-origin.y) <= 18);
  if (nearby.length < 2) return "";
  const rows = analyzeModels(data,gene,unit).observations.filter(r => nearby.some(p => p.id === r.id));
  return `<section class="nearby" aria-label="Nearby plotted observations"><h4>${rows.length} points in this area</h4><p class="sub">Within 18 screen pixels of this point. Proximity is visual, not a biological group.</p><div class="nearby-list">${rows.map(r => `<button data-nearby="${esc(r.id)}" aria-pressed="${r.id === id}"><span>${esc(r.name)}</span><small>MSI ${fmt(r.msi)} · effect ${fmt(r.effect)}</small></button>`).join("")}</div></section>`;
}
function inspect(id: string | undefined, openDialog = true) {
  const d = data;
  if (!d) return;
  selected = analyzeModels(d, gene, unit).observations.find((r) => r.id === id);
  if (!selected) return;
  const r = selected,
    markup = `<h3>${esc(r.name)}</h3><dl><dt>Source model IDs</dt><dd>${esc(r.modelIds.join(", "))}</dd><dt>Source donor</dt><dd>${esc(r.donorId)}</dd><dt>MSI score</dt><dd>${fmt(r.msi)}</dd><dt>${gene} effect</dt><dd>${fmt(r.effect)}</dd></dl>${nearbyPoints(r.id)}`;
  $("#detail").innerHTML = markup;
  $("#mobile-detail").innerHTML = markup;
  for (const container of [$("#detail"), $("#mobile-detail")]) {
    container.querySelectorAll<HTMLButtonElement>("[data-nearby]").forEach(button => {
      button.onclick = () => {
        const next = button.dataset.nearby;
        inspect(next, false);
        // The inspector is replaced; restore focus to the selected button in the same surface.
        [...container.querySelectorAll<HTMLButtonElement>("[data-nearby]")].find(b => b.dataset.nearby === next)?.focus();
      };
    });
  }
  document
    .querySelectorAll<HTMLElement | SVGElement>("[data-row],circle[data-id]")
    .forEach((el) =>
      el.classList.toggle("selected", (el.dataset.row || el.dataset.id) === id),
    );
  drawSelectionGuide();
  $("#announcement").textContent =
    `Selected ${r.name}. MSI score ${fmt(r.msi)}. ${gene} effect ${fmt(r.effect)}.`;
  history.replaceState(null, "", modelHash(gene, unit, selected.id));
  if (mobile.matches && openDialog) $("#observation-dialog").showModal();
}
function drawSelectionGuide() {
  const svg = document.querySelector<SVGSVGElement>("#workspace svg");
  if (!svg) return;
  svg.querySelector(".selection-guide")?.remove();
  svg.classList.toggle("has-selection", !!selected);
  const point = svg.querySelector<SVGCircleElement>("circle.selected");
  if (!selected || !point) return;
  const x = Number(point.getAttribute("cx")),
    y = Number(point.getAttribute("cy"));
  const left = Number(svg.dataset.plotLeft),
    bottom = Number(svg.dataset.plotBottom);
  const width = svg.viewBox.baseVal.width;
  const label =
    selected.name.length > 25
      ? selected.name.slice(0, 24) + "…"
      : selected.name;
  const boxWidth = Math.min(240, Math.max(110, label.length * 8 + 24));
  const boxX =
    x + boxWidth + 16 < width - 10 ? x + 12 : Math.max(left, x - boxWidth - 12);
  const boxY = Math.max(4, y - 36);
  svg.insertAdjacentHTML(
    "beforeend",
    `<g class="selection-guide" aria-hidden="true"><path d="M ${left} ${y} H ${x} V ${bottom}"/><rect x="${boxX}" y="${boxY}" width="${boxWidth}" height="27" rx="2"/><text x="${boxX + 10}" y="${boxY + 18}">${esc(label)}</text></g>`,
  );
}
$("#close-observation").onclick = () => $("#observation-dialog").close();
$("#export").onclick = () => {
  const d = data;
  if (!d) return;
  const result = makeModelDossier(d, gene, unit, selected?.id ?? null);
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `${gene.toLowerCase()}-continuous-dossier.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
try {
  const r = await fetch("continuous-evidence.json");
  if (!r.ok) throw Error("Missing dataset");
  data = validate(await r.json());
  render();
  $("#export").disabled = false;
  void fetch("fieldnotes-uncertainty.json").then(async response => {
    if (!response.ok) throw Error("Uncertainty unavailable");
    uncertainty = await validateUncertainty(await response.json(), data!);
  }).catch(() => { uncertaintyFailed = true; }).finally(() => {
    const panel = document.querySelector(".uncertainty");
    if (panel) panel.outerHTML = uncertaintyPanel(uncertainty, uncertaintyFailed);
  });
  $("#sources").innerHTML =
    '<p><a href="https://doi.org/10.25452/figshare.plus.27993248.v1">DepMap 24Q4 Public v1</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p><p>Adaptation: colorectal subset, five gene-effect columns, continuous MSI score, and a WRN correlation summary.</p>';
} catch {
  data = undefined;
  $("#export").disabled = true;
  $("#workspace").innerHTML =
    '<p role="alert">The continuous evidence could not be loaded. No results have been substituted.</p>';
  $("#workspace").setAttribute("aria-busy", "false");
}
mobile.addEventListener("change", () => {
  if (new URLSearchParams(location.hash.slice(1)).get("layer") === "tumors") {
    if ($("#observation-dialog").open) $("#observation-dialog").close();
    showTumor();
    return;
  }
  if (!data) return;
  if ($("#observation-dialog").open) $("#observation-dialog").close();
  render();
});

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  addEventListener("pagehide", () => lifecycle.abort(), { once: true });
  try {
    Promise.resolve(
      document.modelContext.registerTool(
        {
          name: "read_current_evidence",
          description:
            "Read the selected gene, observation, cohort coverage and source release in this evidence view.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          execute(input) {
            if (
              !input ||
              typeof input !== "object" ||
              Array.isArray(input) ||
              Object.keys(input).length
            )
              throw Error("Expected an empty object");
            if (
              new URLSearchParams(location.hash.slice(1)).get("layer") ===
              "tumors"
            )
              return readTumor();
            if (!data) throw Error("Evidence is unavailable");
            const analysis = analyzeModels(data, gene, unit);
            return {
              layer: "models",
              gene,
              selectedObservation: selected?.id ?? null,
              unit,
              release: data.release,
              coverage: analysis.coverage,
              sourceCoverage: data.coverage,
              summary: analysis.summary,
              aggregation: analysis.aggregation,
              pairing: analysis.pairing,
              limits: data.limits,
            };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => {});
  } catch {}
}

const modelExport = $("#export").onclick,
  modelIntro = $(".intro").innerHTML,
  modelMethod = $(".method").innerHTML;
function activateLayer(tumors: boolean) {
  $("#model-layer").setAttribute("aria-pressed", String(!tumors));
  $("#tumor-layer").setAttribute("aria-pressed", String(tumors));
  if ($("#observation-dialog").open) $("#observation-dialog").close();
  if (tumors) {
    history.replaceState(null, "", `#layer=tumors&gene=${gene}&unit=${unit}`);
    $(".intro").innerHTML =
      '<div class="eyebrow">DOSSIER 001 · HUMAN-TUMOR CONTEXT</div><h1>Where is <em>WRN expressed?</em></h1><p>Inspect WRN expression and continuous MSI scores in a separate TCGA colorectal tumor cohort.</p>';
    $(".method").innerHTML =
      '<h2>A separate layer of evidence.</h2><p>These observations come from human tumors, not the cell-model experiments. Expression does not establish gene dependency, causation or clinical efficacy.</p><p><a href="https://www.cbioportal.org/study/summary?id=coadread_tcga_pan_can_atlas_2018">TCGA PanCancer Atlas via cBioPortal</a> · <a href="TUMOR_ATTRIBUTION.txt">Attribution and ODbL terms</a> · <a href="tumor-evidence.json" download>Download the tumor dataset</a></p>';
    showTumor();
  } else {
    $(".intro").innerHTML = modelIntro;
    $(".method").innerHTML = modelMethod;
    $("#export").onclick = modelExport;
    $("#export").disabled = !data;
    history.replaceState(null, "", modelHash(gene, unit, selected?.id));
    if (data) render();
    else {
      $("#workspace").innerHTML =
        '<p role="alert">The continuous evidence could not be loaded. No results have been substituted.</p>';
      $("#workspace").setAttribute("aria-busy", "false");
    }
  }
}
$("#model-layer").onclick = () => activateLayer(false);
$("#tumor-layer").onclick = () => activateLayer(true);
if (params.get("layer") === "tumors") {
  activateLayer(true);
  if (params.get("sample")) {
    const p = new URLSearchParams(location.hash.slice(1));
    p.set("sample", params.get("sample")!);
    history.replaceState(null, "", "#" + p);
  }
}
