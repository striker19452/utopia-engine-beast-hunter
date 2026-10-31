// Actual encounters and rewards, plus silhouette-only Mastercraft indicators.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'outputs/combat-loot');fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'));res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.UEBH_BROWSER_EXECUTABLE||undefined});
  const results=[],errors=[],violations=[];
  try{
    for(const [width,height,language]of[[1440,900,'zh'],[1280,720,'en'],[768,900,'zh'],[662,706,'en'],[390,844,'zh'],[320,740,'zh'],[320,740,'en']]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(8000);page.on('pageerror',error=>errors.push(error.message));
      async function setup(){
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.evaluate(language=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();I18n.setLanguage(language);GameState.determination=5;Dice.roll=n=>Array(n).fill(6);Object.assign(GameState.equipment,{silver_plate:'mastercraft',dowsing_rod:'standard',disintegrator_lance:'mastercraft'});UI.render();},language);
      }
      await setup();
      assert.equal(await page.locator('.loadout-slot.mastercraft .loadout-state-mark').count(),0);
      assert.match(await page.locator('[data-loadout-item="silver_plate"] .loadout-art').evaluate(el=>getComputedStyle(el).filter),/drop-shadow/);
      assert.equal(await page.locator('[data-loadout-item="dowsing_rod"] .loadout-art').evaluate(el=>getComputedStyle(el).filter),'none');
      await page.locator('[data-loadout-item="silver_plate"]').click();
      assert.match(await page.locator('.loadout-detail-picture .loadout-art').evaluate(el=>getComputedStyle(el).filter),/drop-shadow/);
      if(width===1440||width===320)await page.screenshot({path:path.join(out,`${width}-${language}-mastercraft.png`),animations:'disabled'});
      await page.keyboard.press('Escape');
      const beasts=await page.evaluate(()=>Object.entries(GAME_DATA.regions).flatMap(([region,data])=>data.commonBeasts.map(beast=>({region,name:beast.name,material:beast.material}))));
      async function geometry(stage,beast){
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const metrics=await page.evaluate(()=>{
          const modal=document.getElementById('modal-content'),mr=modal.getBoundingClientRect(),loot=modal.querySelector('.combat-loot'),lr=loot.getBoundingClientRect();
          const buttons=[...modal.querySelectorAll('.atlas-roll-main button:not(:disabled)')];
          return {overflow:document.documentElement.scrollWidth>innerWidth+1||modal.scrollWidth>modal.clientWidth+1,scroll:modal.scrollHeight>modal.clientHeight+2,
            lootClipped:lr.left<mr.left||lr.right>mr.right||lr.top<mr.top||lr.bottom>mr.bottom||loot.scrollWidth>loot.clientWidth+1,
            clipped:buttons.filter(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.left<mr.left||r.right>mr.right||r.top<mr.top||r.bottom>mr.bottom||!button.contains(hit);}).map(button=>button.getAttribute('onclick')),
            han:document.documentElement.lang==='en'&&/[\u3400-\u9fff]/.test(modal.innerText)};
        });
        const record={width,height,language,stage,beast:beast.name,...metrics};results.push(record);
        if(metrics.overflow||metrics.scroll||metrics.lootClipped||metrics.clipped.length||metrics.han)violations.push(record);
      }
      for(const beast of beasts){
        await setup();
        await page.evaluate(({region,name})=>{Game.startSearch(region);CombatUI.startCombat(region,'common',GAME_DATA.regions[region].commonBeasts.find(beast=>beast.name===name));},beast);
        const loot=page.locator(`[data-combat-loot="${beast.material}"]`);assert.equal(await loot.count(),1);
        await loot.locator('img').evaluate(img=>img.decode());
        assert.equal(await loot.locator('strong').innerText().then(text=>text.includes('×1')),true);
        await geometry('encounter',beast);
        await page.locator('button[onclick="CombatUI.rollCombatDice()"]').click();await page.locator('#combat-dice .mod-btn').first().waitFor();await geometry('roll',beast);
        if(beast.name==='Nightmare Crab')await page.screenshot({path:path.join(out,`${width}-${language}-crab-roll.png`),animations:'disabled'});
        await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]').click();
        if(await page.evaluate(()=>Boolean(GameState.combat))){await page.locator('button[onclick="CombatUI.rollCombatDice()"]').click();await page.locator('#combat-dice .mod-btn').first().waitFor();await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]').click();}
        assert.equal(await page.evaluate(()=>GameState.combat),null);
        assert.equal(await page.evaluate(material=>GameState.materials[material],beast.material),1);
        assert.equal(await page.locator(`.combat-loot-result[data-combat-loot="${beast.material}"]`).count(),1);await geometry('victory',beast);
        if(beast.name==='Nightmare Crab')await page.screenshot({path:path.join(out,`${width}-${language}-crab-victory.png`),animations:'disabled'});
      }
      for(const region of ['halebeard','coastal','scar']){
        await setup();await page.evaluate(region=>{GameState.beastNature[region]='Cruel';Game.startSearch(region);CombatUI.startCombat(region,'terrible');},region);
        assert.equal(await page.locator('.combat-loot.no-material').count(),1);assert.equal(await page.locator('.combat-loot img').count(),0);
        await page.locator('button[onclick="CombatUI.rollCombatDice()"]').click();await page.locator('#combat-dice .mod-btn').first().waitFor();await geometry('terrible-roll',{name:region});
      }
      await setup();await page.evaluate(()=>{GameState.materials.foul_blood=4;Game.startSearch('halebeard');CombatUI.startCombat('halebeard','common',GAME_DATA.regions.halebeard.commonBeasts[0]);});
      await page.locator('button[onclick="CombatUI.rollCombatDice()"]').click();await page.locator('#combat-dice .mod-btn').first().waitFor();await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]').click();
      assert.equal(await page.evaluate(()=>GameState.materials.foul_blood),4);assert.match(await page.locator('.combat-loot-result small').innerText(),language==='en'?/inventory is full/:/库存已满/);await geometry('full-stock',{name:'Frost Gremlin'});
      await page.evaluate(()=>{Game.newGame();});assert.equal(await page.locator('.mastercraft-art').count(),0);
      results.push({width,language,workflow:'Mastercraft outline; standard contrast; detail; 12 common beasts and 7 materials; actual victory drops; 3 Terrible Beasts with no material; full inventory; reset',status:'passed'});
      console.log(`${width} ${language}: loot and Mastercraft passed`);await context.close();
    }
    const context=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce'}),page=await context.newPage();
    await page.route('**/assets/atlas/combat-loot.webp',route=>route.abort());await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(()=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();CombatUI.startCombat('coastal','common',GAME_DATA.regions.coastal.commonBeasts[3]);});
    await page.waitForSelector('.combat-loot-art.atlas-art-missing',{state:'attached'});assert.match(await page.locator('.combat-loot-label').innerText(),/噩梦甲壳/);await context.close();
    assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);console.log(JSON.stringify({states:results.filter(r=>r.stage).length,workflows:results.filter(r=>r.workflow).length,errors},null,2));
  }finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,errors,violations},null,2));await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
