"""Offline WRN donor-level resampling; does not modify the hosted evidence."""
import hashlib
import json
import warnings
from pathlib import Path
import numpy as np
import pandas as pd
from scipy.stats import bootstrap, spearmanr
from continuous_sensitivity import donor_pairs, correlation

ROOT = Path(__file__).resolve().parents[1]


def uncertainty(frame, effect, *, seed=20260929, resamples=9999):
    if resamples < 100:
        raise ValueError('Use at least 100 resamples')
    donors = donor_pairs(frame, effect)
    x = np.array([r['msiScore'] for r in donors])
    y = np.array([r['geneEffect'] for r in donors])
    point = correlation(x.tolist(), y.tolist())
    result = {'unit': 'source donor; medians of complete measurement pairs',
              'point': point, 'seed': seed, 'resamples': resamples,
              'method': 'paired BCa bootstrap', 'confidenceLevel': 0.95,
              'interval': None, 'status': 'unavailable', 'undefinedResamples': None,
              'leaveOneDonorOut': []}
    if point['spearmanRho'] is None or len(donors) < 4:
        result['reason'] = 'At least four donor pairs and nonconstant measurements required.'
        return result
    for i, donor in enumerate(donors):
        kept = np.arange(len(donors)) != i
        result['leaveOneDonorOut'].append({'omittedDonorId': donor['donorId'],
            **correlation(x[kept].tolist(), y[kept].tolist())})
    def statistic(a, b):
        if len(set(a)) < 2 or len(set(b)) < 2:
            return np.nan
        return float(spearmanr(a, b).statistic)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter('always')
        boot = bootstrap((x, y), statistic, paired=True, vectorized=False,
                         n_resamples=resamples, method='BCa', confidence_level=.95,
                         rng=np.random.default_rng(seed))
    result['warnings'] = sorted(set(str(w.message) for w in caught))
    result['undefinedResamples'] = int((~np.isfinite(boot.bootstrap_distribution)).sum())
    bounds = [float(boot.confidence_interval.low), float(boot.confidence_interval.high)]
    # Never silently discard undefined replicates or replace a failed interval.
    if result['undefinedResamples'] or not np.isfinite(bounds).all():
        result['reason'] = 'Degenerate resampling distribution or BCa correction; no interval reported.'
    else:
        result.update(interval=bounds, status='available')
    return result


def main():
    source = ROOT / 'data/derived/continuous-evidence.json'
    raw = source.read_bytes()
    data = json.loads(raw)
    result = uncertainty(pd.DataFrame(data['models']), data['genes']['WRN'])
    result['input'] = {'path': 'data/derived/continuous-evidence.json',
                       'sha256': hashlib.sha256(raw).hexdigest(), 'release': data['release']}
    result['limits'] = [
        'Resampling assumes source donors are independent and exchangeable within this selected cohort.',
        'A nominal 95% interval is conditional on these assumptions; it does not establish coverage for tumors or patients.',
        'This convenience cohort is not a random clinical sample. Missing measurements, selection and unmeasured confounding remain.',
        'Donor medians change the estimand; this interval belongs to the donor-level correlation, not the model-level estimate.',
        'Leave-one-donor-out values describe influence, not independent validation or confidence bounds.'
    ]
    output = ROOT / 'artifacts/continuous-uncertainty.json'
    output.parent.mkdir(exist_ok=True)
    output.write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
    bundle = {'format':'fieldnotes-uncertainty-v1', 'datasetText':raw.decode('utf-8'),
              'analysis':result, 'replay':'In the research repository: .venv/bin/python scripts/replay_uncertainty.py fieldnotes-uncertainty.json'}
    (ROOT / 'artifacts/fieldnotes-uncertainty.json').write_text(json.dumps(bundle, indent=2, allow_nan=False) + '\n')
    print(json.dumps({k: result[k] for k in ['point', 'interval', 'status', 'undefinedResamples']}, indent=2))

if __name__ == '__main__':
    main()
