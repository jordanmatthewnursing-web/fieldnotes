import copy,json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from replay_uncertainty import replay

class ReplayTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.bundle=json.loads((ROOT/'artifacts/fieldnotes-uncertainty.json').read_text())
    def test_reproduces_pinned_dossier(self):
        self.assertEqual(replay(self.bundle)['point']['n'],61)
    def test_rejects_altered_source(self):
        bad=copy.deepcopy(self.bundle);bad['datasetText']+=' '
        with self.assertRaisesRegex(ValueError,'checksum'):replay(bad)
    def test_rejects_plausible_altered_interval(self):
        bad=copy.deepcopy(self.bundle);bad['analysis']['interval'][0]+=.01
        with self.assertRaisesRegex(ValueError,'recomputed'):replay(bad)

if __name__=='__main__':unittest.main()
