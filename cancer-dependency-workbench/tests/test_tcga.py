import copy
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from analyze_tcga import assemble, STUDY, PROFILE


class CohortIntegrity(unittest.TestCase):
    def setUp(self):
        self.samples = [dict(studyId=STUDY, sampleId=s, patientId=p, sampleType='Primary Solid Tumor') for s, p in [('a', 'p1'), ('b', 'p2')]]
        self.clinical = [dict(studyId=STUDY, sampleId='a', patientId='p1', clinicalAttributeId='MSI_SCORE_MANTIS', value='0.5')]
        self.expression = [dict(studyId=STUDY, sampleId='a', patientId='p1', entrezGeneId=7486, molecularProfileId=PROFILE, value=3)]

    def test_missing_is_not_zero_or_a_category(self):
        cohort = assemble(self.samples, self.clinical, self.expression).set_index('sampleId')
        self.assertEqual(cohort.loc['a', 'WRN_log2_RSEM_plus_1'], 2)
        self.assertTrue(cohort.loc['b', ['MSI_SCORE_MANTIS', 'WRN_RSEM']].isna().all())
        self.assertNotIn('msi_group', cohort.columns)

    def test_rejects_corrupt_identity_and_measurements(self):
        changes = [
            ('sampleId', 'unknown'), ('patientId', 'wrong'), ('studyId', 'another_study'),
            ('entrezGeneId', 673), ('molecularProfileId', 'z_scores'), ('value', float('inf')),
            ('value', -1), ('value', 'invalid')
        ]
        for key, value in changes:
            with self.subTest(key=key, value=value):
                expression = copy.deepcopy(self.expression)
                expression[0][key] = value
                with self.assertRaises(ValueError):
                    assemble(self.samples, self.clinical, expression)

    def test_duplicate_records_rejected(self):
        for position in range(3):
            with self.subTest(position=position):
                inputs = copy.deepcopy([self.samples, self.clinical, self.expression])
                inputs[position].append(copy.deepcopy(inputs[position][0]))
                with self.assertRaises(ValueError):
                    assemble(*inputs)


if __name__ == '__main__':
    unittest.main()
