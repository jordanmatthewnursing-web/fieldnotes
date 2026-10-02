"""Validated WRN contrasts shared by scripts and tests."""
import numpy as np
from scipy.stats import mannwhitneyu

EFFECT = 'WRN (7486)'


def comparison(frame):
    if not frame.msi_group.isin(['MSI', 'MSS']).all():
        raise ValueError('Comparison requires explicit MSI/MSS groups')
    a = frame.loc[frame.msi_group.eq('MSI'), EFFECT].to_numpy(dtype=float)
    b = frame.loc[frame.msi_group.eq('MSS'), EFFECT].to_numpy(dtype=float)
    if len(a) < 2 or len(b) < 2 or not np.isfinite(np.r_[a, b]).all():
        raise ValueError('Two finite observations per group required')
    rng = np.random.default_rng(20260927)
    boot = np.median(rng.choice(a, (10000, len(a))), axis=1) - np.median(rng.choice(b, (10000, len(b))), axis=1)
    return {'MSI_n':len(a), 'MSS_n':len(b), 'MSI_median':float(np.median(a)), 'MSS_median':float(np.median(b)), 'median_difference_MSI_minus_MSS':float(np.median(a)-np.median(b)), 'bootstrap_95_percentile_interval':np.quantile(boot,[.025,.975]).tolist(), 'mann_whitney_two_sided_p':float(mannwhitneyu(a,b,alternative='two-sided',method='asymptotic').pvalue)}


def donor_medians(frame):
    if frame.PatientID.isna().any() or frame.PatientID.astype(str).str.strip().eq('').any():
        raise ValueError('Missing donor identity; cannot silently drop models')
    if frame.groupby('PatientID').msi_group.nunique().gt(1).any():
        raise ValueError('Conflicting within-donor groups')
    return frame.groupby(['PatientID','msi_group'], as_index=False)[EFFECT].median()
