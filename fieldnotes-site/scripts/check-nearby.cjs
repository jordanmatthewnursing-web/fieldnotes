const {chromium,launchOptions,baseURL,artifact,axePath}=require('./test-runtime.cjs');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch(launchOptions);try{
 for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}});
  await page.goto(baseURL+'#gene=WRN&unit=donors');
  await page.locator('[aria-label="Donor uncertainty"]').waitFor();
  const before=await page.locator('circle.point').evaluateAll(ps=>ps.map(p=>[p.dataset.id,p.getAttribute('cx'),p.getAttribute('cy')]));
  const target=await page.locator('circle.point').evaluateAll(ps=>{const rows=ps.map(p=>{const r=p.getBoundingClientRect();return {id:p.dataset.id,x:r.x+r.width/2,y:r.y+r.height/2}});return rows.sort((a,b)=>rows.filter(p=>Math.hypot(p.x-b.x,p.y-b.y)<=18).length-rows.filter(p=>Math.hypot(p.x-a.x,p.y-a.y)<=18).length)[0];});
  await page.mouse.click(target.x,target.y);
  const surface=page.locator(width===390?'#mobile-detail':'#detail');
  await surface.locator('.nearby').waitFor();
  const selected=new URL(page.url()).hash;
  const alternative=surface.locator('[data-nearby][aria-pressed="false"]').first();
  const id=await alternative.getAttribute('data-nearby');
  await alternative.focus();await page.keyboard.press('Enter');
  assert.notEqual(new URL(page.url()).hash,selected);
  assert.equal(new URLSearchParams(new URL(page.url()).hash.slice(1)).get('observation'),id);
  assert.equal(await page.evaluate(()=>document.activeElement.dataset.nearby),id);
  assert.deepEqual(await page.locator('circle.point').evaluateAll(ps=>ps.map(p=>[p.dataset.id,p.getAttribute('cx'),p.getAttribute('cy')])),before);
  await page.addScriptTag({path:axePath});
  const violations=await page.evaluate(async mobile=>(await axe.run(document.querySelector(mobile?'#observation-dialog':'#detail'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations,width===390);
  assert.equal(violations.length,0,JSON.stringify(violations));
  await surface.screenshot({path:artifact(`nearby-${width}.png`)});
  if(width===390)await page.keyboard.press('Escape');
  await page.selectOption('#gene','BRAF');
  assert.equal(await page.locator('#detail .nearby').count(),0);
  await page.close();
 }
 console.log('Nearby selection: actual dense-point click, keyboard alternative, focus restoration, unchanged coordinates, cleared gene state and scoped axe pass at desktop/phone.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
