import sys, unittest
from pathlib import Path
import pandas as pd
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from continuous_sensitivity import donor_pairs, sensitivity, correlation

class DonorSensitivity(unittest.TestCase):
    def frame(self):
        return pd.DataFrame({'ModelID':['a','b','c','d'],'PatientID':['p','p','q','r'],
                             'MSIScore':[2.,4.,6.,8.],'effect':[-1.,-3.,-4.,-5.]})
    def test_pairs_then_donor_medians(self):
        result=sensitivity(self.frame(),'effect')
        self.assertEqual(result['modelLevel']['n'],4)
        self.assertEqual(result['donorLevel']['n'],3)
        self.assertEqual(result['donorLevel']['spearmanRho'],-1.)
        row=result['donors'][0]
        self.assertEqual((row['msiScore'],row['geneEffect']),(3.,-2.))
        self.assertEqual(row['modelIds'],['a','b'])
    def test_no_manufactured_pairs_from_complementary_missingness(self):
        frame=self.frame();frame.loc[0,'effect']=None;frame.loc[1,'MSIScore']=None
        result=sensitivity(frame,'effect')
        self.assertEqual(result['unpairedModels'],2)
        self.assertEqual(len(result['donors']),2)
        self.assertNotIn('p',[r['donorId'] for r in result['donors']])
    def test_rejects_missing_donor_and_duplicate_model(self):
        frame=self.frame();frame.loc[0,'PatientID']=None
        with self.assertRaises(ValueError):donor_pairs(frame,'effect')
        frame=self.frame();frame.loc[0,'ModelID']='b'
        with self.assertRaises(ValueError):donor_pairs(frame,'effect')
    def test_too_few_pairs_report_unavailable(self):
        self.assertEqual(correlation([1,2],[2,1]),{'spearmanRho':None,'n':2,'status':'unavailable'})

    def test_constant_scores_report_unavailable_not_zero(self):
        self.assertIsNone(correlation([1,1,1],[2,3,4])['spearmanRho'])

if __name__=='__main__':unittest.main()
