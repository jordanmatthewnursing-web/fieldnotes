# Fieldnotes: continuous-score evidence

Public research prototype. Static site with public cell-model data and deidentified public tumor observations. No private patient records or clinical predictions.

## Install, test and preview

Use Node.js 22 or later. The lockfile pins the compiler, bundler, schema validator and browser-test dependencies. The deployed page serves one bundled JavaScript file; it does not load packages from a CDN.

```sh
npm ci
npx playwright install chromium
npm test
npm run preview
```

On Linux, browser installation may require `npx playwright install --with-deps chromium`.
`npm test` compiles all interface TypeScript under strict checking, validates both data contracts, builds the explicit eight-file asset bundle, and
starts an isolated loopback server on an available port for browser tests. The server
closes when the checks finish. No sibling checkout, Python server, global Playwright,
local Codex runtime or fixed test port is required.

Results and screenshots are written to ignored `artifacts/`. Tests cover desktop and
phone model/tumor workflows, separate exports, URL restoration, keyboard selection,
phone dialog focus return, failed tumor loading and scoped axe accessibility checks.
These scans do not establish full screen-reader accessibility.

`npm run preview` serves the current `dist/` build on http://127.0.0.1:4173;
set `PORT` to use another port. Run `npm run build` after source changes.
For an already installed supported browser, `BROWSER_CHANNEL=chrome npm test` is an
optional alternative to the Playwright Chromium download.

The build validates the pinned datasets, allows only approved model fields, and
packages eight explicit assets plus their SHA-256 manifest. Separate attribution is
recorded in `src/ATTRIBUTION.txt` and `src/TUMOR_ATTRIBUTION.txt`. No manuscript labels
or historical categorical comparisons are bundled.

The reproducible upstream pipeline is in the sibling cancer-dependency-workbench project,
`scripts/build_continuous_dataset.py`. It verifies raw-source checksums before generating
the snapshot. This Site carries its small derived snapshot and source manifest for inspection.

Current scope: five genes, continuous-score scatterplot, model inspection, missing measurements,
URL-selected gene and export. The main chart can use individual models or donor medians. A separate WRN sensitivity aggregates
complete measurement pairs within donors and compares the resulting correlation. TCGA tumor context is a separate hosted evidence layer; historical MSI/MSS labels remain local. This is not the finished flagship.

## Verification before first private publication

Built-output workflow checks passed at 1440px and 390px: 96 rows / 63 paired points,
gene persistence, inspection, phone focus return, and exports with no historical labels
or comparator correlation statistics. Axe WCAG A/AA scans returned zero violations for
both viewport overview/selection states. This is not full screen-reader certification.
The optional WebMCP read-current-evidence tool is feature-detected; supported runtime
validation was unavailable, so agent-tool support is not claimed as verified.

## Donor sensitivity milestone

63 paired WRN models collapse to 61 donor groups; Spearman rho changes from −0.603101 to −0.603823. Two related-model groups are documented. Only complete pairs enter the aggregation, preventing synthetic pairs from complementary missing data. This reduces repeated donor representation, not all confounding. Runtime validation verifies membership, coverage and donor medians against source records. Seventeen upstream Python analysis/download tests pass; isolated replay matches both hosted datasets byte-for-byte. Updated browser checks verify expanded donor details and exported counts at desktop/phone sizes; automated accessibility scans remain clear in the tested states.


## Separate tumor evidence layer

TCGA PanCancer Atlas colorectal samples via cBioPortal: 594 samples, 555 with paired
MANTIS/WRN expression. This layer uses log2(RSEM + 1), not Chronos gene effect; MANTIS
and DepMap MSI scores are not harmonized. No sample-level join to DepMap is attempted.
The ODbL derivative is supplied as tumor-evidence.json with its own attribution notice;
DepMap retains its distinct CC BY license. The upstream script build_tumor_dataset.py
checks source hashes and exports six allowed fields. Runtime/build checks validate IDs,
expression transform, missingness, permitted fields, provenance and cohort counts.

Desktop/phone verification: 594 rows/555 points, selected-sample export, distinct data
license, view reload, model gene restoration, failed tumor fetch with model recovery,
and zero axe violations on the checked tumor overview. Six corruptions were rejected
by the tumor contract tests. Full screen-reader validation remains outstanding.

## Typed data boundary

All browser application source is TypeScript with strict checking (`npm run typecheck`).
`src/schema.ts` defines separate model and tumor schemas; application types are inferred
from those runtime schemas. JSON enters validation as `unknown`. Unknown fields,
nonfinite measurements, missing fields, incorrect gene mappings and incompatible
licenses are rejected. No `any` or TypeScript suppression is used in application source.

`src/contract.ts` then checks relationships that a structural schema cannot establish:
unique identities, coverage, complete-pair donor membership, donor names/medians/ranges,
related-donor counts, tied-rank Spearman summaries, tumor patient identity and expression
transforms. The same validators run before packaging and in the browser before display.
Twenty model and fifteen tumor corruption cases are tested, plus tied ranks and
unavailable correlations. Browser fault checks confirm corrupt datasets cannot render or
export, while the independent evidence layer remains usable.

The runtime uses the Zod package's v3 entry point to keep the validator bundle smaller;
its MIT notice ships in `THIRD_PARTY_NOTICES.txt`. Source snapshots, licenses and the
biological interpretation remain unchanged. Schema validation checks consistency; it
does not authenticate a publisher or validate the scientific usefulness of the tool.

The browser application is compiled and bundled with esbuild. Build output contains an
explicit asset list and SHA-256 manifest. TypeScript sources, package files, tests and raw
research data are not deployed. Performance evidence is recorded in PERFORMANCE.md. Final scientific review and the technical case study remain outstanding.

## Configurable and replayable dossiers

Choose a gene and observation unit: individual models or medians within source donors.
Each donor aggregation first selects models with both measurements for that gene. The
interface reports the included pairs and excluded models; it never creates a pair from
complementary missing values. Chart axes remain fixed across genes and units. Only WRN
receives a descriptive correlation; comparator views do not receive inferential tests.

URL state includes gene, unit and selected model/donor. The tumor layer retains its own
selected sample and restores the model gene/unit when returning. Reloading a selection
highlights it without automatically opening a phone dialog.

New exports use **dossierVersion 1**, with separate `configuration`, validated `dataset`,
and recomputable `analysis`. This replaces the earlier unversioned export envelope.
Each export contains one evidence layer with its own license; it does not merge tumor
observations with cell models. Model dossiers carry the full source dataset, including
the prespecified WRN reference summary, while `analysis` describes the selected gene/unit.

```sh
npm run replay -- downloaded-dossier.json
npm run replay -- downloaded-dossier.json replayed.json
```

The command validates the embedded dataset/configuration, recalculates the analysis,
and rejects a mismatch with the exported result. It needs no network after dependencies
are installed. The first command only checks; the second also writes the replayed dossier.
It does not authenticate the origin of a file. The separate Python pipeline reproduces
the source datasets from pinned inputs.

Tests cover all ten gene/unit combinations, WRN donor agreement with the Python output,
selected-sample tumor replay, invalid configuration/selection, and CLI rejection of an
altered analysis. Desktop/phone browser tests cover donor rows/points, exported replay,
selection after reload, gene/unit restoration across layers, and scoped axe checks.

## Performance

`npm run measure` runs five fresh contexts for each desktop and throttled-phone profile, with raw results in `artifacts/performance.json`. See PERFORMANCE.md for conditions, budgets, measured outcomes and limits.

Selected plotted observations now receive a direct label and axis guides. Small-sample correlation rules agree across Python and TypeScript: fewer than three pairs or constant measurements are unavailable, never zero. The design remains under active review alongside technical completion.

## Donor uncertainty

WRN donor mode includes a nominal 95% paired BCa interval, assumptions and a separate `fieldnotes-uncertainty.json` download. It embeds the exact dataset text and its SHA-256. Runtime and build contracts verify snapshot identity, point estimate, donor coverage and all leave-one-donor-out correlations. Browser validation does not recompute the bootstrap. In the research repository, run `.venv/bin/python scripts/replay_uncertainty.py fieldnotes-uncertainty.json` to recompute and verify it in the pinned Python environment. Existing version-1 observation dossiers remain unchanged. Missing uncertainty leaves the model workflow available.

## Dense-point inspection

Selecting an observation reveals all plotted neighbors within 18 rendered screen pixels, when there is more than one. The inspector lists exact names and measurements; buttons change selection without moving points. The neighborhood is recalculated around the new selection. It is a visual proximity aid, not a biological grouping. Keyboard selection restores focus after the inspector updates; the same workflow works inside the phone dialog. The table remains available for exact selection.

## Type and composition

Newsreader frames the question; IBM Plex Sans carries the working interface and data. WOFF2 files are served locally with swap/fallback behavior. Sources, SHA-256 and sizes are recorded in font-sources.json; OFL notices ship with the site. Supporting WRN analyses occupy a separate responsive row below the chart, leaving the inspector beside the plotted evidence. Font loading and fallback were checked at 320/390/1440px; measured loading costs are recorded in PERFORMANCE.md.

## Browser evidence-reading consistency

The optional read_current_evidence browser tool reports the selected gene and observation unit using the same analysis as the chart/export. It separates current analysis coverage from raw source coverage, omits WRN correlation for comparators, preserves the independent tumor layer and rejects unavailable evidence. Browser regression checks capture the tool and exercise these state transitions.

## Reopen an observation dossier

Use “Reopen a saved dossier” beneath the evidence toolbar. Choose an existing version-1 observation JSON (up to 2 MiB). The browser validates its dataset and configuration, recomputes the analysis, rejects altered analysis, then compares the full embedded dataset with the currently hosted snapshot. Only a matching snapshot can open the saved gene/unit/observation or tumor sample. Object key order is ignored; array order is preserved. No uploaded file, arbitrary data URL, new cohort or cross-layer join is introduced. Uncertainty exports remain a separate format with their existing Python replay.

An explicit Open saved view action reloads the page with validated selection state. Invalid input leaves the existing chart and URL untouched and removes any earlier Open action. The file content is processed locally; only fixed public snapshot GETs are requested. Matching data establishes consistency, not publisher authenticity or clinical validity.

October 3 verification: existing contract suite and seven new restore checks passed. Browser file chooser exercised valid BRAF donor restoration, changed-result rejection without chart/URL mutation, then valid tumor recovery with the exact selected sample. The 390px expanded panel was visually reviewed and had no horizontal overflow. No physical-phone file chooser, full screen-reader, user-value validation or full browser regression rerun claimed.
