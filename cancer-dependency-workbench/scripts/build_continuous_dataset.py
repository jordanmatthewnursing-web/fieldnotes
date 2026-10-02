"""Redistribution candidate built directly from CC BY DepMap inputs, no manuscript labels."""
import hashlib
import json
from pathlib import Path
import pandas as pd
from scipy.stats import spearmanr
from continuous_sensitivity import sensitivity
ROOT=Path(__file__).resolve().parents[1]
GENES={'WRN':'WRN (7486)','BRAF':'BRAF (673)','KRAS':'KRAS (3845)','PCNA':'PCNA (5111)','RPL4':'RPL4 (6124)'}


def assemble(models,effects,signatures):
    for name,frame in [('models',models),('effects',effects),('signatures',signatures)]:
        if frame.ModelID.isna().any() or not frame.ModelID.is_unique:
            raise ValueError(f'Invalid model identities: {name}')
    cohort=models.loc[models.OncotreePrimaryDisease.eq('Colorectal Adenocarcinoma'),['ModelID','PatientID','CellLineName']].copy()
    cohort=cohort.merge(effects[['ModelID',*GENES.values()]],how='left',on='ModelID',validate='one_to_one')
    cohort=cohort.merge(signatures[['ModelID','MSIScore']],how='left',on='ModelID',validate='one_to_one')
    return cohort


def main():
    metadata=json.loads((ROOT/'research/depmap-24q4.json').read_text())
    if metadata['license']['name']!='CC BY 4.0':raise ValueError('Unexpected license')
    manifest=json.loads((ROOT/'research/source-manifest.json').read_text())
    for item in manifest:
        p=ROOT/'data/raw'/item['file']
        if p.stat().st_size!=item['bytes'] or hashlib.file_digest(p.open('rb'),'md5').hexdigest()!=item['md5']:raise ValueError('Source checksum mismatch')
    models=pd.read_csv(ROOT/'data/raw/Model-24Q4.csv')
    effects=pd.read_csv(ROOT/'data/raw/CRISPRGeneEffect-24Q4.csv',usecols=lambda c:c.startswith('Unnamed:') or c in GENES.values()).rename(columns={'Unnamed: 0':'ModelID'})
    signatures=pd.read_csv(ROOT/'data/raw/OmicsSignatures-24Q4.csv').rename(columns={'Unnamed: 0':'ModelID'})
    frame=assemble(models,effects,signatures)
    paired=frame.dropna(subset=['MSIScore',GENES['WRN']])
    rho=spearmanr(paired.MSIScore,paired[GENES['WRN']])
    result={'schemaVersion':2,'evidenceMode':'continuous-depmap','release':metadata['doi'],'question':'How does WRN gene effect vary with continuous MSI score in colorectal cell models?', 'genes':GENES,'models':json.loads(frame.to_json(orient='records')),'coverage':{'models':len(frame),'pairedWRNAndMSI':len(paired),'unpaired':len(frame)-len(paired)},'wrnSummary':{'spearmanRho':float(rho.statistic),'n':len(paired),'inference':'Descriptive association in this model cohort; no categorical classification or causal estimate.'},'sources':[{'name':'DepMap 24Q4 Public v1','url':'https://doi.org/'+metadata['doi'],'license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','attribution':metadata.get('citation','DepMap, Broad Institute: DepMap 24Q4 Public v1.')}],'sourceManifest':manifest,'limits':['Continuous MSI scores are not converted into MSI/MSS categories.','Missing scores remain missing, not zero.','This is a related analysis of the same cell models, not independent replication.','Association does not establish clinical efficacy or treatment selection.','Historical manuscript annotations and group contrasts are absent from this dataset.']}
    result['donorSensitivity'] = sensitivity(frame,GENES['WRN'])
    out=ROOT/'data/derived/continuous-evidence.json'
    out.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({'file':str(out),'coverage':result['coverage'],'wrnSummary':result['wrnSummary'],'bytes':out.stat().st_size},indent=2))

if __name__=='__main__':main()
