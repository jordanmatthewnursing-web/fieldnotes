"""Verify packaged files and research/UI agreement. Run with Python 3.12."""
import argparse, hashlib, json, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
parser=argparse.ArgumentParser()
parser.add_argument('--reproduce',action='store_true',help='Rebuild from previously downloaded, verified DepMap sources')
args=parser.parse_args()
for item in json.loads((ROOT/'release-manifest.json').read_text())['files']:
    content=(ROOT/item['file']).read_bytes()
    if len(content)!=item['bytes'] or hashlib.sha256(content).hexdigest()!=item['sha256']:
        raise SystemExit('Package changed: '+item['file'])
research=ROOT/'cancer-dependency-workbench'
subprocess.run([sys.executable,'-m','unittest','discover','-s','tests','-v'],cwd=research,check=True)
if args.reproduce:
    subprocess.run([sys.executable,'scripts/reproduce.py'],cwd=research,check=True)
    for source,destination in [('data/derived/continuous-evidence.json','continuous-evidence.json'),('data/derived/tumor-evidence.json','tumor-evidence.json'),('artifacts/fieldnotes-uncertainty.json','fieldnotes-uncertainty.json')]:
        if (research/source).read_bytes()!=(ROOT/'fieldnotes-site/src'/destination).read_bytes():
            raise SystemExit('Research/interface mismatch: '+destination)
    print('Three research artifacts match packaged interface byte-for-byte.')
print('Package integrity and research tests passed.')
