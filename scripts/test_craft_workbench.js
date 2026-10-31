// Real crafting controls: recipes, inventory, rule boundaries, and art fallback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'outputs/craft-workbench');
fs.mkdirSync(out, {recursive:true});
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.UEBH_BROWSER_EXECUTABLE || undefined});
  const results = [], errors = [], violations = [];
  const cases = [[1440,900,'zh'],[1280,720,'en'],[901,740,'en'],[768,900,'zh'],[662,706,'en'],[561,740,'en'],[560,740,'en'],[390,844,'zh'],[320,740,'zh'],[320,740,'en']];
  try {
    for (const [width, height, language] of cases) {
      const context = await browser.newContext({viewport:{width,height}, reducedMotion:'reduce'});
      const page = await context.newPage(); page.setDefaultTimeout(7000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.evaluate(language => {
        Tutorial.preferences.hints=false; Tutorial.dismissInvitation(); document.getElementById('btn-start-game').click(); I18n.setLanguage(language);
        Object.keys(GameState.materials).forEach(key => GameState.materials[key]=4); UI.render();
        AtlasUI.setPage('village'); VillageUI.select('smithy');
      }, language);
      await page.locator('[data-village-action="craft"]').click();
      await page.locator('.craft-workbench-art img').evaluate(img => img.decode());
      assert.equal(await page.locator('.craft-recipe').count(), 7);
      const keys = await page.locator('.craft-recipe').evaluateAll(buttons => buttons.map(button => button.dataset.craftRecipe));
      const initial = await page.evaluate(() => JSON.stringify({materials:GameState.materials, items:GameState.craftedItems, day:GameState.currentDay}));
      async function geometry(stage) {
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const metrics = await page.evaluate(() => {
          const panel=document.getElementById('modal-content'), workspace=panel.querySelector('.craft-workspace'), art=panel.querySelector('.craft-workbench-art img');
          const rect=workspace.getBoundingClientRect();
          const clipped=[...workspace.querySelectorAll('.craft-ingredient, .craft-product, .craft-stamp, p')].filter(element => {
            const r=element.getBoundingClientRect(); return r.left<rect.left-2 || r.right>rect.right+2 || r.top<rect.top-2 || r.bottom>rect.bottom+2 || element.scrollWidth>element.clientWidth+2;
          }).map(element => {const r=element.getBoundingClientRect();return {element:element.className,width:r.width,height:r.height,scroll:element.scrollWidth,client:element.clientWidth,top:r.top-rect.top,bottom:r.bottom-rect.bottom};});
          return {overflow:document.documentElement.scrollWidth>innerWidth+1 || panel.scrollWidth>panel.clientWidth+1,
            clipped, han:document.documentElement.lang==='en' && /[\u3400-\u9fff]/.test(panel.innerText),
            art:art.naturalWidth, source:art.currentSrc.split('/').pop(),
            smallTargets:[...panel.querySelectorAll('button')].filter(button => {const r=button.getBoundingClientRect();return r.width<44 || r.height<44;}).map(button => button.className),
            fits:panel.scrollHeight<=panel.clientHeight+1};
        });
        results.push({width,height,language,stage,...metrics});
        if(metrics.overflow || metrics.clipped.length || metrics.han) violations.push(results.at(-1));
        assert.deepEqual(metrics.smallTargets,[]);
        assert.ok(metrics.art>0);assert.equal(metrics.source,width<=560?'craft-workbench-mobile.webp':'craft-workbench.webp');
      }
      for (const key of keys) {
        await page.locator(`[data-craft-recipe="${key}"]`).click();
        assert.equal(await page.locator(`[data-craft-recipe="${key}"]`).getAttribute('aria-pressed'),'true');
        await geometry(key);
      }
      assert.equal(await page.evaluate(() => JSON.stringify({materials:GameState.materials, items:GameState.craftedItems, day:GameState.currentDay})),initial,'Selecting a recipe is read-only.');
      await page.locator('[data-craft-recipe="crab_plate"]').click();
      await page.screenshot({path:path.join(out,`${width}-${language}-recipe.png`),animations:'disabled'});
      await page.locator('[data-craft-action="crab_plate"]').click();
      assert.equal(await page.evaluate(() => GameState.craftedItems.crab_plate),2);
      assert.deepEqual(await page.evaluate(() => [GameState.materials.stone,GameState.materials.nightmare_chitin,GameState.currentDay]),[3,3,1]);
      assert.equal(await page.locator('.craft-workbench').getAttribute('data-craft-stage'),'complete');
      assert.equal(await page.locator('.craft-stamp').isDisabled(),true);
      assert.equal(await page.locator('[data-loadout-item="crab_plate"] .loadout-charge .full').count(),2);
      await geometry('complete');
      await page.screenshot({path:path.join(out,`${width}-${language}-complete.png`),animations:'disabled'});
      const after = await page.evaluate(() => JSON.stringify(GameState.materials));
      await page.evaluate(() => CraftUI.craft('crab_plate'));
      assert.equal(await page.evaluate(() => JSON.stringify(GameState.materials)),after,'No duplicate copies.');
      await page.evaluate(() => {GameState.craftedItems.crab_plate=null; CraftUI.selectRecipe('crab_plate');});
      await page.locator('[data-craft-action="crab_plate"]').click();
      assert.equal(await page.evaluate(() => GameState.craftedItems.crab_plate),2,'Spent items can be remade.');
      await page.locator('[data-craft-recipe="heavy_coat"]').click();
      await page.locator('[data-craft-action="heavy_coat"]').click();
      assert.equal(await page.evaluate(() => GameState.craftedItems.heavy_coat),true);
      // Missing second ingredient used to consume the first one before failing.
      await page.evaluate(() => {GameState.materials.foul_blood=2;GameState.materials.stone=0;CraftUI.selectRecipe('blood_lure');});
      assert.equal(await page.locator('.craft-stamp').isDisabled(),true);
      assert.equal(await page.locator('[data-craft-material="stone"].is-missing').count(),1);
      await page.evaluate(() => CraftUI.craft('blood_lure'));
      assert.equal(await page.evaluate(() => GameState.materials.foul_blood),2);
      assert.equal(await page.evaluate(() => GameState.craftedItems.blood_lure),null);
      await geometry('missing');
      await page.evaluate(() => {GameState.materials.stone=4;GameState.materials.foul_blood=4;});
      for (const boundary of ['combat','game_over','settlement']) {
        const before=await page.evaluate(() => JSON.stringify(GameState.materials));
        await page.evaluate(boundary => {
          GameState.phase=boundary==='settlement'?'idle':boundary;
          GameState.pendingDayAction=boundary==='settlement'?'rest':null;
          CraftUI.craft('blood_lure');
        }, boundary);
        assert.equal(await page.evaluate(() => JSON.stringify(GameState.materials)),before,`${boundary} cannot craft.`);
      }
      await page.evaluate(() => {GameState.phase='idle';GameState.pendingDayAction=null;CraftUI.selectRecipe('blood_lure');});
      await page.locator('[data-craft-recipe="blood_lure"]').focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => document.activeElement.dataset.craftRecipe),'blood_lure');
      await page.locator('.craft-stamp').focus();await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => GameState.craftedItems.blood_lure),1);
      for(const key of ['potent_bait','firebox','reviving_dose','hawk_totem']) {
        await page.evaluate(() => Object.keys(GameState.materials).forEach(key=>GameState.materials[key]=4));
        await page.locator(`[data-craft-recipe="${key}"]`).click();
        await page.locator('.craft-stamp').click();
        assert.equal(await page.evaluate(key=>GameState.craftedItems[key],key),1);
        assert.equal(await page.evaluate(key=>Object.keys(CraftUI.recipe(key).requires).every(mat=>GameState.materials[mat]===3),key),true);
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#modal-overlay').evaluate(el=>el.classList.contains('active')),false);
      results.push({width,language,workflow:'all seven items crafted; read-only selection; exact consumption; no day cost; owned guard; recraft; unlimited coat; missing-second-ingredient atomicity; combat, game-over and settlement guards; keyboard',status:'passed'});
      await context.close();console.log(`${width} ${language}: craft passed`);
    }
    const context=await browser.newContext({viewport:{width:320,height:740},reducedMotion:'reduce'}), page=await context.newPage();
    await page.route('**/assets/atlas/craft-workbench*.webp',route=>route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.evaluate(() => {Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();Object.keys(GameState.materials).forEach(key=>GameState.materials[key]=4);Game.showCraftDialog();});
    await page.waitForSelector('.craft-workbench .atlas-art-missing');
    await page.locator('.craft-stamp').click();assert.equal(await page.evaluate(()=>GameState.craftedItems.blood_lure),1);
    await page.screenshot({path:path.join(out,'320-fallback.png'),animations:'disabled'});await context.close();
    assert.deepEqual(errors,[]);assert.deepEqual(violations,[]);console.log(JSON.stringify({layouts:results.filter(r=>r.stage).length,workflows:cases.length,errors},null,2));
  } finally {fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,errors,violations},null,2));await browser.close();server.close();}
})().catch(error => {console.error(error);server.close();process.exitCode=1;});
