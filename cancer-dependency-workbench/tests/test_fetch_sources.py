import hashlib,io,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from fetch_sources import fetch

class VerifiedDownloads(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name)
        self.good=b'correct data';self.item={'file':'sample.csv','source':'https://ndownloader.figshare.com/files/1','bytes':len(self.good),'md5':hashlib.md5(self.good).hexdigest()}
    def tearDown(self):self.temp.cleanup()
    def test_verified_files_skip_network(self):
        (self.root/'sample.csv').write_bytes(self.good)
        def fail(*a,**k):raise AssertionError('Network used for valid cached source')
        self.assertEqual(fetch(self.item,self.root,fail),'verified existing')
    def test_rejects_corrupt_truncated_and_oversized_downloads_without_replacing_existing(self):
        for bad in [b'wrong data!!',b'short',self.good+b'excess']:
            with self.subTest(payload=bad):
                (self.root/'sample.csv').write_bytes(b'previous local file')
                with self.assertRaises(ValueError):fetch(self.item,self.root,lambda *a,**k:io.BytesIO(bad))
                self.assertEqual((self.root/'sample.csv').read_bytes(),b'previous local file')
                self.assertFalse(list(self.root.glob('*.part')))
    def test_valid_download_replaces_bad_local_file(self):
        (self.root/'sample.csv').write_bytes(b'incomplete')
        fetch(self.item,self.root,lambda *a,**k:io.BytesIO(self.good))
        self.assertEqual((self.root/'sample.csv').read_bytes(),self.good)
    def test_manifest_path_escape_rejected(self):
        with self.assertRaises(ValueError):fetch({**self.item,'file':'../escape'},self.root)

if __name__=='__main__':unittest.main()
