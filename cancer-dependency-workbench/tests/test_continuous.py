import sys, unittest
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from build_continuous_dataset import assemble,GENES

class ContinuousDataset(unittest.TestCase):
    def setUp(self):
        self.models=pd.DataFrame({'ModelID':['a','b','c'],'PatientID':['p1','p2','p3'],'CellLineName':['A','B','C'],'OncotreePrimaryDisease':['Colorectal Adenocarcinoma','Colorectal Adenocarcinoma','Other'],'CCLE_MSI':['MSI','MSS','MSI']})
        self.effects=pd.DataFrame({'ModelID':['a'],**{g:[-1.] for g in GENES.values()}})
        self.signatures=pd.DataFrame({'ModelID':['a'],'MSIScore':[.6]})
    def test_excludes_labels_and_retains_missing_models(self):
        result=assemble(self.models,self.effects,self.signatures)
        self.assertEqual(result.ModelID.tolist(),['a','b'])
        self.assertNotIn('CCLE_MSI',result)
        self.assertTrue(pd.isna(result.iloc[1].MSIScore))
    def test_rejects_duplicate_join_keys(self):
        with self.assertRaises(ValueError):assemble(self.models,pd.concat([self.effects,self.effects]),self.signatures)

if __name__=='__main__':unittest.main()
