import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {serve} from './serve.mjs';
const label=process.argv[2]||'after';
const {server,url}=await serve();const browser=await chromium.launch({headless:true});const records=[];
try{for(const width of [390,1440]){const page=await browser.newPage({viewport:{width,height:1000}});await page.goto(url+'#gene=WRN&unit=donors');await page.locator('[aria-label="Donor uncertainty"]').waitFor();await page.evaluate(()=>document.fonts.ready);const boxes=await page.evaluate(()=>Object.fromEntries(['.intro','.toolbar','.charthead','svg[data-plot-left]','#detail','.uncertainty'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return [s,{top:r.top,bottom:r.bottom,height:r.height}]})));const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);records.push({width,boxes,overflow});await page.screenshot({path:`artifacts/layout-${label}-${width}.png`});await page.close();}}finally{await browser.close();server.closeAllConnections();server.close();}
await writeFile(`artifacts/layout-${label}.json`,JSON.stringify(records,null,2)+'\n');console.log(JSON.stringify(records));
