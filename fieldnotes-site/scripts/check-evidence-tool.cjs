const {chromium,launchOptions,baseURL}=require('./test-runtime.cjs');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch(launchOptions);try{
 const page=await browser.newPage();
 await page.addInitScript(()=>Object.defineProperty(document,'modelContext',{value:{registerTool(tool){window.evidenceTool=tool;}},configurable:true}));
 await page.goto(baseURL);await page.waitForFunction(()=>!!window.evidenceTool);
 const read=()=>page.evaluate(()=>window.evidenceTool.execute({}));
 let result=await read();assert.equal(result.layer,'models');assert.equal(result.summary.n,63);
 await page.selectOption('#unit','donors');result=await read();assert.equal(result.summary.n,61);assert.equal(result.coverage.plotted,61);assert.equal(result.sourceCoverage.models,96);
 assert(Math.abs(result.summary.spearmanRho-(-.6038234751839835))<1e-12);
 await page.locator('tbody button').first().click();result=await read();assert.equal(result.selectedObservation,new URLSearchParams(new URL(page.url()).hash.slice(1)).get('observation'));
 for(const gene of ['BRAF','KRAS','PCNA','RPL4']){await page.selectOption('#gene',gene);result=await read();assert.equal(result.gene,gene);assert(!('spearmanRho' in result.summary));assert.equal(result.summary.n,result.coverage.plotted);}
 await page.locator('#tumor-layer').click();await page.waitForSelector('[data-sample]');result=await read();assert.equal(result.layer,'tumors');assert.equal(result.coverage.samples,594);assert(!('spearmanRho' in result));
 await page.locator('#model-layer').click();await page.waitForSelector('#gene');result=await read();assert.equal(result.gene,'RPL4');assert.equal(result.unit,'donors');
 for(const bad of [null,[],{gene:'WRN'}])assert(await page.evaluate(input=>{try{window.evidenceTool.execute(input);return false}catch{return true}},bad));
 await page.route('**/continuous-evidence.json',route=>route.abort());await page.reload();await page.waitForFunction(()=>!!window.evidenceTool);
 assert(await page.evaluate(()=>{try{window.evidenceTool.execute({});return false}catch{return true}}));
 console.log('Evidence tool: current model/donor estimates, selection, all comparator genes, layer round trip, invalid inputs and unavailable source rejection pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
