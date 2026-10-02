# Initial data dictionary and cohort rules

| Field | Source | Meaning / rule |
| --- | --- | --- |
| ModelID | DepMap Model.csv | Stable model key; unique; joins to effects/signatures |
| PatientID | DepMap Model.csv | Source-donor grouping for related-model sensitivity; not joined to TCGA |
| CCLEName | DepMap Model.csv | Historical line identifier; whitespace stripped before exact manuscript join |
| OncotreePrimaryDisease | DepMap Model.csv | Include exact `Colorectal Adenocarcinoma`; do not include all bowel lineages |
| WRN (7486) | CRISPRGeneEffect.csv | Corrected/scaled Chronos gene effect; retain continuous values |
| BRAF, KRAS, PCNA, RPL4 | CRISPRGeneEffect.csv | Prespecified descriptive comparators; do not infer clinical target ranking |
| MSIScore | OmicsSignatures.csv | Continuous source score; no diagnostic cutoff imposed |
| CCLE_MSI | 2019 supplement | Primary historical category: MSI / MSS; other and absent values remain Unknown |
| GDSC_MSI | 2019 supplement | Additional historical assay annotation; retain disagreements visibly |
| CRISPR_WRN_CERES | 2019 supplement | Older methodology/value; not numerically interchangeable with current Chronos |

## Analysis rules

The primary comparison requires both observed WRN effect and MSI/MSS classification. Unknown classifications are counted and excluded from that contrast, not recoded. No labels are derived from WRN scores. The model-level median difference uses 10,000 bootstrap resamples, fixed seed 20260927, and a percentile interval. An exploratory two-sided Mann–Whitney test accompanies the effect size. The primary question was selected from the published hypothesis, not chosen after ranking genes.

One source donor has two qualifying models. A sensitivity analysis takes the median WRN score per donor/group before recomputing the comparison. Within-donor conflicting classifications cause an assertion failure. Historical assay disagreements are separately flagged; there are none among this first analytical cohort.

The continuous MSIScore sensitivity includes 63 models and uses Spearman correlation. It does not provide an independent validation cohort. Neither a low p-value nor a negative dependency score establishes efficacy in people.

## GDC audit

Saved `gdc-colorectal-case-audit.json` is an initial case-metadata response. Its pagination total is filtered to the requested projects. Its facet response includes other projects and must not be treated as a filtered analytic table. Query actual cases/files to establish the eventual molecular cohort and coverage.

## TCGA tumor-context snapshot — September 28, 2026

Public cBioPortal study `coadread_tcga_pan_can_atlas_2018` contains 594 primary-solid-tumor samples from 594 patients. Sample retrieval agrees with the pinned study's allSampleCount. This curated cohort is not the earlier 633-case GDC catalog query.

- `MSI_SCORE_MANTIS`: 557 observed continuous scores.
- `MSI_SENSOR_SCORE`: 584 observed continuous scores. Its source description gives overlapping MSS/indeterminate ranges; do not copy those into classification logic.
- `WRN_RSEM`: 592 observed values from the batch-normalized RNA Seq V2 RSEM profile, gene 7486. Visualization transform: log2(RSEM + 1), not a z-score.
- 555 samples have both MANTIS and WRN expression; 39 lack at least one.
- Missing measurements remain missing. No inferred MSI/MSS categories. No individual-level join to DepMap.

Expression in a human tumor supplies biological context; it does not measure knockout dependence or treatment response. The two evidence layers must have separate axes and labels in the interface.

`analyze_tcga.py` checks study/profile/gene identity, sample and patient identity, duplicate measurements, finite numeric values, nonnegative expression, and retrieval count. `tests/test_tcga.py` checks missingness, log transform, duplicates, orphan samples, mismatched patients/studies/genes/profiles, and corrupt values.

Exact API requests are in `tcga-requests.json`; full snapshots and SHA-256 hashes are stored alongside them. Requests were executed through the cBioPortal skill's `scripts/rest_request.py`. Replays may return updated upstream data; saved hashes identify this snapshot. API request page limits exceed this cohort's returned counts; fail count checks rather than silently accepting truncated samples.

Source/attribution: TCGA PanCancer Atlas (Cell, 2018), cBioPortal, study metadata citations. The [cBioPortal FAQ](https://docs.cbioportal.org/user-guide/faq/) states that data are under ODC Open Database License unless otherwise noted. No additional restriction appears in this study description. Preserve attribution and the ODbL terms for redistributed data; do not label this dataset CC BY or apply the application's code license to it. DepMap and the manuscript supplement retain separate terms. The annotation redistribution gate for the cell-line supplement is still open.
