// Real village hotspots must preserve gameplay, state visuals and day-end guards.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/village-scene');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.svg':'image/svg+xml', '.webp':'image/webp' }[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ headless: true, executablePath: process.env.UEBH_BROWSER_EXECUTABLE || undefined });
  const results = [], errors = [];
  try {
    for (const [width,height,language] of [[1440,1050,'zh'],[1280,900,'en'],[768,900,'zh'],[662,706,'en'],[390,844,'zh'],[320,740,'en']]) {
      const context = await browser.newContext({ viewport: { width,height }, reducedMotion: 'reduce' });
      const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
      await page.goto(url);
      await page.evaluate(language => {
        Tutorial.preferences.hints=false; Tutorial.dismissInvitation(); document.querySelector('#btn-start-game').click(); I18n.setLanguage(language);
        Object.keys(GameState.materials).forEach(key=>GameState.materials[key]=4); UI.render(); AtlasUI.setPage('village');
      },language);
      await page.evaluate(()=>document.fonts.ready);
      const select = key => page.locator(`.village-building[data-village-select="${key}"]`).click();
      const shot = async label => {
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const metrics = await page.evaluate(()=>{
          const page=document.querySelector('#atlas-village-page'),pan=page.querySelector('.village-pan');
          const bad=[...page.querySelectorAll('.village-building')].filter(button=>{const r=button.getBoundingClientRect();return r.width<44||r.height<44;}).length;
          return {overflow:document.documentElement.scrollWidth>innerWidth+1, badTargets:bad, han:document.documentElement.lang==='en'&&/[\u3400-\u9fff]/.test(page.innerText),pan:pan.scrollWidth>pan.clientWidth, art:page.querySelector('.village-scene-art').naturalWidth, huts:page.querySelectorAll('.village-hut').length,towers:page.querySelectorAll('.village-tower').length};
        });
        results.push({width,height,language,label,...metrics});
        await page.screenshot({path:`${out}/${width}-${language}-${label}.png`,fullPage:true,animations:'disabled'});
        assert.equal(metrics.overflow,false);assert.equal(metrics.badTargets,0);assert.equal(metrics.han,false);assert.equal(metrics.art,1536);assert.equal(metrics.huts,9);assert.equal(metrics.towers,3);
      };
      await shot('initial');
      for (const key of ['tower:west','tower:south','tower:east',...Array.from({length:9},(_,i)=>`hut:${i}`),'hall','smithy','camp']) {
        await select(key);assert.equal(await page.evaluate(()=>VillageUI.selection),key);
        assert.equal(await page.locator(`.village-building[data-village-select="${key}"]`).getAttribute('aria-pressed'),'true');
      }
      assert.deepEqual(await page.evaluate(()=>[GameState.currentDay,GameState.hp.current,Object.values(GameState.elders).filter(Boolean).length]),[1,10,0],'Inspecting buildings cannot advance time or grant rewards.');
      await select('tower:west'); await page.locator('[data-village-action="build"]').click();
      assert.equal(await page.locator('#modal-content button[onclick*="BuildUI.startBuild"]').count(),3);
      await page.locator('#modal-content button[onclick="UI.closeModal()"]').click();
      await select('smithy'); await page.locator('[data-village-action="forge"]').click();
      assert.equal(await page.locator('#modal-content button[onclick*="ForgeUI.start"]').count(),3);
      await page.locator('#modal-content button[onclick="UI.closeModal()"]').click();
      await page.locator('[data-village-action="craft"]').click();
      assert.ok(await page.locator('#modal-content button[onclick*="CraftUI.craft"]').count()>0);
      await page.locator('#modal-content button[onclick="UI.closeModal()"]').click();
      await select('camp'); await page.locator('[data-village-action="rest"]').click();
      assert.equal(await page.locator('#modal-content button[onclick*="Game.doRest"]').count(),1);
      await page.locator('#modal-content button[onclick="UI.closeModal()"]').click();
      await page.evaluate(()=>{Game.debugSetTowerComplete('south',true);Game.debugSetTowerDestroyed('east',true);Game.debugSetHut(1,false);Game.debugSetHut(5,false);GameState.elders.epiphoros=true;GameState.craftedItems.hawk_totem=1;UI.render();});
      await select('tower:south');
      await page.locator('#tower-south-hawk button').click();
      await page.locator('button[onclick*="UI.confirmAttachHawkTotem"]').click();
      assert.equal(await page.evaluate(()=>GameState.craftedItems.hawk_totem),null);
      assert.equal(await page.locator('.village-tower.has-totem').count(),1);
      assert.equal(await page.locator('.village-tower[data-state="destroyed"]').count(),1);
      assert.equal(await page.locator('.village-hut[data-state="destroyed"]').count(),2);
      assert.equal((await page.locator('[data-village-count="huts"]').innerText()).replaceAll(' ',''),'7/9');
      await shot('damaged');
      await select('hut:1');await shot('huts');
      const translatedLabel=await page.locator('.village-hut[data-village-select="hut:1"]').getAttribute('aria-label');
      assert.ok(language==='en'?translatedLabel.includes('Destroyed'):translatedLabel.includes('已摧毁'));
      await page.evaluate(language=>{I18n.setLanguage(language==='en'?'zh':'en');I18n.setLanguage(language);},language);
      assert.equal(await page.locator('.village-hut[data-village-select="hut:1"]').getAttribute('aria-label'),translatedLabel);
      await select('smithy');await shot('workshop');
      await page.evaluate(()=>{GameState.pendingDayAction='rest';UI.render();});
      assert.equal(await page.locator('[data-village-action="forge"]').isDisabled(),true);
      await select('tower:west');assert.equal(await page.locator('[data-village-action="build"]').isDisabled(),true);
      await page.evaluate(()=>{const before=GameState.materials.stone;VillageUI.act('build');if(GameState.materials.stone!==before||GameState.build)throw Error('Pending settlement bypass');GameState.pendingDayAction=null;Game.newGame();});
      assert.equal(await page.locator('.village-hut[data-state="intact"]').count(),9);
      assert.equal(await page.locator('.village-tower[data-state="unfinished"]').count(),3);
      await select('hall');
      await page.locator('.village-building[data-village-select="hall"]').focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(()=>VillageUI.selection),'hall');
      results.push({width,language,workflow:'15 building hotspots; build/forge/craft/rest; install totem; ruins; live counters; language switch; settlement guard; reset; keyboard',status:'passed'});
      console.log(`${width} ${language}: village workflow passed`);
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();
    await page.route('**/assets/atlas/village-base.webp',route=>route.abort());await page.goto(url);
    await page.evaluate(()=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.querySelector('#btn-start-game').click();AtlasUI.setPage('village');});
    await page.locator('.village-art-fallback').waitFor({state:'visible'});
    await page.locator('.village-building[data-village-select="camp"]').click();assert.equal(await page.locator('[data-village-action="rest"]').isVisible(),true);
    results.push({fallback:'missing scene art retains building controls',status:'passed'});await context.close();
    assert.deepEqual(errors,[]);console.log(JSON.stringify({screens:results.filter(result=>result.label).length,workflows:results.filter(result=>result.workflow).length,errors},null,2));
  } finally { fs.writeFileSync(`${out}/checks.json`,JSON.stringify({results,errors},null,2));await browser.close(); server.close(); }
})().catch(error=>{server.close();console.error(error);process.exitCode=1;});
