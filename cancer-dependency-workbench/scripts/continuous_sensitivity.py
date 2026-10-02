"""Donor sensitivity uses complete measurement pairs before aggregation."""
import numpy as np
import pandas as pd
from scipy.stats import spearmanr


def donor_pairs(frame, effect):
    required=['ModelID','PatientID','MSIScore',effect]
    if not set(required).issubset(frame.columns):
        raise ValueError('Missing required columns')
    if frame.ModelID.isna().any() or not frame.ModelID.is_unique:
        raise ValueError('Missing or duplicate model identity')
    paired=frame.dropna(subset=['MSIScore',effect]).copy()
    if paired.PatientID.isna().any() or paired.PatientID.astype(str).str.strip().eq('').any():
        raise ValueError('Missing donor identity in paired measurements')
    if not np.isfinite(paired[['MSIScore',effect]].to_numpy(dtype=float)).all():
        raise ValueError('Non-finite paired measurements')
    rows=[]
    for donor,group in paired.groupby('PatientID',sort=True):
        rows.append({'donorId':donor,'modelIds':sorted(group.ModelID.tolist()),
                     'modelNames':group.CellLineName.tolist() if 'CellLineName' in group else [],
                     'pairedModelCount':len(group),'msiScore':float(group.MSIScore.median()),
                     'geneEffect':float(group[effect].median()),
                     'msiRange':[float(group.MSIScore.min()),float(group.MSIScore.max())],
                     'effectRange':[float(group[effect].min()),float(group[effect].max())]})
    return rows


def correlation(x,y):
    if len(x)<3 or len(set(x))<2 or len(set(y))<2:
        return {'spearmanRho':None,'n':len(x),'status':'unavailable'}
    return {'spearmanRho':float(spearmanr(x,y).statistic),'n':len(x),'status':'available'}


def sensitivity(frame,effect):
    pairs=frame.dropna(subset=['MSIScore',effect])
    donors=donor_pairs(frame,effect)
    model=correlation(pairs.MSIScore.tolist(),pairs[effect].tolist())
    aggregated=correlation([r['msiScore'] for r in donors],[r['geneEffect'] for r in donors])
    return {'method':'Select complete MSI/gene-effect pairs, then take each measurement median within source donor.',
            'modelLevel':model,'donorLevel':aggregated,'donors':donors,
            'relatedDonors':sum(r['pairedModelCount']>1 for r in donors),
            'unpairedModels':len(frame)-len(pairs),
            'limits':['Aggregation reduces repeated representation of known source donors; it does not control other confounders.',
                      'Medians summarize distinct models; the median pair is not necessarily an observed single model.',
                      'Donor identity comes from the pinned DepMap release. This is a sensitivity analysis, not independent validation.']}
