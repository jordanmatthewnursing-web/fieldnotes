"""Verify and recompute a downloaded uncertainty dossier, without network access."""
import argparse
import hashlib
import json
from pathlib import Path
import pandas as pd
from continuous_uncertainty import uncertainty


def replay(bundle):
    if set(bundle) != {'format', 'datasetText', 'analysis', 'replay'} or bundle['format'] != 'fieldnotes-uncertainty-v1':
        raise ValueError('Unknown uncertainty dossier format')
    raw = bundle['datasetText'].encode('utf-8')
    analysis = bundle['analysis']
    if hashlib.sha256(raw).hexdigest() != analysis['input']['sha256']:
        raise ValueError('Source checksum mismatch')
    data = json.loads(raw)
    if data['release'] != analysis['input']['release']:
        raise ValueError('Release mismatch')
    if analysis['seed'] != 20260929 or analysis['resamples'] != 9999:
        raise ValueError('Unsupported resampling configuration')
    actual = uncertainty(pd.DataFrame(data['models']), data['genes']['WRN'],
                         seed=analysis['seed'], resamples=analysis['resamples'])
    expected = {k:v for k,v in analysis.items() if k not in ('input','limits')}
    if actual != expected:
        raise ValueError('Analysis differs from recomputed result; use the pinned Python environment')
    return actual

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('dossier', type=Path)
    args = parser.parse_args()
    result = replay(json.loads(args.dossier.read_text()))
    print(json.dumps({'verified':True,'point':result['point'],'interval':result['interval']}))
