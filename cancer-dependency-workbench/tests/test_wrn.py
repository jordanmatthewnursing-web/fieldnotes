import sys
import unittest
from pathlib import Path
import pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from analysis_core import comparison, donor_medians, EFFECT

class WRNIntegrity(unittest.TestCase):
    def setUp(self):
        self.frame = pd.DataFrame({'PatientID':['a','a','b','c','d'], 'msi_group':['MSI','MSI','MSI','MSS','MSS'], EFFECT:[-3.,-1.,-2.,0.,0.]})

    def test_related_models_collapsed_before_comparison(self):
        donors = donor_medians(self.frame)
        self.assertEqual(len(donors),4)
        result = comparison(donors)
        self.assertEqual(result['MSI_n'],2)
        self.assertEqual(result['median_difference_MSI_minus_MSS'],-2.)
        self.assertEqual(result['bootstrap_95_percentile_interval'],[-2.,-2.])
        self.assertEqual(result,comparison(donors))

    def test_missing_and_conflicting_donors_rejected(self):
        for field, value in [('PatientID',None), ('PatientID',''), ('msi_group','MSS')]:
            with self.subTest(field=field,value=value):
                frame=self.frame.copy(); frame.loc[0,field]=value
                with self.assertRaises(ValueError): donor_medians(frame)

    def test_unusable_groups_rejected(self):
        for field,value in [('msi_group','Unknown'),(EFFECT,float('nan')),(EFFECT,float('inf'))]:
            with self.subTest(field=field,value=value):
                frame=self.frame.copy(); frame.loc[0,field]=value
                with self.assertRaises(ValueError): comparison(frame)
        with self.assertRaises(ValueError): comparison(self.frame.iloc[:3])

if __name__=='__main__': unittest.main()
