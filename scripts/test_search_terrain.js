// Exercise the original search rules inside all three regional terrain scenes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'outputs/search-terrain');
fs.mkdirSync(out, {recursive:true});
const server = http.createServer((req,res) => {
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file,(error,data) => {
    if(error) return res.writeHead(404).end();
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)] || 'application/octet-stream');res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true,executablePath:process.env.UEBH_BROWSER_EXECUTABLE || undefined});
  const results=[], errors=[], violations=[];
  const sizes=[[1440,900,'zh'],[1280,720,'en'],[901,740,'zh'],[768,900,'zh'],[662,706,'en'],[561,740,'en'],[560,740,'en'],[390,844,'zh'],[320,740,'zh'],[320,740,'en']];
  try {
    for (const [width,height,language] of sizes) {
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<=768});
      const page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
      for(const region of ['halebeard','coastal','scar']) {
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.evaluate(({region,language}) => {
          Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();I18n.setLanguage(language);
          GameState.determination=5;Dice.roll=n=>window.__searchPairs?.shift() || Array(n).fill(4);AtlasUI.selectRegion(region,false);
        },{region,language});
        await page.locator('#atlas-start-search').click();
        await page.locator('.search-terrain-art img').evaluate(img=>img.decode());
        assert.equal(await page.locator('.search-terrain').getAttribute('data-search-region'),region);
        assert.equal(await page.locator('#search-placement button:disabled').count(),6,'Empty search cells remain visible before a roll.');
        async function geometry(stage) {
          await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
          const metrics=await page.evaluate(()=>{
            const modal=document.getElementById('modal-content'),cr=modal.getBoundingClientRect(),workspace=modal.querySelector('.search-workspace'),wr=workspace.getBoundingClientRect();
            const controls=[...workspace.querySelectorAll('button:not(:disabled)')];
            const clipped=controls.filter(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.left<wr.left-1||r.right>wr.right+1||r.top<wr.top-1||r.bottom>wr.bottom+1||r.top<cr.top||r.bottom>cr.bottom||!button.contains(hit);}).map(button=>({action:button.getAttribute('onclick'),rect:button.getBoundingClientRect().toJSON()}));
            const art=modal.querySelector('.search-terrain-art img');
            return {clipped,small:controls.filter(button=>{const r=button.getBoundingClientRect();return r.width<44||r.height<44;}).length,
              overflow:document.documentElement.scrollWidth>innerWidth+1 || modal.scrollWidth>modal.clientWidth+1,
              scroll:modal.scrollHeight>modal.clientHeight+2,han:document.documentElement.lang==='en' && /[\u3400-\u9fff]/.test(modal.innerText),
              source:art.currentSrc.split('/').pop(),art:art.naturalWidth,cells:workspace.querySelectorAll('#search-placement button').length};
          });
          const record={width,height,language,region,stage,...metrics};results.push(record);
          if(metrics.clipped.length||metrics.small||metrics.overflow||metrics.scroll||metrics.han||metrics.cells!==6)violations.push(record);
          assert.ok(metrics.art>0);assert.equal(metrics.source,`search-${region}${width<=560?'-mobile':''}.webp`);
          if(stage==='roll' || (stage==='second' && width===320))await page.screenshot({path:path.join(out,`${width}-${language}-${region}-${stage}.png`),animations:'disabled'});
        }
        await geometry('idle');
        await page.locator('#search-dice button').click();await page.locator('#search-dice .mod-btn').first().waitFor();await geometry('roll');
        await page.locator('button[onclick="SearchUI.modifyPendingDie(0, -1)"]').click();
        assert.deepEqual(await page.evaluate(()=>[GameState.search.pendingRoll[0],GameState.determination]),[3,4]);await geometry('modified');
        await page.locator('button[onclick="SearchUI.rerollPendingWithLuckCharm()"]').click();
        assert.deepEqual(await page.evaluate(()=>[...GameState.search.pendingRoll,GameState.search.luckRerollsThisRoll,GameState.toolbelt.luck_charm]),[4,4,1,true]);await geometry('rerolled');
        await page.locator('button[onclick="SearchUI.placeDie(\'top\', 0, 0)"]').focus();await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(()=>GameState.search.pendingDieIndex),1);
        assert.equal(await page.locator('#search-dice .mod-btn').count(),0);await geometry('second');
        await page.locator('button[onclick="SearchUI.placeDie(\'bottom\', 0, 1)"]').click();
        assert.equal(await page.locator('#search-placement button:disabled').count(),6);
        assert.deepEqual(await page.locator('#search-placement button').allTextContents(),['4','—','—','4','—','—']);await geometry('partial');
        await page.evaluate(()=>{window.__searchPairs=[[3,1],[2,1]];});
        for(let column=1;column<3;column++) {
          await page.locator('#search-dice button').click();await page.locator('#search-dice .mod-btn').first().waitFor();
          if(column===1)await geometry('next-roll');
          await page.locator(`button[onclick="SearchUI.placeDie('top', ${column}, 0)"]`).click();
          await page.locator(`button[onclick="SearchUI.placeDie('bottom', ${column}, 1)"]`).click();
        }
        assert.deepEqual(await page.evaluate(region=>{
          const box=GameState.regions[region].searchBoxes[0];return [box.top,box.bottom,box.complete,GameState.search.boxesCompleted,GameState.materials[GAME_DATA.regions[region].commonMaterial],GameState.currentDay];
        },region),[[4,3,2],[4,1,1],true,1,1,1],'Original 432 − 411 = 21 search result and material reward.');
        assert.equal(await page.locator('.search-result-display').isVisible(),true);
        await page.locator(`button[onclick="UI.closeModal(); SearchUI.start('${region}');"]`).click();
        assert.equal(await page.locator('.search-terrain').getAttribute('data-search-region'),region);
        assert.equal(await page.evaluate(()=>GameState.search.boxIndex),1);
        await page.locator('.atlas-roll-info > summary').click();assert.equal(await page.locator('.search-instructions').isVisible(),true);await page.locator('.atlas-roll-info > summary').click();
        results.push({width,language,region,workflow:'regional map entry; empty and partial field; determination; luck; keyboard fill; second die lock; three rolls; original reward; continuation; rules',status:'passed'});
      }
      console.log(`${width} ${language}: three search terrains passed`);await context.close();
    }
    const context=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce'}),page=await context.newPage();
    await page.route('**/assets/atlas/search-*.webp',route=>route.abort());await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(()=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();Dice.roll=n=>Array(n).fill(4);Game.startSearch('coastal');});
    await page.waitForSelector('.search-terrain .atlas-art-missing');await page.locator('#search-dice button').click();await page.locator('#search-placement button:not(:disabled)').first().click();
    assert.equal(await page.evaluate(()=>GameState.search.pendingDieIndex),1);await page.screenshot({path:path.join(out,'320-fallback.png'),animations:'disabled'});await context.close();
    assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);console.log(JSON.stringify({states:results.filter(r=>r.stage).length,workflows:results.filter(r=>r.workflow).length,errors},null,2));
  } finally {fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,errors,violations},null,2));await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
