# Fieldnotes — cancer evidence analysis

Fieldnotes is a private, working evidence-exploration prototype. This directory contains its source snapshots and analysis pipeline. The hosted interface lives separately in `../fieldnotes-site`; the `web/` directory here is an older local prototype.

## The question

How does WRN gene effect vary with continuous MSI score in colorectal cancer cell models? What can a separate human-tumor expression cohort add as context?

These are descriptive questions. Tumor expression is not a dependency score; neither layer establishes treatment efficacy or patient selection.

## Current evidence

| Layer | Source | Coverage | Interpretation |
| --- | --- | --- | --- |
| Cell models | DepMap 24Q4 Public v1, CC BY 4.0 | 96 models; 63 paired WRN/MSI observations | Spearman rho −0.603101 |
| Donor sensitivity | Same DepMap cohort | 61 donor groups from 63 complete pairs | Median aggregation rho −0.603824; not independent validation |
| Tumor context | cBioPortal TCGA colorectal PanCancer Atlas snapshot | 594 samples; 555 paired MANTIS/WRN observations | Continuous MSI and log2(RSEM + 1) expression, no categorical classification |

BRAF, KRAS, PCNA and RPL4 are descriptive comparator genes in the model view. The tumor view is WRN-only. Missing values remain missing. The two cohorts are never joined at the individual level.

## Reproduce the evidence

Use Python 3.12. Run these commands from this directory:

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/fetch_sources.py
.venv/bin/python -m unittest discover -s tests -v
.venv/bin/python scripts/reproduce.py
```

The download is about 430 MB. It uses exact source URLs, expected sizes and provider MD5 checksums in `research/source-manifest.json`. Verified cached files are reused. Downloads are staged and checked before replacing an existing file; interrupted or invalid downloads cannot become accepted inputs. These checks establish consistency with the pinned manifest, not cryptographic authentication of the publisher.

The replay verifies SHA-256 checksums of the saved TCGA API snapshots before analysis. Exact acquisition requests are in `research/tcga-requests.json`. It creates the output directory and regenerates:

- `data/derived/continuous-evidence.json`
- `data/derived/tcga-tumor-context.csv`
- `data/derived/tcga-coverage.json`
- `data/derived/tumor-evidence.json`
- `artifacts/continuous-uncertainty.json` (donor-level bootstrap and influence analysis)

To check cached DepMap inputs without network access or file writes:

```sh
.venv/bin/python scripts/fetch_sources.py --verify-only
```

Direct analysis dependencies are pinned in `requirements.txt`; transitive dependencies are not locked. The setup requires no API credentials, historical manuscript supplement or running website. Raw DepMap inputs are excluded from version control; the small pinned public TCGA snapshots must accompany a checkout.

## Interface and licensing

The private prototype is at [Fieldnotes](https://fieldnotes-cancer.piloe1.chatgpt.site/). Open and sync the Site source repository before editing `../fieldnotes-site`. Its build validates and packages the two datasets with separate attribution and derivative downloads. This research directory does not deploy the current app.

DepMap is [24Q4 Public v1](https://doi.org/10.25452/figshare.plus.27993248.v1), CC BY 4.0, not claimed to be the latest release. The TCGA derivative follows the recorded cBioPortal ODbL terms and remains separate. See `research/DATA_DICTIONARY.md` and `research/tcga-snapshot-manifest.json`.

The historical local MSI/MSS reanalysis uses manuscript annotations whose redistribution terms remain unresolved. It is excluded from the hosted datasets and the reproduction command above. `npm run build:local` packages only that older local prototype; `npm run build` intentionally blocks its publication. Do not remove that guard or confuse those outputs with the current Site.

## Verification and remaining work

Analysis tests cover unique joins, missingness, donor aggregation, tumor identity/measurements and corrupted downloads. The Site has separate runtime-contract, browser workflow and scoped accessibility checks. See `../portfolio-program/CURRENT_STATE.md` for the latest verified counts and deployment.

Strict TypeScript contracts, portable interface tooling and measured local performance are implemented. Architecture is documented in `research/ARCHITECTURE.md`. Remaining: final design and case-study review, and independent researcher feedback. There is no trained ML model, validated user adoption or clinical outcome claim.

Earlier incremental research notes are preserved in `research/README_HISTORY_THROUGH_2026-09-29.md`.
