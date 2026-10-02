# Continuous WRN uncertainty — September 29

Question: how stable is the donor-level MSI–WRN gene-effect association within the pinned colorectal model cohort?

## Method fixed before execution

Select complete measurement pairs, aggregate each measurement by median within source donor, then resample the 61 paired donor rows together. Use SciPy's paired BCa bootstrap, 9,999 replicates, seed 20260929, nominal 95% interval. BCa adjusts for bootstrap bias and jackknife acceleration; this choice does not guarantee coverage in this selected cohort. Repeated models do not become separate resampling units. No gene search, threshold tuning or comparator testing.

Implementation reference: [SciPy bootstrap documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.bootstrap.html). The choice to apply this to donor medians is our analysis decision, conditional on donor independence and exchangeability.

## Actual result

- 61 donors; Spearman rho -0.603823.
- Nominal 95% BCa interval [-0.761906, -0.383504].
- Zero undefined bootstrap replicates; no reported warnings.
- Leave-one-donor-out correlations range from -0.634888 to -0.584512. These are influence checks, not confidence limits.

This interval belongs to the donor-median estimate. Do not attach it to the 63-model estimate. It is conditional on the observed cohort and does not address missingness, selection, other confounders or translation to patients. No therapeutic conclusion follows. This is not independent replication.

## Reproduction and failure handling

Run `.venv/bin/python scripts/continuous_uncertainty.py` after rebuilding the continuous dataset. The artifact records input SHA-256, release, seed, method, interval, warnings and every omitted donor. Undefined replicates are counted and prevent reporting an interval; they are never silently discarded. Constant measurements and fewer than four donors return unavailable.

Evidence: `artifacts/continuous-uncertainty.json`. Twenty-three Python tests pass, including fixed-seed/order invariance, small/constant samples, degenerate resampling and donor aggregation. The donor-mode interface now shows the interval and offers a separate uncertainty dossier with the exact dataset text, source SHA-256 and analysis. Existing observation dossier v1 remains unchanged. Python replay recomputes the full bootstrap and rejects even a plausible altered bound. The actual browser download was replayed successfully. Browser/build checks verify source binding and influence values; they do not recompute the bootstrap.
