"""Fetch pinned public DepMap files; verify before atomically replacing a local file."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
from urllib.request import urlopen
ROOT=Path(__file__).resolve().parents[1]


def verified(path,item):
    if not path.is_file() or path.stat().st_size!=item['bytes']:
        return False
    with path.open('rb') as stream:
        return hashlib.file_digest(stream,'md5').hexdigest()==item['md5']


def fetch(item,directory,opener=urlopen):
    name=item['file']
    if Path(name).name!=name or name in {'.','..'}:
        raise ValueError('Manifest filename must be a basename')
    if not item['source'].startswith('https://ndownloader.figshare.com/files/'):
        raise ValueError('Unexpected source host')
    directory.mkdir(parents=True,exist_ok=True)
    destination=directory/name
    if verified(destination,item):return 'verified existing'
    staging=None
    try:
        with tempfile.NamedTemporaryFile(dir=directory,prefix=f'.{name}.',suffix='.part',delete=False) as output:
            staging=Path(output.name)
            with opener(item['source'],timeout=90) as response:
                total=0
                while chunk:=response.read(1024*1024):
                    total+=len(chunk)
                    if total>item['bytes']:raise ValueError(f'Oversized response: {name}')
                    output.write(chunk)
            output.flush();os.fsync(output.fileno())
        if not verified(staging,item):raise ValueError(f'Size/checksum mismatch: {name}')
        os.replace(staging,destination)
        return 'downloaded and verified'
    finally:
        if staging is not None:staging.unlink(missing_ok=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--destination',type=Path,default=ROOT/'data/raw')
    parser.add_argument('--file',action='append',help='Exact manifest filename; repeat to select several')
    parser.add_argument('--verify-only',action='store_true',help='No network or file writes')
    args=parser.parse_args()
    manifest=json.loads((ROOT/'research/source-manifest.json').read_text())
    if args.file and not set(args.file).issubset({r['file'] for r in manifest}):parser.error('Unknown manifest filename')
    for item in manifest:
        if args.file and item['file'] not in args.file:continue
        if args.verify_only:
            if not verified(args.destination/item['file'],item):raise SystemExit(f'Missing or invalid: {item["file"]}')
            status='verified existing'
        else:status=fetch(item,args.destination)
        print(f'{item["file"]}: {status}')

if __name__=='__main__':main()
