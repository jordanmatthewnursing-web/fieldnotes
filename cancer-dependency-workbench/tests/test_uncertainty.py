import sys
import unittest
from pathlib import Path
import pandas as pd
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from continuous_uncertainty import uncertainty

class UncertaintyTests(unittest.TestCase):
    def frame(self):
        return pd.DataFrame({'ModelID': list('abcdefghij'), 'PatientID': list('abcdefghij'),
            'MSIScore': [0,1,1,2,3,4,5,6,7,8], 'effect': [9,6,8,5,7,2,4,1,3,0]})
    def test_seed_and_order_reproduce(self):
        a = uncertainty(self.frame(), 'effect', resamples=199)
        b = uncertainty(self.frame().iloc[::-1], 'effect', resamples=199)
        self.assertEqual(a, b)
        self.assertEqual(a['status'], 'available')
        self.assertLess(a['interval'][0], a['interval'][1])
        self.assertEqual(len(a['leaveOneDonorOut']), 10)
    def test_constant_and_too_small_unavailable(self):
        frame = self.frame(); frame['effect'] = 1
        self.assertIsNone(uncertainty(frame, 'effect')['interval'])
        self.assertIsNone(uncertainty(self.frame().iloc[:3], 'effect')['interval'])
    def test_donor_unit_and_degenerate_replicates(self):
        frame = self.frame().iloc[:4].copy()
        frame['MSIScore'] = [0,0,0,1]
        result = uncertainty(frame, 'effect', resamples=199)
        self.assertGreater(result['undefinedResamples'], 0)
        self.assertIsNone(result['interval'])
        frame = self.frame(); frame.loc[1,'PatientID'] = 'a'
        self.assertEqual(uncertainty(frame, 'effect', resamples=199)['point']['n'], 9)

if __name__ == '__main__': unittest.main()
