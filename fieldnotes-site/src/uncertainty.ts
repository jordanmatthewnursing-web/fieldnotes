import { z } from 'zod/v3';
import { validate, spearman } from './contract.js';
import type { ModelData } from './schema.js';
const rho = z.number().finite().min(-1).max(1);
const schema = z.object({
  format: z.literal('fieldnotes-uncertainty-v1'), datasetText: z.string(), replay: z.string(),
  analysis: z.object({
    unit:z.literal('source donor; medians of complete measurement pairs'),
    point:z.object({spearmanRho:rho,n:z.number().int().min(4),status:z.literal('available')}).strict(),
    seed:z.literal(20260929),resamples:z.literal(9999),method:z.literal('paired BCa bootstrap'),
    confidenceLevel:z.literal(.95),interval:z.tuple([rho,rho]),status:z.literal('available'),
    undefinedResamples:z.literal(0),warnings:z.array(z.string()).length(0),
    leaveOneDonorOut:z.array(z.object({omittedDonorId:z.string(),spearmanRho:rho,n:z.number().int(),status:z.literal('available')}).strict()),
    input:z.object({path:z.literal('data/derived/continuous-evidence.json'),sha256:z.string().regex(/^[a-f0-9]{64}$/),release:z.string()}).strict(),
    limits:z.array(z.string()).min(1)
  }).strict()
}).strict();
export type Uncertainty = z.infer<typeof schema>;
export async function validateUncertainty(input:unknown, current:ModelData) {
  const bundle=schema.parse(input), a=bundle.analysis;
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(bundle.datasetText))),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==a.input.sha256) throw Error('Uncertainty source checksum mismatch');
  const source=validate(JSON.parse(bundle.datasetText));
  if(JSON.stringify(source)!==JSON.stringify(current) || a.input.release!==current.release) throw Error('Uncertainty belongs to a different source snapshot');
  const donors=current.donorSensitivity.donors;
  const near=(a:number|null,b:number)=>a!==null && Math.abs(a-b)<1e-12;
  if(a.interval[0]>a.interval[1] || a.point.n!==donors.length || !near(current.donorSensitivity.donorLevel.spearmanRho,a.point.spearmanRho)) throw Error('Uncertainty summary mismatch');
  if(a.leaveOneDonorOut.length!==donors.length || new Set(a.leaveOneDonorOut.map(r=>r.omittedDonorId)).size!==donors.length) throw Error('Incomplete influence analysis');
  for(const row of a.leaveOneDonorOut){
    const kept=donors.filter(d=>d.donorId!==row.omittedDonorId);
    if(kept.length!==donors.length-1 || row.n!==kept.length || !near(spearman(kept.map(d=>d.msiScore),kept.map(d=>d.geneEffect)),row.spearmanRho)) throw Error('Influence result mismatch');
  }
  return bundle;
}
export function uncertaintyPanel(bundle:Uncertainty|undefined,failed:boolean){
  if(!bundle) return `<section class="uncertainty"><h3>How stable is this estimate?</h3><p class="sub">${failed?'Uncertainty analysis unavailable. The source observations remain usable.':'Loading the donor uncertainty analysis…'}</p></section>`;
  const a=bundle.analysis,[lo,hi]=a.interval,x=(v:number)=>20+(v+1)*130;
  return `<section class="uncertainty" aria-label="Donor uncertainty"><div class="eyebrow">WRN · 61 SOURCE DONORS</div><h3>How stable is this estimate?</h3><svg viewBox="0 0 300 72" role="img" aria-label="Donor correlation ${a.point.spearmanRho.toFixed(3)}, nominal 95 percent bootstrap interval ${lo.toFixed(3)} to ${hi.toFixed(3)}"><line x1="20" x2="280" y1="28" y2="28" class="interval-axis"/><line x1="${x(lo)}" x2="${x(hi)}" y1="28" y2="28" class="interval-range"/><circle cx="${x(a.point.spearmanRho)}" cy="28" r="5"/><text x="20" y="60">−1</text><text x="150" y="60" text-anchor="middle">0</text><text x="280" y="60" text-anchor="end">+1</text></svg><p class="interval-values">${lo.toFixed(3)} <span>to</span> ${hi.toFixed(3)}</p><p class="sub">Nominal 95% bootstrap interval. Resamples source donors; applies only to this donor-median estimate.</p><details><summary>Assumptions &amp; reproduction</summary><p class="sub">9,999 paired BCa resamples; seed 20260929. Assumes independent, exchangeable donors in this selected cohort. Missingness, selection and confounding remain. No patient or treatment inference.</p><p class="sub">Leaving out one donor at a time gives correlations from ${Math.min(...a.leaveOneDonorOut.map(r=>r.spearmanRho)).toFixed(3)} to ${Math.max(...a.leaveOneDonorOut.map(r=>r.spearmanRho)).toFixed(3)}. This checks influence; it is not a confidence interval.</p><p class="sub">The download includes source data, analysis and the Python replay command. The regular observation export remains separate. The browser verifies source and influence results; the Python replay recomputes the bootstrap.</p><a href="fieldnotes-uncertainty.json" download>Download uncertainty analysis</a></details></section>`;
}
