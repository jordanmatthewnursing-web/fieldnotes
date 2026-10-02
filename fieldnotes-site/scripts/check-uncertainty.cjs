const {chromium,launchOptions,baseURL,artifact,axePath}=require('./test-runtime.cjs');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch(launchOptions);
 try {
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}});
   await page.goto(baseURL+'#gene=WRN&unit=donors');
   const panel=page.locator('[aria-label="Donor uncertainty"]');
   await panel.waitFor();
   assert.equal(await page.locator('circle.point').count(),61);
   await panel.locator('summary').click();
   const pending=page.waitForEvent('download');
   await panel.getByRole('link',{name:'Download uncertainty analysis'}).click();
   const download=await pending;
   await download.saveAs(artifact('downloaded-uncertainty.json'));
   const parsed=JSON.parse(fs.readFileSync(artifact('downloaded-uncertainty.json'),'utf8'));
   assert.equal(parsed.format,'fieldnotes-uncertainty-v1');
   assert.equal(parsed.analysis.point.n,61);
   await page.addScriptTag({path:axePath});
   const violations=await page.evaluate(async()=> (await axe.run(document.querySelector('.uncertainty'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations);
   assert.equal(violations.length,0,JSON.stringify(violations));
   await panel.locator('summary').click();
   await panel.screenshot({path:artifact(`uncertainty-panel-${width}.png`)});
   await page.evaluate(()=>window.scrollTo(0,0));
   await page.screenshot({path:artifact(`uncertainty-${width}.png`)});
   await page.selectOption('#gene','BRAF');
   assert.equal(await page.locator('.uncertainty').count(),0);
   await page.selectOption('#gene','WRN');await page.selectOption('#unit','models');
   assert.equal(await page.locator('.uncertainty').count(),0);
   await page.close();
  }
  const page=await browser.newPage();
  await page.route('**/fieldnotes-uncertainty.json',route=>route.abort());
  await page.goto(baseURL+'#gene=WRN&unit=donors');
  await page.getByText('Uncertainty analysis unavailable.',{exact:false}).waitFor();
  assert.equal(await page.locator('circle.point').count(),61);
  assert.equal(await page.locator('#export').isDisabled(),false);
  console.log('Uncertainty: desktop/phone display, scoped axe, separate download, gene/unit boundaries and failure isolation pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
