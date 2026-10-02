import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../.compiled/contract.js';
import {validateUncertainty} from '../.compiled/uncertainty.js';
const data=validate(JSON.parse(await readFile('src/continuous-evidence.json','utf8')));
const bundle=JSON.parse(await readFile('src/fieldnotes-uncertainty.json','utf8'));
await validateUncertainty(bundle,data);
for(const mutate of [
 b=>{b.datasetText+=' ';},
 b=>{b.analysis.point.n--;},
 b=>{b.analysis.leaveOneDonorOut.pop();},
 b=>{b.analysis.leaveOneDonorOut[0].spearmanRho=0;},
 b=>{b.analysis.interval.reverse();},
 b=>{b.analysis.input.release='other';},
 b=>{b.analysis.undefinedResamples=1;},
]){const bad=structuredClone(bundle);mutate(bad);await assert.rejects(()=>validateUncertainty(bad,data));}
const other=structuredClone(data);other.models[0].CellLineName+=' changed';
await assert.rejects(()=>validateUncertainty(bundle,other));
console.log('Uncertainty: source binding, summary, influence and invalid interval checks pass. Bootstrap recomputation belongs to Python replay.');
