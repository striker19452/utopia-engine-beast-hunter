const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
(async()=>{
 const out=__dirname;
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
 const page=await browser.newPage({viewport:{width:1600,height:1080},deviceScaleFactor:1});
 const errors=[],badResponses=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)badResponses.push(r.url()+':'+r.status());});
 const results=[];
 try{
  for(const concept of ['journal','expedition','atlas']){
   await page.goto(`http://127.0.0.1:8890/design/interface-studies/?concept=${concept}`);
   await page.waitForFunction(()=>window.DesignStudy&&[...document.images].every(i=>i.complete));
   await page.screenshot({path:path.join(out,`${concept}-desktop.png`),fullPage:true});
   await page.locator('.game-shell').screenshot({path:path.join(out,`${concept}-interface.png`)});
   results.push({concept,viewport:'desktop',visibleStats:await page.locator('#stage .stat').evaluateAll(es=>es.filter(e=>e.getClientRects().length).length),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),brokenImages:await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src))});
  }
  await page.goto('http://127.0.0.1:8890/design/interface-studies/?concept=journal');
  await page.locator('#stage [data-region="coastal"]').click();
  if(await page.evaluate(()=>DesignStudy.state.region)!=='coastal')throw Error('region selection failed');
  await page.locator('#stage .game-btn[data-open="search"]').click();
  for(let round=0;round<3;round++){
   await page.locator('[data-roll]').click();
   for(let d=0;d<2;d++){
    await page.locator(`[data-die="${d}"]`).click();
    await page.locator(`[data-place="${round*2+d}"]`).click();
   }
  }
  if(await page.locator('.search-result strong').count()!==1)throw Error('dice resolution failed');
  await page.screenshot({path:path.join(out,'search-dialog.png'),fullPage:true});
  await page.locator('[data-finish]').click();
  if(await page.evaluate(()=>DesignStudy.state.records.coastal.length)!==2)throw Error('search record update failed');
  await page.locator('#stage .game-nav [data-open="inventory"]').click();
  await page.locator('#game-dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');
  await page.locator('#stage .game-nav [data-open="defense"]').click();
  if(await page.locator('.tower-grid').count()!==3)throw Error('tower diagrams missing');
  await page.keyboard.press('Escape');
  for(const width of [320,390,768]){
   await page.setViewportSize({width,height:844});
   for(const concept of ['journal','expedition','atlas']){
    await page.goto(`http://127.0.0.1:8890/design/interface-studies/?concept=${concept}`);
    await page.waitForFunction(()=>window.DesignStudy&&[...document.images].every(i=>i.complete));
    await page.screenshot({path:path.join(out,`${concept}-${width}.png`),fullPage:true});
    results.push({concept,viewport:width,visibleStats:await page.locator('#stage .stat').evaluateAll(es=>es.filter(e=>e.getClientRects().length).length),overflow:await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),brokenImages:await page.evaluate(()=>[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src))});
   }
  }
  const report={results,errors,badResponses,interactions:['region selection','three dice rolls','six placements','subtraction result','search record update','inventory modal','defense diagrams','Escape close']};
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  if(errors.length||badResponses.length||results.some(r=>r.overflow||r.brokenImages.length||r.visibleStats!==3))throw Error('visual or loading checks failed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
