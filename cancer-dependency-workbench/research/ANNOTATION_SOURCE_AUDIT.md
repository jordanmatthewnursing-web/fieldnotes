# Annotation source audit — September 28, 2026

## Outcome

Do not infer permission for the manuscript supplement from a different file's license. The historical categorical analysis remains local. Production packaging must block hosted publication while this gate is unresolved. Continue independent implementation.

## Sources checked

- [Authors' WRN project page](https://depmap.org/WRN/) links the original analysis repository and Figshare dataset.
- [Figshare dataset 7712756 v1](https://doi.org/10.6084/m9.figshare.7712756.v1) explicitly uses CC BY 4.0, but its listed archive contains dependency, expression, copy-number, mutation and protein matrices. This is not evidence that the separate manuscript labels carry that license. The 1.6 GB archive was not downloaded merely to assume equivalence.
- [Authors' annotation-processing code](https://github.com/cancerdatasci/WRN_manuscript/blob/master/src/process_CCLE_MSI_data.R) reads a separate `Supplementary_Table_7_MSI_status.csv` and writes `CCLE_MSI_info.csv`. Neither file was present in the repository tree inspected. The code describes its input as an early CCLE phase-2 supplementary table. This identifies a concrete upstream lead.
- cBioPortal study discovery found `ccle_broad_2019` and `ccle_broad_2025`. Retrieved clinical-attribute catalogs contain DepMap identifiers but no MSI attribute. They cannot replace the labels for this categorical analysis. Snapshots: `cell-line-studies.json`, `ccle_broad_2019-attributes.json`, `ccle_broad_2025-attributes.json`.
- The PMC author-manuscript notice describes academic research use. That alone is not recorded as an unrestricted redistribution license.

## Next decision

Check the final CCLE phase-2 supplementary MSI table's own terms and agreement with historical labels. If that cannot supply the categorical view, publish a separately scoped continuous-MSI-score view using the already licensed DepMap release; preserve the historical reanalysis as a local artifact. Do not invent thresholds or silently substitute categorical labels. External permission requests are not authorized and have not been sent.
