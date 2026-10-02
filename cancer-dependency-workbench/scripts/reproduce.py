"""Rebuild the evidence datasets and offline uncertainty artifact from verified sources."""
import hashlib,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
# Check pinned TCGA inputs before analyze_tcga can regenerate its output manifest.
manifest=json.loads((ROOT/'research/tcga-snapshot-manifest.json').read_text())
for item in manifest:
    path=ROOT/item['file']
    if path.stat().st_size!=item['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest()!=item['sha256']:
        raise SystemExit(f'Pinned TCGA snapshot mismatch: {item["file"]}')
(ROOT/'data/derived').mkdir(parents=True,exist_ok=True)
for name,args in [('fetch_sources.py',['--verify-only']),('build_continuous_dataset.py',[]),('analyze_tcga.py',[]),('build_tumor_dataset.py',[]),('continuous_uncertainty.py',[])]:
    subprocess.run([sys.executable,str(ROOT/'scripts'/name),*args],cwd=ROOT,check=True)
print('Evidence datasets and offline uncertainty artifact reproduced. Historical manuscript labels were not used.')
