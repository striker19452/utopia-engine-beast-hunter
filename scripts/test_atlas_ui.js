// Visual state fixtures run the real game renderers. Timers are held only in
// fixtures; test_tutorial.js separately exercises the uninterrupted live flow.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs', 'atlas-review');
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'design/atlas-system/scene-coverage.json')));
fs.mkdirSync(out, {recursive:true});
const server = http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png'}[path.extname(file)]||'application/octet-stream';res.setHeader('Content-Type',type);res.end(data);});
});
async function fixture(page,group,index,language){
 await page.evaluate(({group,index,language})=>{
  Tutorial.preferences.hints=false;Tutorial.dismissInvitation();
  const nativeTimeout=window.setTimeout;window.__fixtureTimers=[];
  window.setTimeout=(fn,ms,...args)=>ms>=200&&ms<=700?(window.__fixtureTimers.push(()=>fn(...args)),0):nativeTimeout(fn,ms,...args);
  Dice.roll=n=>Array(n).fill(6);
  GameState.reset();GameState.currentDay=6;GameState.daysCrossed=[1,2,3,4,5];
  const materials=()=>Object.keys(GameState.materials).forEach(k=>GameState.materials[k]=4);
  const search=()=>Game.startSearch('halebeard');
  const combat=(terrible=false)=>{search();CombatUI.startCombat('halebeard',terrible?'terrible':'common',terrible?undefined:GAME_DATA.regions.halebeard.commonBeasts[0]);};
  const build=()=>{materials();BuildUI.startBuild('east','stone');};
  const forge=()=>{materials();ForgeUI.start('silver_plate');};
  const pendingSearch=()=>{search();GameState.determination=2;SearchUI.rollDice();SearchUI.renderPendingRollPlacement();};
  const pendingCombat=()=>{combat(true);GameState.determination=2;CombatUI.rollCombatDice();CombatUI.renderPendingCombatRoll();};
  if(group==='cover'){
   if(index===2){GameState.hp.current=7;GameState.save();GameState.reset();Game.loadGame();assertFixture(GameState.hp.current===7,'saved progress restored');document.getElementById('btn-start-game').click();}
  }else document.getElementById('btn-start-game')?.click();
  switch(group){
   case 'cover':break;
   case 'map':{
    if(index===1)AtlasUI.region='coastal';
    if(index===2){GameState.regions.halebeard.tracking=[true,true,false];GameState.regions.coastal.tracking=[true,false,false];GameState.regions.scar.tracking=[true,true,true];}
    if(index===3)GameState.regions.halebeard.lairFound=true;
    if(index===4)GameState.beastsDefeated.halebeard=true;
    if(index===5)GameState.hp.current=1;
    if(index===6)GameState.doubt.current=17;
    if(index===7)GameState.currentDay=14;
    if(index===8){GameState.huts[0]=false;GameState.huts[1]=false;GameState.towers.east.destroyed=true;AtlasUI.page='village';}
    UI.render();break;
   }
   case 'search-select':{
    if(index===1)GameState.regions.halebeard.searchBoxes.forEach(b=>b.complete=true);
    if(index>=2){search();GameState.search.boxesCompleted=index===2?3:1;if(index===4)GameState.activeEvents.coastal=['Foul Weather'];SearchUI.showSearchActionOptions();}else Game.showSearchDialog();break;
   }
   case 'search-place':{
    if(index===0){search();break;}pendingSearch();
    if(index===2)SearchUI.placeDie('top',0,0);
    if(index===3){GameState.determination=0;SearchUI.renderPendingRollPlacement();}
    if(index===4){GameState.toolbelt.luck_charm=true;GameState.search.luckRerollsThisRoll=3;SearchUI.renderPendingRollPlacement();}
    if(index===5){const box=GameState.regions.halebeard.searchBoxes[0];box.top=[6,4,3];box.bottom=[6,2,2];box.complete=true;GameState.search.boxesCompleted=1;GameState.search.lastCompletedBoxIndex=0;SearchUI.showIntermediateResult('halebeard',21,Dice.getSearchResult(21),1,3);}
    break;
   }
   case 'search-result':{
    search();const values=[-111,51,4,0,31,53,32];const value=values[index];const s=GameState.search;s.boxesCompleted=1;s.lastCompletedBoxIndex=0;
    const box=GameState.regions.halebeard.searchBoxes[0];box.top=[4,6,3];box.bottom=[4,3,2];box.complete=true;
    if(index===4)materials();
    if(index===6){SearchUI.showPostCombatOptions();break;}
    SearchUI.showIntermediateResult('halebeard',value,Dice.getSearchResult(value),1,3);break;
   }
   case 'hunt-bait':{
    GameState.regions.halebeard.lairFound=true;
    if(index===0)Game.confirmTerribleBeastHunt('halebeard');
    if(index===1){GameState.craftedItems.potent_bait=1;Game.showPotentBaitDialog();}
    if(index===2){GameState.craftedItems.blood_lure=1;Game.showBloodLureBeasts('coastal');}
    if(index===3){GameState.beastWounds.halebeard=3;Game.confirmTerribleBeastHunt('halebeard');}
    if(index===4){Object.keys(GameState.beastsDefeated).forEach(k=>GameState.beastsDefeated[k]=true);GameState.craftedItems.potent_bait=1;Game.showPotentBaitDialog();}break;
   }
   case 'combat':{
    combat(index!==0);
    if(index===1){GameState.combat.nature='Cunning';GameState.combat.beastHp=3;CombatUI.renderCombat();}
    if(index===2){GameState.equipment.silver_plate='mastercraft';GameState.equipment.disintegrator_lance='mastercraft';GameState.activeEvents.halebeard=['Sudden Clarity'];CombatUI.renderCombat();}
    if(index===3){CombatUI.rollCombatDice();CombatUI.renderPendingCombatRoll();}
    if(index===4){GameState.determination=2;CombatUI.rollCombatDice();CombatUI.renderPendingCombatRoll();CombatUI.modifyPendingDie(0,-1);}
    if(index===5){GameState.combat.log=Array(25).fill('战斗开始！');CombatUI.renderCombat();}
    if(index===6){GameState.hp.current=1;GameState.determination=0;CombatUI.rollCombatDice();CombatUI.renderPendingCombatRoll();}break;
   }
   case 'combat-items-flee':{
    combat();
    if(index===0){GameState.craftedItems.firebox=1;GameState.toolbelt.balance_blade=true;CombatUI.useItem();}
    if(index===1){GameState.craftedItems.crab_plate=1;CombatUI.renderCombat();CombatUI.useItem();}
    if(index===2){GameState.craftedItems.reviving_dose=1;CombatUI.useItem();}
    if(index>=3){CombatUI.flee();CombatUI.renderPendingFleeRoll();if(index===4){GameState.combat.pendingRoll=[6,6];CombatUI.resolveFleeRoll();}if(index===5){GameState.combat.pendingRoll=[1,1];CombatUI.resolveFleeRoll();}}
    break;
   }
   case 'combat-outcome':{
    combat(index===1);
    if(index===0||index===1)CombatUI.victory();
    if(index===2){GameState.hp.current=0;CombatUI.defeat();}
    if(index===3){GameState.combat=null;GameState.phase='searching';GameState.search.boxesCompleted=1;SearchUI.showPostCombatOptions();}break;
   }
   case 'build-repair':{
    if(index===0){materials();AtlasUI.setPage('village');UI.render();}
    if(index===1){Game.showBuildDialog();}
    if(index===2){build();BuildUI.rollDice();BuildUI.renderPendingRollOptions();}
    if(index===3){build();GameState.determination=2;BuildUI.rollDice();BuildUI.renderPendingRollOptions();}
    if(index===4){build();GameState.towers.east.grid[2]='X';GameState.build.pendingRoll=[1,2];BuildUI.showRepairMaterialSelection();}
    if(index===5){build();BuildUI.getActiveIndices('east').forEach(i=>GameState.towers.east.grid[i]=3);GameState.towers.east.complete=true;BuildUI.renderBuild();}
    if(index===6){build();Object.keys(GameState.materials).forEach(k=>GameState.materials[k]=0);BuildUI.handleFault([1,2]);}break;
   }
   case 'elder-recharge':{
    if(index===0){GameState.elders.epiphoros=true;BuildUI.showElderSelection('beast');}
    if(index===1){GameState.toolbelt.balance_blade=true;GameState.craftedItemHistory.firebox=true;BuildUI.showRechargeUI();}
    if(index===2)BuildUI.showRechargeUI();
    if(index===3){GameState.towers.south.complete=true;GameState.craftedItems.hawk_totem=1;UI.attachHawkTotem('south');}break;
   }
   case 'forge':{
    if(index===0){Game.showForgeDialog();break;}forge();
    if(index===1){GameState.forge.box.top=[6,4,null];GameState.forge.box.bottom=[3,2,null];GameState.forge.box.results=[3,2,null];ForgeUI.renderForge();}
    if(index===2){GameState.determination=2;ForgeUI.rollDice();ForgeUI.renderForge();}
    if(index===3||index===4){GameState.forge.box={top:[6,5,4],bottom:[4,4,4],results:[2,1,0],complete:true};GameState.forge.refinedValue=3;if(index===3)ForgeUI.showRefinementResult();else ForgeUI.complete(3);}
    if(index===5)ForgeUI.abort();
    if(index>=6){GameState.forge.refinedValue=index===6?2:5;ForgeUI.complete();}break;
   }
   case 'craft':{
    if(index===0)Game.showCraftDialog();
    if(index===1){materials();GameState.craftedItems.heavy_coat=true;Game.showCraftDialog();}
    if(index===2){materials();GameState.craftedItemHistory.crab_plate=true;Game.showCraftDialog();}
    if(index===3){materials();CraftUI.craft('crab_plate');}break;
   }
   case 'inventory':{
    if(index===1||index===2){materials();AtlasUI.page='stores';UI.render();break;}
    if(index===3){GameState.toolbelt.balance_blade=true;GameState.toolbelt.luck_charm=true;}
    if(index===4){GameState.craftedItems.crab_plate=1;GameState.craftedItemHistory.firebox=true;GameState.craftedItemHistory.crab_plate=true;}
    if(index===5){GameState.equipment.silver_plate='standard';GameState.equipment.disintegrator_lance='mastercraft';}
    Game.showInventory();break;
   }
   case 'rest-day-end':{
    if(index===0)UI.showRestDialog();
    if(index===1){GameState.hp.current=9;Game.doRest();UI.render();}
    if(index===2){GameState.currentDay=14;UI.render();}
    if(index===3){GameState.pendingDayAction='rest';Events.showEventResults([{event:'Abundance',eventZh:'丰饶',regionZh:'海尔比尔德峰'}]);}
    if(index===4){GameState.pendingDayAction='rest';GameState.currentDay=7;Game.finishDayAndCheck();UI.render();}break;
   }
   case 'events':{
    const event=['Abundance','Sudden Clarity','Foul Weather','Madness','Terrible Beast Attack','Foul Weather'][index];
    const name=['丰饶','突然清醒','恶劣天气','疯狂','巨兽袭击！','恶劣天气'][index];
    GameState.activeEvents.halebeard=[event];
    if(index===5){UI.render();break;}
    Events.showEventResults([{event,eventZh:name,regionZh:'海尔比尔德峰',region:'halebeard',special:index===4}]);break;
   }
   case 'attacks':{
    const type=['tower_damage','tower_damage','hawk_totem_block','hut_destroyed','tower_destroyed','no_huts'][index];
    const result={type,beastName:'峰巅巨人',regionZh:'海尔比尔德峰',direction:'E',directionInfo:{directionName:'东'},directionRoll:2,towerName:'东方塔',towerDamageRoll:3,towerFaults:2,towerDamageTotal:5,damage:2,trackingUpdate:{added:index===4,completed:index===4,count:3}};
    if(index===5){GameState.pendingDayAction='search';Events.processNextBeastAttack(2,0);assertFixture(document.querySelector('#modal-content button[onclick*="processNextBeastAttack"]'),'second attack offered');break;}
    if(index===6){result.type='no_huts';GameState.huts.fill(false);}
    Events.showBeastAttackResult(result);break;
   }
   case 'tutorial':{
    Tutorial.start();
    if(index===0){Tutorial.exit();Tutorial.preferences.dismissed=false;Tutorial.renderInvitation();}
    if(index===1||index===2){Game.showSearchDialog();Game.startSearch('halebeard');if(index===2){SearchUI.rollDice();SearchUI.renderPendingRollPlacement();}}
    if(index===3){Tutorial.exit();Tutorial.hint('forge',true);}
    if(index===4)Tutorial.complete();
    if(index===5){Tutorial.exit();UI.render();}break;
   }
   case 'help-journal':{
    if(index===0||index===3)Game.showHelp();
    if(index===1){for(let n=0;n<24;n++)GameLog.add('新游戏开始！');AtlasUI.setPage('journal');}
    if(index===2){GameState.craftedItems.heavy_coat=true;Game.showInventory();}break;
   }
   case 'save-load-reset':{
    if(index===0)Game.saveGame();
    if(index===1){GameState.save();GameState.hp.current=5;Game.loadGame();assertFixture(GameState.hp.current===10,'loaded live state');}
    if(index===2){localStorage.removeItem('uebh_save_0');Game.loadGame();}
    if(index===3||index===4)UI.showNewGameDialog();break;
   }
   case 'endings':{
    if(index===0)Object.keys(GameState.beastsDefeated).forEach(k=>GameState.beastsDefeated[k]=true);
    if(index===1)GameState.hp.current=0;
    if(index===2)GameState.doubt.current=18;
    if(index===3)GameState.currentDay=15;
    if(index===4){materials();GameState.beastsDefeated.halebeard=true;GameState.equipment.silver_plate='mastercraft';GameState.currentDay=15;}
    if(index===5)GameState.hp.current=0;
    GameState.phase='game_over';Game.showGameOver();if(index===5){document.querySelector('#modal-content .confirm-actions button').click();assertFixture(GameState.phase==='idle'&&GameState.currentDay===1,'new game restored');}break;
   }
  }
  I18n.setLanguage(language);
  if(group==='cover'&&index!==2){}else AtlasUI.render();
  function assertFixture(value,label){if(!value)throw new Error(label);}
 },{group,index,language});
 await page.waitForTimeout(40);
}
async function checkInteractions(browser,url){
 const context=await browser.newContext({viewport:{width:1440,height:1050},reducedMotion:'reduce'});
 const page=await context.newPage();
 try{
  await page.goto(url);await page.evaluate(()=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();});
  await page.click('#btn-start-game');
  await page.click('[data-atlas-region="coastal"]');
  assert.equal(await page.evaluate(()=>AtlasUI.region),'coastal');
  assert.equal(await page.locator('.region-panel.coastal').isVisible(),true);
  for(const key of ['village','stores','journal','map']){
   await page.click(`[data-atlas-page="${key}"]`);
   assert.equal(await page.evaluate(()=>AtlasUI.page),key);
  }
  await page.click('#btn-inventory');
  assert.equal(await page.evaluate(()=>document.getElementById('game-interface').inert),true);
  await page.keyboard.press('Shift+Tab');
  assert.equal(await page.evaluate(()=>document.querySelector('#modal-content').contains(document.activeElement)),true);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.classList.contains('active')),false);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'btn-inventory');
  assert.equal(await page.evaluate(()=>document.getElementById('game-interface').inert),false);
  await page.evaluate(()=>{GameState.hp.current=7;Game.saveGame();UI.closeModal();GameState.hp.current=2;Game.loadGame();});
  assert.equal(await page.evaluate(()=>GameState.hp.current),7);
  await page.evaluate(()=>UI.closeModal());
  await page.click('#atlas-start-search');
  assert.equal(await page.evaluate(()=>GameState.search.region),'coastal');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.classList.contains('active')),true,'Escape cannot abandon a committed action');
  assert.equal(await page.locator('details.search-reference').evaluate(el=>el.open),false,'Rules remain available without displacing the active dice');
  await page.locator('.atlas-roll-info > summary').click();
  await page.locator('details.search-reference summary').click();
  assert.equal(await page.locator('details.search-reference').evaluate(el=>el.open),true);
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector('.modal-content')).transitionDuration),'0s');
  // Real queued attacks must keep their order and finish the pending day once.
  await page.goto(url);await fixture(page,'attacks',5,'zh');
  const before=await page.evaluate(()=>({huts:GameState.huts.filter(Boolean).length,day:GameState.currentDay}));
  await page.locator('#modal-content .confirm-actions button').click();
  assert.equal(await page.evaluate(()=>Events._pendingAttackIndex),1);
  assert.equal(await page.evaluate(()=>GameState.huts.filter(Boolean).length),before.huts-1);
  await page.locator('#modal-content .confirm-actions button').click();
  assert.equal(await page.evaluate(()=>GameState.pendingDayAction),null);
  assert.equal(await page.evaluate(()=>GameState.currentDay),before.day);
  await page.route('**/assets/atlas/hunting-map.webp',route=>route.abort());
  await page.route('**/assets/monsters/giant-of-the-peaks.webp',route=>route.abort());
  await page.goto(url);await page.click('#btn-start-game');
  assert.equal(await page.locator('.atlas-map-fallback').isVisible(),true);
  assert.equal(await page.locator('.atlas-dossier-beast.atlas-art-missing').count(),1);
  assert.equal(await page.locator('#atlas-beast-life').innerText(),'HP 6 / 6');
  assert.equal(await page.locator('[data-atlas-region="coastal"]').isEnabled(),true);
  await page.click('[data-atlas-region="coastal"]');
  assert.equal(await page.locator('#atlas-beast-name').innerText(),'潮汐潜伏者');
  await page.screenshot({path:path.join(out,'missing-map-fallback.png'),animations:'disabled'});
  return ['region and four world pages','modal focus, inert and keyboard return','save/load round trip','search action and safe Escape','reduced motion','two consecutive attacks and day-end continuation','missing map fallback'];
 }finally{await context.close();}
}
async function checkArtVariants(browser,url){
 const results=[];
 for(const [width,language] of [[1440,'zh'],[320,'en']]){
  const context=await browser.newContext({viewport:{width,height:width===1440?1050:844},reducedMotion:'reduce'});
  const page=await context.newPage();
  try{
   await page.goto(url);await page.evaluate(language=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();I18n.setLanguage(language);Dice.roll=n=>Array(n).fill(6);},language);
   const entries=await page.evaluate(()=>Object.entries(GAME_DATA.regions).flatMap(([region,data])=>[
    ...data.commonBeasts.map((beast,index)=>({region,index,nature:null})),
    ...['Cowed','Cruel','Cunning'].map(nature=>({region,index:-1,nature}))
   ]));
   for(const entry of [...entries,...['south','west','east'].map(tower=>({tower}))]){
    await page.evaluate(entry=>{
     UI.closeModal();GameState.reset();
     if(entry.tower){Object.keys(GameState.materials).forEach(k=>GameState.materials[k]=4);BuildUI.startBuild(entry.tower,'stone');BuildUI.rollDice();BuildUI.renderPendingRollOptions();}
     else{if(entry.nature)GameState.beastNature[entry.region]=entry.nature;Game.startSearch(entry.region);CombatUI.startCombat(entry.region,entry.index<0?'terrible':'common',entry.index<0?undefined:GAME_DATA.regions[entry.region].commonBeasts[entry.index]);}
    },entry);
    if(!entry.tower)await page.locator('.beast-portrait img').evaluate(img=>img.decode());
    const metrics=await page.evaluate(()=>{const el=document.getElementById('modal-content');return{overflow:el.scrollWidth>el.clientWidth+1,untranslated:document.documentElement.lang==='en'&&/[\u3400-\u9fff]/.test(el.innerText),images:[...el.querySelectorAll('img')].every(img=>img.complete&&img.naturalWidth>0)}});
    const screenshot=`variant-${entry.tower||entry.region+'-'+entry.index+'-'+(entry.nature||'common')}-${width}-${language}.png`;
    await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});
    results.push({...entry,width,language,screenshot,...metrics});
    assert.deepEqual(metrics,{overflow:false,untranslated:false,images:true},screenshot);
   }
  }finally{await context.close();}
 }
 fs.writeFileSync(path.join(out,'art-variant-checks.json'),JSON.stringify({createdAt:new Date().toISOString(),results},null,2));
 fs.writeFileSync(path.join(out,'art-variants.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>C · 怪物与塔形检查</title><style>body{background:#272e25;color:#e4ddc7;font:14px system-ui;margin:30px}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}a{color:inherit}img{width:100%}@media(max-width:760px){main{grid-template-columns:1fr 1fr}}</style><h1>C · 全部怪物、性格与塔形</h1><p>${results.length} 个补充组合 · <a href="index.html">返回全场景检查</a></p><main>${results.map(r=>`<a href="${r.screenshot}"><img loading="lazy" src="${r.screenshot}" alt="${r.tower||r.region}"><p>${r.tower||r.region+' / '+r.index+' / '+(r.nature||'common')} · ${r.width} · ${r.language}</p></a>`).join('')}</main></html>`);

 return results.length;
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.UEBH_BROWSER_EXECUTABLE||undefined});
 const errors=[],results=[];
 try{
  const interactions=await checkInteractions(browser,url);
  const artVariants=await checkArtVariants(browser,url);
  if(process.argv.includes('--variants-only')){console.log(JSON.stringify({interactions,artVariants}));return;}
  for(const [width,language,full] of [[1440,'zh',true],[390,'zh',true],[768,'en',true],[320,'en',true]]){
   const context=await browser.newContext({viewport:{width,height:width>1000?1050:844},reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   for(const group of matrix.groups){
    const extras={forge:[{id:'forge-standard',label:'标准锻造结果'},{id:'forge-failed',label:'锻造失败结果'}],attacks:[{id:'attack-no-huts',label:'无剩余小屋'}]};
    const allStates=[...group.required_states,...(extras[group.id]||[])];
    const states=full?allStates:[allStates[Math.min(1,allStates.length-1)]];
    for(const state of states){const index=allStates.indexOf(state);const name=`${state.id}-${width}-${language}`;
     try{
      await page.goto(url,{waitUntil:'load'});await fixture(page,group.id,index,language);
      const metrics=await page.evaluate(()=>{
       const c=document.getElementById('modal-content'),open=document.getElementById('modal-overlay').classList.contains('active');
       const actual=open?c:document.getElementById('game-interface');
       return {overflow:document.documentElement.scrollWidth>innerWidth+1,modalOverflow:open&&c.scrollWidth>c.clientWidth+1,scene:open?c.dataset.scene:'world',sheet:!open||c.classList.contains('atlas-sheet'),untranslated:document.documentElement.lang==='en'&&/[\u3400-\u9fff]/.test(actual.innerText),untranslatedLines:document.documentElement.lang==='en'?actual.innerText.split('\n').filter(t=>/[\u3400-\u9fff]/.test(t)):[],images:[...actual.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src)};
      });
      const screenshot=name+'.png';await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});
      results.push({id:state.id,label:state.label,group:group.id,width,language,screenshot,...metrics});
     }catch(e){results.push({id:state.id,group:group.id,width,language,error:e.message});}
    }
   }
   await context.close();
  }
  const failures=results.filter(r=>r.error||r.overflow||r.modalOverflow||!r.sheet||r.untranslated||r.images?.length);
  const report={createdAt:new Date().toISOString(),states:matrix.groups.reduce((n,g)=>n+g.required_states.length,0),renderedCases:results.length,artVariants,interactions,errors,failures,results};
  fs.writeFileSync(path.join(out,'scene-checks.json'),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>猎场战图 · 场景检查</title><style>body{background:#272e25;color:#e4ddc7;font:14px system-ui;margin:30px}h1{font:30px Georgia}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}a{color:inherit;text-decoration:none}img{width:100%;display:block;border:1px solid #8d8466}p{font-size:12px;line-height:1.7}@media(max-width:900px){main{grid-template-columns:repeat(2,1fr)}}</style><h1>C · 猎场战图 · 全场景检查</h1><p>${report.states} 个状态点 / ${results.length} 个视口与语言组合 / ${failures.length} 个待处理问题 · <a href="art-variants.html">全部怪物与塔形补充图集</a></p><main>${results.map(r=>`<a href="${r.screenshot||'#'}"><img loading="lazy" src="${r.screenshot||''}" alt="${r.label||r.id}"><p>${r.id} · ${r.width} · ${r.language}<br>${r.label||r.error}</p></a>`).join('')}</main></html>`);
  console.log(JSON.stringify({states:report.states,renderedCases:results.length,errors,failures:failures.map(({id,width,language,error,overflow,modalOverflow,untranslated,scene})=>({id,width,language,error,overflow,modalOverflow,untranslated,scene}))},null,2));
  assert.deepEqual(errors,[]);assert.equal(failures.length,0,'Inspect outputs/atlas-review/scene-checks.json');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
