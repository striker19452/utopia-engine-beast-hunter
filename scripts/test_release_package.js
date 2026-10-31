// Verify the actual offline ZIP through file://, including regional artwork.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const version=fs.readFileSync(path.join(root,'js/version.js'),'utf8').match(/number:\s*'([\d.]+)'/)[1];
const name=`UEBH-v${version}`,archive=path.resolve(process.argv[2]||path.join(root,`${name}.zip`));
const extracted=fs.mkdtempSync(path.join(os.tmpdir(),'uebh-release-'));
const out=path.join(root,`outputs/release-v${version}`);fs.mkdirSync(out,{recursive:true});
execFileSync('python3',['-c',`import zipfile,sys
from pathlib import PurePosixPath
with zipfile.ZipFile(sys.argv[1]) as z:
 assert not z.testzip()
 assert {PurePosixPath(n).parts[0] for n in z.namelist()}=={sys.argv[3]}
 assert all('..' not in PurePosixPath(n).parts and not PurePosixPath(n).is_absolute() for n in z.namelist())
 z.extractall(sys.argv[2])`,archive,extracted,name]);
(async()=>{
  const browser=await chromium.launch({headless:true,executablePath:process.env.UEBH_BROWSER_EXECUTABLE||undefined});
  const errors=[],results=[];
  try{
    for(const [width,height,language]of[[1280,900,'zh'],[390,844,'en']]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      await page.goto(pathToFileURL(path.join(extracted,name,'index.html')).href);
      assert.deepEqual(await page.locator('[data-game-version]').allTextContents(),[`v${version}`,`v${version}`]);
      await page.evaluate(language=>{Tutorial.preferences.hints=false;Tutorial.dismissInvitation();document.getElementById('btn-start-game').click();I18n.setLanguage(language);Dice.roll=n=>Array(n).fill(6);},language);
      assert.equal(await page.locator('.loadout-slot').count(),13);
      await page.screenshot({path:path.join(out,`${width}-${language}-offline.png`),animations:'disabled'});
      for(const region of['halebeard','coastal','scar']){
        await page.evaluate(region=>{Game.newGame();Game.startSearch(region);},region);
        await page.locator('.search-terrain-art img').evaluate(img=>img.decode());
        assert.equal(await page.locator('.search-terrain').getAttribute('data-search-region'),region);
        await page.locator('#search-dice button').click();await page.locator('#search-placement button:not(:disabled)').first().waitFor();
        await page.locator("button[onclick=\"SearchUI.placeDie('top', 0, 0)\"]").click();
        await page.locator("button[onclick=\"SearchUI.placeDie('bottom', 0, 1)\"]").click();
        assert.deepEqual(await page.evaluate(region=>[GameState.regions[region].searchBoxes[0].top[0],GameState.regions[region].searchBoxes[0].bottom[0]],region),[6,6]);
      }
      await page.evaluate(()=>{Game.newGame();GameState.materials.silver=4;Game.showForgeDialog();});
      await page.locator('.forge-workbench-art img').evaluate(img=>img.decode());
      await page.locator("button[onclick=\"UI.closeModal(); ForgeUI.start('silver_plate');\"]").click();
      await page.locator('#forge-dice button').click();await page.locator('#forge-dice .mod-btn').first().waitFor();
      await page.evaluate(()=>{Game.newGame();Object.keys(GameState.materials).forEach(key=>GameState.materials[key]=4);Game.showCraftDialog();});
      await page.locator('.craft-workbench-art img').evaluate(img=>img.decode());
      await page.locator('.craft-stamp').click();assert.equal(await page.evaluate(()=>GameState.craftedItems.blood_lure),1);
      await page.evaluate(()=>{Game.newGame();CombatUI.startCombat('coastal','common',GAME_DATA.regions.coastal.commonBeasts[3]);});
      await page.locator('.combat-loot img').evaluate(img=>img.decode());
      await page.locator('button[onclick="CombatUI.rollCombatDice()"]').click();await page.locator('#combat-dice .mod-btn').first().waitFor();
      await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]').click();assert.equal(await page.evaluate(()=>GameState.materials.nightmare_chitin),1);
      const metadata=await page.evaluate(()=>{GameState.hp.current=7;GameState.save();const saved=JSON.parse(localStorage.getItem('uebh_save_0'));return saved.meta;});
      assert.equal(metadata.appVersion,version);assert.equal(metadata.saveSchema,1);
      await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('uebh_save_0'));saved.meta.appVersion='2.0.0';localStorage.setItem('uebh_save_0',JSON.stringify(saved));GameState.hp.current=2;GameState.load();});
      assert.equal(await page.evaluate(()=>GameState.hp.current),7,'Previous-version schema-1 saves still load.');
      assert.equal(await page.evaluate(()=>[...document.images].filter(img=>img.getClientRects().length&&(!img.complete||!img.naturalWidth)).length),0);
      results.push({width,height,language,offline:true,version,searchRegions:3,forge:true,craft:true,combatLoot:true,saveCompatibility:true});await context.close();
    }
    assert.deepEqual(errors,[]);console.log(JSON.stringify({version,offlineRuns:results.length,errors},null,2));
  }finally{fs.writeFileSync(path.join(out,'offline-checks.json'),JSON.stringify({version,archive,sha256:createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),results,errors},null,2));await browser.close();fs.rmSync(extracted,{recursive:true,force:true});}
})().catch(error=>{console.error(error);process.exitCode=1;});
