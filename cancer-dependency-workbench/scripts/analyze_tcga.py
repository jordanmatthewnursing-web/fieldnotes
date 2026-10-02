"""Tumor context only: no dependency, treatment-response or inferred MSI labels."""
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
STUDY = 'coadread_tcga_pan_can_atlas_2018'
PROFILE = STUDY + '_rna_seq_v2_mrna'
ATTRIBUTES = ['MSI_SCORE_MANTIS', 'MSI_SENSOR_SCORE', 'MUTATION_COUNT']


def assemble(samples, clinical, expression):
    samples, clinical, expression = map(pd.DataFrame, (samples, clinical, expression))
    for name, frame in [('samples', samples), ('clinical', clinical), ('expression', expression)]:
        if not frame.studyId.eq(STUDY).all():
            raise ValueError(f'Unexpected study in {name}')
        if frame.sampleId.isna().any():
            raise ValueError(f'Missing sample ID in {name}')
    if not samples.sampleId.is_unique:
        raise ValueError('Duplicate sample IDs')
    if samples.patientId.isna().any():
        raise ValueError('Missing patient IDs')
    if not expression.entrezGeneId.eq(7486).all() or not expression.molecularProfileId.eq(PROFILE).all():
        raise ValueError('Unexpected gene or expression profile')
    if not expression.sampleId.is_unique:
        raise ValueError('Duplicate WRN expression records')
    identity = samples.set_index('sampleId').patientId
    for name, frame in [('clinical', clinical), ('expression', expression)]:
        if not frame.sampleId.isin(identity.index).all():
            raise ValueError(f'Orphan sample in {name}')
        if not frame.patientId.eq(frame.sampleId.map(identity)).all():
            raise ValueError(f'Patient mismatch in {name}')
    selected = clinical.loc[clinical.clinicalAttributeId.isin(ATTRIBUTES)].copy()
    if selected.duplicated(['sampleId', 'clinicalAttributeId']).any():
        raise ValueError('Duplicate clinical measurements')
    selected['value'] = pd.to_numeric(selected.value, errors='raise')
    expression['value'] = pd.to_numeric(expression.value, errors='raise')
    for values in [selected.value, expression.value]:
        if not np.isfinite(values).all():
            raise ValueError('Non-finite observed measurement')
    if expression.value.lt(0).any():
        raise ValueError('Negative RSEM expression')
    wide = selected.pivot(index='sampleId', columns='clinicalAttributeId', values='value').reindex(columns=ATTRIBUTES)
    result = samples[['sampleId', 'patientId', 'sampleType']].merge(wide, on='sampleId', how='left', validate='one_to_one')
    result = result.merge(expression[['sampleId', 'value']].rename(columns={'value': 'WRN_RSEM'}), on='sampleId', how='left', validate='one_to_one')
    result['WRN_log2_RSEM_plus_1'] = np.log2(result.WRN_RSEM + 1)
    return result


def main():
    names = ['tcga-samples', 'tcga-sample-clinical', 'tcga-wrn-expression']
    paths = [ROOT / 'research' / f'{name}.json' for name in names]
    cohort = assemble(*(json.loads(path.read_text()) for path in paths))
    study = json.loads((ROOT / 'research/tcga-study.json').read_text())
    if len(cohort) != study['allSampleCount']:
        raise ValueError('Sample retrieval does not match pinned study count')
    coverage = {column: int(cohort[column].notna().sum()) for column in ATTRIBUTES + ['WRN_RSEM']}
    paired = cohort.dropna(subset=['MSI_SCORE_MANTIS', 'WRN_RSEM'])
    report = {
        'study': STUDY, 'profile': PROFILE, 'retrieved_date': '2026-09-28',
        'samples': len(cohort), 'patients': int(cohort.patientId.nunique()),
        'sample_types': cohort.sampleType.value_counts().to_dict(),
        'observed_measurements': coverage,
        'paired_MANTIS_and_WRN': len(paired),
        'missing_MANTIS_or_WRN': len(cohort) - len(paired),
        'expression_transform': 'log2(batch-normalized RSEM + 1); not a dependency score',
        'limits': [
            'This curated PanCancer Atlas cohort is distinct from the initial 633-case GDC catalog query.',
            'Tumor expression is observational context, not evidence that WRN knockout or a drug benefits people.',
            'MSI scores are retained continuously; no patient MSI categories are inferred.',
            'Source MSIsensor description overlaps MSS and indeterminate ranges; it is not used to classify tumors.',
            'Missing measurements remain missing, never zero or MSS.',
            'No individual-level join exists between TCGA tumors and DepMap cell lines.'
        ]
    }
    out = ROOT / 'data/derived'
    cohort.to_csv(out / 'tcga-tumor-context.csv', index=False)
    (out / 'tcga-coverage.json').write_text(json.dumps(report, indent=2) + '\n')
    files = paths + [ROOT / 'research' / f'tcga-{name}.json' for name in ['study', 'profiles', 'clinical-attributes']]
    manifest = [{'file': str(p.relative_to(ROOT)), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'bytes': p.stat().st_size} for p in files]
    (ROOT / 'research/tcga-snapshot-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
