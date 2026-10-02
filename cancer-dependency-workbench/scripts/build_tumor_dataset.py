"""Keep the ODbL tumor-context derivative separate from DepMap data."""
import json, hashlib
from pathlib import Path
import pandas as pd
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'research/tcga-snapshot-manifest.json').read_text())
for item in manifest:
    p=ROOT/item['file']
    if hashlib.sha256(p.read_bytes()).hexdigest()!=item['sha256']:raise ValueError('Changed TCGA snapshot')
coverage=json.loads((ROOT/'data/derived/tcga-coverage.json').read_text())
frame=pd.read_csv(ROOT/'data/derived/tcga-tumor-context.csv')
columns=['sampleId','patientId','sampleType','MSI_SCORE_MANTIS','WRN_RSEM','WRN_log2_RSEM_plus_1']
result={'schemaVersion':1,'evidenceMode':'tcga-tumor-context','coverage':coverage,'records':json.loads(frame[columns].to_json(orient='records')),'sourceManifest':manifest,'source':{'study':'coadread_tcga_pan_can_atlas_2018','url':'https://www.cbioportal.org/study/summary?id=coadread_tcga_pan_can_atlas_2018','citation':'TCGA PanCancer Atlas (Cell, 2018), accessed through cBioPortal. See study metadata for individual publications.','license':'ODbL-1.0','licenseUrl':'https://opendatacommons.org/licenses/odbl/1-0/','termsSource':'https://docs.cbioportal.org/user-guide/faq/','adaptations':'Select six fields; retain all 594 samples; compute log2(RSEM + 1); summarize measurement coverage.'}}
(ROOT/'data/derived/tumor-evidence.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
print('Built separate tumor derivative:',len(frame),'records')
