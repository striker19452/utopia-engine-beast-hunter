// Exercise the carried-item strip through real controls and existing rule APIs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname,'..'), out = path.join(root,'outputs/loadout');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  fs.readFile(file,(error,data)=>{if(error)return res.writeHead(404).end();res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream'));res.end(data);});
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.UEBH_BROWSER_EXECUTABLE||undefined});
  const results=[],errors=[];
  try{
    for(const [width,height,language] of [[1440,900,'zh'],[1280,720,'en'],[768,900,'zh'],[662,706,'en'],[390,844,'zh'],[320,740,'zh'],[320,740,'en']]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<=768});
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      async function setup(){
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.evaluate(language=>{
          Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();I18n.setLanguage(language);
          Object.keys(GameState.materials).forEach(key=>GameState.materials[key]=4);
          GameState.equipment.silver_plate='mastercraft';GameState.equipment.dowsing_rod='standard';
          Object.assign(GameState.craftedItems,{blood_lure:1,heavy_coat:true,firebox:1,crab_plate:2,reviving_dose:1,hawk_totem:1});
          Object.entries(GameState.craftedItems).forEach(([key,value])=>{if(value)GameState.craftedItemHistory[key]=true;});
          GameState.craftedItemHistory.potent_bait=true;GameState.toolbelt.balance_blade=true;Dice.roll=n=>Array(n).fill(4);UI.render();
        },language);
      }
      async function geometry(stage){
        const metrics=await page.evaluate(()=>{
          const bar=document.querySelector('.hunter-loadout'),hud=document.querySelector('.hunter-status');
          const buttons=[...bar.querySelectorAll('button')];
          const clipped=buttons.filter(button=>{const r=button.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.width<43||r.height<43||r.left<0||r.right>innerWidth||!button.contains(hit);}).map(button=>button.dataset.loadoutItem);
          return {overflow:document.documentElement.scrollWidth>innerWidth+1,clipped,slots:buttons.length,hudHeight:hud.getBoundingClientRect().height,han:document.documentElement.lang==='en'&&/[\u3400-\u9fff]/.test(bar.innerText),fallback:document.body.classList.contains('loadout-art-missing')};
        });
        results.push({width,height,language,stage,...metrics});
        assert.equal(metrics.overflow,false);assert.deepEqual(metrics.clipped,[]);assert.equal(metrics.slots,13);assert.equal(metrics.han,false);
      }
      await setup();await page.waitForTimeout(100);await geometry('main');
      assert.equal(await page.locator('[data-loadout-item="silver_plate"]').getAttribute('class').then(text=>text.includes('mastercraft')),true);
      assert.equal(await page.locator('[data-loadout-item="crab_plate"] .loadout-charge .full').count(),2);
      const snapshot=await page.evaluate(()=>JSON.stringify(GameState.toJSON ? GameState.toJSON() : {equipment:GameState.equipment,craftedItems:GameState.craftedItems,toolbelt:GameState.toolbelt,day:GameState.currentDay}));
      for(const key of await page.locator('.loadout-slot').evaluateAll(buttons=>buttons.map(button=>button.dataset.loadoutItem))){
        await page.locator(`[data-loadout-item="${key}"]`).click();
        assert.equal(await page.locator('.loadout-detail').isVisible(),true);
        const bounds=await page.locator('.loadout-detail').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width&&bounds.y>=0&&bounds.y+bounds.height<=height);
        if(language==='en')assert.equal(await page.locator('.loadout-detail').innerText().then(text=>/[\u3400-\u9fff]/.test(text)),false);
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.loadout-detail').isVisible(),false);
        assert.equal(await page.evaluate(()=>document.activeElement.dataset.loadoutItem),key);
      }
      assert.equal(await page.evaluate(()=>JSON.stringify(GameState.toJSON ? GameState.toJSON() : {equipment:GameState.equipment,craftedItems:GameState.craftedItems,toolbelt:GameState.toolbelt,day:GameState.currentDay})),snapshot,'Inspecting inventory is read-only.');
      for(const world of ['village','stores','journal','map']){await page.evaluate(world=>AtlasUI.setPage(world),world);await geometry(world);}
      await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
      assert.ok(await page.locator('.hunter-status').boundingBox().then(r=>r.y>=-1&&r.y<10),'The strip remains visible while scrolling.');
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.locator('[data-loadout-item="potent_bait"]').click();
      await page.locator('[data-loadout-action="craft"]').click();
      assert.equal(await page.evaluate(()=>GameState.craftedItems.potent_bait),1);
      assert.equal(await page.evaluate(()=>GameState.materials.oily_meat),3);
      await page.locator('#modal-content .confirm-actions button').click();
      await page.locator('[data-loadout-item="hawk_totem"]').click();
      assert.equal(await page.locator('.loadout-detail-actions button').count(),0,'No totem installation on unfinished towers.');await page.keyboard.press('Escape');
      await page.evaluate(()=>{Game.debugSetTowerComplete('east',true);UI.render();});
      await page.locator('[data-loadout-item="hawk_totem"]').click();
      await page.locator('[data-loadout-action="install"][data-loadout-tower="east"]').click();
      await page.locator('button[onclick*="UI.confirmAttachHawkTotem"]').click();
      assert.equal(await page.evaluate(()=>GameState.towers.east.hawkTotem),true);
      assert.equal(await page.locator('[data-loadout-item="hawk_totem"]').evaluate(el=>el.classList.contains('installed')),true);
      await page.locator('[data-loadout-item="disintegrator_lance"]').click();
      await page.locator('[data-loadout-action="forge"]').click();
      assert.equal(await page.evaluate(()=>GameState.forge.equipment),'disintegrator_lance');
      await page.locator('#forge-dice button').click();await page.locator('#forge-dice .mod-btn').first().waitFor();
      const luck=page.locator('button[onclick="ForgeUI.rerollPendingWithLuckCharm()"]');
      assert.equal(await luck.locator('.loadout-inline-art').count(),1);
      await luck.click();assert.equal(await page.evaluate(()=>GameState.forge.luckRerollsThisRoll),1);
      assert.equal(await page.locator('[data-loadout-item="luck_charm"]').evaluate(el=>el.classList.contains('spent')),true);
      await page.locator('#forge-dice .die').first().click();
      assert.equal(await page.evaluate(()=>LoadoutUI.canUseLuck()),false,'A selected die locks the luck action as in the forge rules.');
      await setup();
      await page.evaluate(()=>{GameState.toolbelt.balance_blade=false;Game.startSearch('halebeard');CombatUI.startCombat('halebeard','terrible');});
      await page.locator('button[onclick="CombatUI.useItem()"]').click();
      assert.equal(await page.locator('button[onclick="CombatUI.activateItem(\'firebox\')"] .loadout-inline-art').count(),1);
      const hp=await page.evaluate(()=>GameState.combat.beastHp);
      await page.locator('button[onclick="CombatUI.activateItem(\'firebox\')"]').click();
      assert.equal(await page.evaluate(()=>GameState.combat.beastHp),hp-2);
      assert.equal(await page.evaluate(()=>GameState.craftedItems.firebox),null);
      assert.equal(await page.locator('[data-loadout-item="firebox"]').evaluate(el=>el.classList.contains('spent')),true,'A consumed crafted item remains in its original slot as used.');
      await page.evaluate(()=>{CombatUI.applyCrabPlate(1);UI.renderTopBar();});
      assert.equal(await page.locator('[data-loadout-item="crab_plate"] .loadout-charge .full').count(),1);
      // A stale action must never consume or activate an item after its legal window.
      await page.evaluate(()=>{GameState.pendingDayAction='rest';LoadoutUI.perform('use','optic_disruptor');});
      assert.equal(await page.evaluate(()=>GameState.toolbelt.optic_disruptor),false);
      await setup();await page.locator('[data-loadout-item="crab_plate"]').click();
      await page.screenshot({path:path.join(out,`${width}-${language}-detail.png`),animations:'disabled'});await page.keyboard.press('Escape');
      await page.screenshot({path:path.join(out,`${width}-${language}-main.png`),animations:'disabled'});
      await page.evaluate(()=>{Game.newGame();});
      assert.equal(await page.locator('.loadout-slot.mastercraft').count(),0);
      assert.equal(await page.locator('[data-loadout-group="tools"] .loadout-slot.owned').count(),3);
      results.push({width,language,workflow:'13 item inspectors; keyboard return; four world pages; sticky HUD; crafting; totem installation; forge and luck; combat consumable; crab charges; stale-action guard; reset',status:'passed'});
      await context.close();console.log(`${width} ${language}: loadout passed`);
    }
    const context=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce'}),page=await context.newPage();
    await page.route('**/assets/atlas/loadout-items.webp',route=>route.abort());await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(()=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();});
    await page.waitForFunction(()=>document.body.classList.contains('loadout-art-missing'));
    assert.equal(await page.locator('.loadout-slot').count(),13);await page.locator('[data-loadout-item="luck_charm"]').click();
    assert.equal(await page.locator('#loadout-detail-title').innerText(),'幸运符');await context.close();
    assert.deepEqual(errors,[]);console.log(JSON.stringify({layouts:results.filter(r=>r.stage).length,workflows:results.filter(r=>r.workflow).length,errors},null,2));
  }finally{fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,errors},null,2));await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1});
