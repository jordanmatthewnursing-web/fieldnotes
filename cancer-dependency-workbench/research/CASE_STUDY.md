# Fieldnotes
## An evidence workbench for a cancer-dependency question

**Status:** working private research prototype. Built by Jordan Matthew with Codex. This is a case-study draft for the future portfolio, not approved public copy.

### The question

How does WRN gene effect vary with continuous MSI score in colorectal cancer cell models—and does the association change when related models are counted once per source donor?

A separate human-tumor cohort adds expression context. It cannot answer whether WRN inhibition benefits a patient.

### What I built

A browser workbench for inspecting five prespecified genes across a pinned DepMap cohort. Readers can switch between individual models and donor medians, inspect the measurements behind a point, see missing-data coverage and download an analysis they can reproduce. A separate TCGA view keeps tumor expression distinct from experimental gene dependency.

### How it works

Python verifies pinned source files, checks one-to-one joins and builds small, licensed data derivatives. TypeScript validates those derivatives again before displaying them. The contracts check identities, coverage, donor membership, medians and recomputed correlations—not only whether a JSON field exists.

The donor analysis selects complete measurement pairs before aggregation. This matters: a model missing an MSI score and another missing gene effect cannot combine into an observation that was never measured. Each source donor then contributes one median pair.

For WRN, a seeded paired BCa bootstrap resamples those donor pairs. A separate leave-one-donor-out calculation checks influence. The interface explains the assumptions beside the interval. Its download includes the exact source text, checksum and analysis; Python replay recomputes the bootstrap and rejects altered results. Ordinary observation downloads retain their existing, separately replayable format.

The app is static because the current workload is fixed public snapshots and modest local calculations. It needs no research database or live API to operate. Model and tumor data have separate attribution and downloads; historical annotations with unresolved redistribution terms are excluded.

### Result

The cohort contains **96 models**, with **63 complete WRN/MSI pairs** representing **61 source donors**. Model-level Spearman correlation is **−0.603**; after donor-median aggregation it is **−0.604**. The donor estimate's nominal 95% bootstrap interval is **−0.762 to −0.384**. Omitting one donor at a time gives correlations from **−0.635 to −0.585**.

The observed association changes little under these two checks. That does not resolve selection, missingness or confounding. These cell models are not a random clinical sample, and the analysis is not independent replication. The separate TCGA layer contains **594 samples**, with **555 paired MSI/expression observations**; it is context, not confirmation of treatment efficacy.

### Engineering evidence

Twenty-three Python tests cover joins, missingness, aggregation, downloads and uncertainty replay. Browser checks exercise desktop and phone layouts, observation selection, URL restoration, export replay and independent-layer failures. Deliberately corrupted datasets and altered analysis outputs are rejected. Scoped automated accessibility scans pass in tested states.

The two deployed evidence datasets were reproduced byte-for-byte in an isolated Python environment using checksum-verified cached inputs. A fresh five-run local throttled-phone test measured a median 2.03-second model-ready time after the typography and uncertainty changes, within the predeclared 3-second budget. This is an emulated local result, not a hosted or physical-phone measurement. No physical-phone, full screen-reader or independent researcher validation is claimed.

### Design decisions

The evidence is the main visual material: a real scatterplot, direct selection labels and source details. The interval uses the same restrained data language. The remaining design work is about hierarchy and reading order—getting the plot onto a phone sooner and keeping a selected observation close to the chart—alongside a broader typography and composition review.

### Repository and reproduction

The public repository has not been published. Analysis source is in this research directory; current interface source is in `../fieldnotes-site`.

- Research: follow the environment setup in `README.md`, then run `.venv/bin/python scripts/reproduce.py`.
- Interface: follow its README, then `npm ci`, `npx playwright install chromium`, and `npm test`.
- Downloaded observation analysis: `npm run replay -- dossier.json` in the interface repository.
- Downloaded uncertainty analysis: `.venv/bin/python scripts/replay_uncertainty.py fieldnotes-uncertainty.json` in the research repository.

### What I'd do next

Finish the visual and accessibility review, then observe whether an independent researcher can inspect, explain and reproduce an observation without guidance. Use that feedback before adding another analysis mode.

---

**Share summary for Jordan/Muse:** Fieldnotes explores WRN dependency in colorectal cell models, with donor sensitivity, explicit uncertainty and reproducible downloads. It demonstrates data validation, scientific restraint and browser engineering. It does not claim a new drug target, clinical prediction or validated adoption.

**Evidence trail:** `ARCHITECTURE.md`, `CONTINUOUS_UNCERTAINTY.md`, `COMPLETION_REVIEW.md`; `../artifacts/reproduction-checks.json`, `../artifacts/uncertainty-integration-checks.json`; interface `PERFORMANCE.md` and browser artifacts. Numeric results come from the pinned project outputs, not a new literature claim.

## Two-minute product walkthrough

1. Open Fieldnotes in the default WRN model view. Identify the 96 source models and 63 complete measurement pairs; explain why missing values remain missing.
2. Switch to donor medians. The plotted cohort becomes 61 donor groups. Compare the estimate with the individual-model result.
3. Select a dense area of the chart. Choose a named nearby observation and inspect its exact source IDs and measurements; the plotted coordinates do not move.
4. Read the supporting uncertainty row. Explain what resampling donors can assess and which biases remain. Download the separate uncertainty dossier for Python replay.
5. Switch to a comparator gene. The app omits the WRN-specific inference rather than applying it to another target. Export the configured observations for TypeScript replay.
6. Switch to human tumors. Identify the separate source, expression measurement, missingness and license. Explain why it does not validate treatment benefit.

The current browser evidence-reading tool uses the same selected-gene/unit analysis as the chart and observation export. The walkthrough exposed and corrected a model-versus-donor summary mismatch; regression checks cover both units, all genes, selected observation, separate tumor context, invalid input and unavailable data.

### Ready to review, still unvalidated

The technical prototype, source-bound downloads, case study and design iteration have concrete verification evidence. The remaining human review is whether this workflow is understandable and useful to its intended researcher, and whether the visual direction meets Jordan’s standard. No external adoption or clinical use is claimed. Physical-phone and full screen-reader testing remain outstanding. Those limits should accompany the portfolio presentation; they are not a reason to invent additional features.
