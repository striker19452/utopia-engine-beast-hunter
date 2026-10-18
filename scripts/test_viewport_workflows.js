// Regression for dice turns that fit the viewport and the help reading area.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/viewport-workflows');
fs.mkdirSync(out, {recursive: true});
const server = http.createServer((req,res) => {
 const file = path.resolve(root, '.' + (new URL(req.url,'http://localhost').pathname === '/' ? '/index.html' : decodeURIComponent(new URL(req.url,'http://localhost').pathname)));
 if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
 fs.readFile(file, (error,data) => { if(error) return res.writeHead(404).end(); res.setHeader('Content-Type', {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)] || 'text/plain'); res.end(data); });
});
(async () => {
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const browser = await chromium.launch({headless: true, executablePath: process.env.UEBH_BROWSER_EXECUTABLE || undefined});
 const results = [], errors = [];
 try {
  for (const {viewport,language} of [{width:1440,height:900},{width:1280,height:720},{width:662,height:706},{width:390,height:844},{width:320,height:740}].map(viewport=>({viewport,language:'zh'})).concat([{viewport:{width:662,height:706},language:'en'},{viewport:{width:320,height:740},language:'en'}])) {
   const context = await browser.newContext({viewport, reducedMotion:'reduce'});
   const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
   async function setup(kind, extra) {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(({kind,extra,language}) => {
     Tutorial.preferences.hints = false; Tutorial.dismissInvitation();
     document.getElementById('btn-start-game').click(); I18n.setLanguage(language);
     GameState.determination = 5; Dice.roll = n => Array(n).fill(4);
     if (kind === 'search') Game.startSearch('halebeard');
     if (kind === 'build') { Object.keys(GameState.materials).forEach(k=>GameState.materials[k]=4); BuildUI.startBuild(extra,'stone'); }
     if (kind === 'forge') { GameState.materials.silver=4; ForgeUI.start('silver_plate'); }
     if (kind === 'combat') { Game.startSearch('halebeard'); CombatUI.startCombat('halebeard','terrible'); }
     if (kind === 'help') Game.showHelp();
     if (kind === 'stores') { Object.keys(GameState.materials).forEach((k,i)=>GameState.materials[k]=i%5);GameState.craftedItems.crab_plate=2;GameState.craftedItems.firebox=1;UI.render();AtlasUI.setPage('stores'); }
    },{kind,extra,language});
   }
   async function visible(label) {
    await page.waitForTimeout(60);
    const metrics = await page.evaluate(() => {
     const content = document.getElementById('modal-content'), cr = content.getBoundingClientRect();
     const controls = [...content.querySelectorAll('.atlas-roll-main button:not(:disabled), .atlas-roll-main .tower-cell[role="button"], .atlas-roll-sheet > .confirm-actions button, #tutorial-note button:not(:disabled)')].filter(el=>el.getClientRects().length && (el.tagName !== 'DIV' || el.onclick));
     const combat=content.querySelector('.combat-panel');
     const combatInfo=!combat||(['.beast-portrait img','.beast-hp-bar','.combat-modifiers'].every(selector=>{const el=combat.querySelector(selector);return el&&el.getBoundingClientRect().height>0&&!el.closest('details:not([open])');})&&combat.querySelector('.beast-portrait img').getBoundingClientRect().height>=130);
     return {combatInfo,scroll:content.scrollHeight > content.clientHeight + 2, clipped: controls.filter(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return r.top<cr.top-1||r.bottom>cr.bottom+1||r.left<cr.left||r.right>cr.right||!hit||!el.contains(hit);}).map(el=>({text:el.innerText,action:el.getAttribute('onclick'),rect:el.getBoundingClientRect().toJSON()})), controls:controls.length};
    });
    const screenshot = `${viewport.width}-${viewport.height}-${label}${language==='en'?'-en':''}.png`;
    await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});
    results.push({viewport,language,label,screenshot,...metrics});
   }
   await setup('search');
   await page.locator('#search-dice button').click(); await page.locator('#search-placement button:not(:disabled)').first().waitFor();
   await visible('search-roll');
   await page.locator('button[onclick="SearchUI.modifyPendingDie(0, -1)"]').click(); await visible('search-modified');
   await page.locator('button[onclick="SearchUI.rerollPendingWithLuckCharm()"]').click(); await visible('search-rerolled');
   await page.locator('#search-placement button:not(:disabled)').first().click(); await visible('search-second');
   await page.locator('#search-placement button:not(:disabled)').last().click();
   await visible('search-next');
   for (const tower of ['south','west','east']) {
    await setup('build', tower); await page.locator('#build-dice button').click(); await page.locator('#build-dice .mod-btn').first().waitFor();
    await visible(`build-${tower}-roll`);
    await page.locator('#build-dice .die').first().click(); await visible(`build-${tower}-selected`);
    await page.locator('.tower-grid .tower-cell[role="button"]').first().click(); await visible(`build-${tower}-second`);
   }
   await setup('forge'); await page.locator('#forge-dice button').click(); await page.locator('#forge-dice .mod-btn').first().waitFor(); await visible('forge-roll');
   await page.locator('#forge-dice .die').first().click(); await visible('forge-selected');
   assert.equal(await page.locator('.forge-refining-field').count(), 1, 'Use a single refining field.');
   assert.equal(await page.locator('#forge-placement .forge-cell, #forge-placement button[onclick^="ForgeUI.placeDie"]').count(), 0, 'No duplicate placement grid.');
   assert.equal(await page.locator('.forge-refining-field button:not(:disabled)').count(), 6);
   await page.locator('.forge-refining-field button[data-row="top"][data-col="2"]').click(); await visible('forge-second');
   assert.equal(await page.evaluate(()=>GameState.forge.box.top[2]), 4, 'Place directly in any column.');
   assert.equal(await page.locator('.forge-refining-field button[data-row="top"][data-col="2"]').isDisabled(), true);
   await page.locator('#forge-dice .die').first().click();
   const bottom = page.locator('.forge-refining-field button[data-row="bottom"][data-col="2"]');
   await bottom.focus(); await page.keyboard.press('Enter');
   assert.equal(await page.evaluate(()=>GameState.forge.box.results[2]), 0, 'Keyboard placement resolves the original column.');
   assert.equal(await page.locator('.forge-refining-field button[data-col="2"]:disabled').count(), 2);
   await setup('stores');
   await page.locator('#atlas-stores-page').screenshot({path:path.join(out,`${viewport.width}-${viewport.height}-stores${language==='en'?'-en':''}.png`),animations:'disabled'});
   await setup('combat'); await page.locator('button[onclick="CombatUI.rollCombatDice()"]').click(); await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]').waitFor(); await visible('combat-roll');
   await page.locator('button[onclick="CombatUI.modifyPendingDie(0, 1)"]').click(); await visible('combat-modified');
   await page.evaluate(()=>{GameState.equipment.silver_plate='mastercraft';GameState.equipment.disintegrator_lance='mastercraft';GameState.craftedItems.crab_plate=2;GameState.activeEvents.halebeard=['Sudden Clarity'];GameState.combat.ambushBonus=true;GameState.combat.pendingRoll=null;CombatUI.renderCombat();CombatUI.rollCombatDice();});
   await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]').waitFor(); await visible('combat-equipped');
   await page.evaluate(()=>{GameState.combat.pendingRoll=null;CombatUI.renderCombat();CombatUI.flee();}); await page.locator('button[onclick="CombatUI.resolveFleeRoll()"]').waitFor(); await visible('flee-roll');
   await setup('help');
   const help = await page.evaluate(() => {
    const content=document.getElementById('modal-content'),rules=content.querySelector('.help-rules'),guide=content.querySelector('.mentor-help');
    return {body:rules.clientHeight,sheet:content.clientHeight,guide:guide.getBoundingClientRect().height,collapsed:!guide.open,outerScroll:content.scrollHeight>content.clientHeight+2};
   });
   await page.screenshot({path:path.join(out,`${viewport.width}-${viewport.height}-help${language==='en'?'-en':''}.png`),animations:'disabled'});
   results.push({viewport,language,label:'help',...help,failed:!help.collapsed||help.guide>54||help.body/help.sheet<.5||help.outerScroll});
   await page.locator('.mentor-help > summary').click(); await page.locator('.mentor-help button[onclick="Tutorial.start()"]').waitFor({state:'visible'});
   await context.close();
  }
  const failures=results.filter(r=>r.scroll||r.clipped?.length||r.failed||r.combatInfo===false);
  fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,errors,failures},null,2));
  console.log(JSON.stringify({checks:results.length,errors,failures},null,2));
  assert.equal(errors.length,0); assert.equal(failures.length,0);
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
