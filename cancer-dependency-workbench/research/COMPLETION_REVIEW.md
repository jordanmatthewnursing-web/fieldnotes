# Fieldnotes completion review — September 29

This is a requirements audit, not a completion declaration. Current source and execution evidence take precedence over earlier milestone prose.

| Requirement | Evidence / status |
| --- | --- |
| One lineage, prespecified question and comparator set | Implemented: colorectal adenocarcinoma; WRN plus BRAF, KRAS, PCNA, RPL4. Historical local categorical reanalysis and separate licensed continuous-score route are documented. |
| Source versions, terms and identity checks | Manifests, raw checksum verification, exact TCGA requests, independent licenses, typed runtime/build contracts. Historical labels excluded from hosted output. |
| Separate tumor context | Implemented, 594 samples / 555 paired observations; no individual-level join or dependency prediction. |
| Inspect observations and choose allowed analysis | Implemented: model/donor units across five genes, missingness, fixed chart axes, source IDs, selected-observation URLs and replayable exports. |
| Uncertainty and confounder inspection | Partial: related-donor aggregation is explicit; qualitative limits are shown. Historical local analysis has bootstrap intervals. Donor-level BCa and leave-one-donor-out results now have typed source checks, a donor-only display and a separate full Python-replayable download (CONTINUOUS_UNCERTAINTY.md). Confounder limits remain explicit. The current-analysis treatment is implemented; historical intervals remain separate. Confounder adjustment and independent validation are not claimed. |
| Multiple comparisons | No comparator significance testing or target ranking; stated in interface and exports. |
| Reproducible analysis and interface | Python isolated replay matches hosted data byte-for-byte; pinned npm toolchain; ten gene/unit dossier replay combinations and separate tumor replay pass. |
| Performance | Five runs each of local desktop and throttled-phone profiles; conditions, raw records and limitations in PERFORMANCE.md and artifacts/performance.json. Loading shift measured and reduced. |
| Design/accessibility | Responsive rendered reviews, keyboard/dialog focus checks, scoped automated axe scans; physical-device and full screen-reader validation absent. |
| User value | Proposed research workflow, no independent researcher feedback. Do not claim validated adoption or utility. |
| Architecture and final case study | Architecture documented in ARCHITECTURE.md; technical case-study draft in CASE_STUDY.md and concrete design review in DESIGN_REVIEW.md. Final visual acceptance and public copy approval remain open. |
| GitHub and public portfolio | Public repositories, final positioning and personal site not delivered. |

## Correlation consistency — closed September 29

Python and TypeScript now both require at least three pairs and report unavailable correlation as null; Python's status is standardized to `unavailable`, matching the typed schema. Consequential two-pair tests pass in both runtimes. The pinned current cohort's estimates are unaffected. Twenty-three Python tests now pass, including the separate uncertainty analysis.

## Next technical milestone

Continue the outstanding visual/interaction issues in DESIGN_REVIEW.md, then prepare a reviewable project package with the case-study draft and existing technical evidence. Do not add a predictive model, new gene set or unrelated feature to fill a portfolio checklist.
