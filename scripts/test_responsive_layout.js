// Check the three layout classes and the component breakpoints between them.
// Scene fixtures use the real renderers; the report keeps geometry and screenshots.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const pass = process.argv.includes('--baseline') ? 'before' : 'after';
const storesOnly = process.argv.includes('--stores-only');
const mapOnly = process.argv.includes('--map-only');
const out = path.join(root, 'outputs/responsive-layout', storesOnly ? 'touch' : mapOnly ? 'map' : pass);
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  fs.readFile(file, (error, data) => {
    if (error) return res.writeHead(404).end();
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});
const sizes = [[320,740],[390,844],[560,800],[561,800],[662,706],[760,900],[761,900],[768,1024],[900,900],[901,900],[1000,900],[1001,900],[1024,768],[1280,720],[1440,900],[1920,1080],[844,390],[932,430]];
const scenes = ['cover','map','region','village','stores','ledger','journal','search','build-west','build-south','build-east','forge-selection','forge','combat','events','help','debug'];
const englishSizes = [320,390,561,662,768,1024,1440,844];
async function fixture(page, scene, language) {
  await page.evaluate(({ scene, language }) => {
    Tutorial.preferences.hints = false; Tutorial.dismissInvitation();
    if (scene === 'cover') { I18n.setLanguage(language); return; }
    const nativeTimeout = window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => ms >= 200 && ms <= 700 ? 0 : nativeTimeout(fn, ms, ...args);
    document.getElementById('btn-start-game').click(); I18n.setLanguage(language);
    GameState.currentDay = 6; GameState.determination = 5;
    Object.keys(GameState.materials).forEach(k => GameState.materials[k] = 4);
    GameState.activeEvents.halebeard = ['Abundance','Sudden Clarity','Foul Weather','Madness'];
    Dice.roll = n => Array(n).fill(4);
    UI.render();
    if (scene === 'region') AtlasUI.selectRegion('halebeard', true);
    if (scene === 'village') { AtlasUI.setPage('village'); VillageUI.select('tower:west'); }
    if (scene === 'stores' || scene === 'ledger') {
      for (const recipe of GAME_DATA.craftingRecipes) {
        const key = recipe.name.toLowerCase().replace(/ /g, '_');
        GameState.craftedItems[key] = key === 'heavy_coat' ? true : 2;
        GameState.craftedItemHistory[key] = true;
      }
      UI.render(); AtlasUI.setPage('stores');
      if (scene === 'ledger') { AtlasUI.storesView = 'ledger'; AtlasUI.renderSupply(); }
    }
    if (scene === 'journal') { for (let i = 0; i < 12; i++) GameLog.add('新游戏开始！'); AtlasUI.setPage('journal'); }
    if (scene === 'search') { Game.startSearch('halebeard'); SearchUI.rollDice(); SearchUI.renderPendingRollPlacement(); }
    if (scene.startsWith('build-')) { BuildUI.startBuild(scene.slice(6), 'stone'); BuildUI.rollDice(); BuildUI.renderPendingRollOptions(); }
    if (scene === 'forge-selection') Game.showForgeDialog();
    if (scene === 'forge') { ForgeUI.start('silver_plate'); ForgeUI.rollDice(); ForgeUI.renderForge(); }
    if (scene === 'combat') {
      GameState.equipment.silver_plate = 'mastercraft'; GameState.equipment.disintegrator_lance = 'mastercraft'; GameState.craftedItems.crab_plate = 2;
      Game.startSearch('halebeard'); CombatUI.startCombat('halebeard', 'terrible');
      GameState.combat.ambushBonus = true; CombatUI.renderCombat(); CombatUI.rollCombatDice(); CombatUI.renderPendingCombatRoll();
    }
    if (scene === 'events') Events.showEventResults(['Abundance','Sudden Clarity','Foul Weather','Madness'].map((event,i) => ({ event, eventZh:['丰饶','突然清醒','恶劣天气','疯狂'][i], regionZh:'海尔比尔德峰' })));
    if (scene === 'help') Game.showHelp();
    if (scene === 'debug') Game.showDebug();
    I18n.apply();
  }, { scene, language });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].filter(img => img.getClientRects().length).map(img => img.decode().catch(() => {}))));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function measure(page) {
  return page.evaluate(() => {
    const modal = document.getElementById('modal-content'), isModal = document.getElementById('modal-overlay').classList.contains('active');
    const area = isModal ? modal : document.getElementById('cover-screen') || document.getElementById('game-interface');
    const visible = el => !!el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && !el.closest('details:not([open]) > :not(summary)');
    const buttons = [...area.querySelectorAll('button,[role="button"]')].filter(visible);
    const working = [...modal.querySelectorAll('.atlas-roll-main button:not(:disabled),.atlas-roll-main .tower-cell[role="button"],.atlas-roll-sheet > .confirm-actions button')].filter(visible);
    const describe = el => ({ text:el.innerText.trim().slice(0,70), action:el.getAttribute('onclick') || el.dataset.atlasPage || el.className, w:Math.round(el.getBoundingClientRect().width), h:Math.round(el.getBoundingClientRect().height) });
    const cr = modal.getBoundingClientRect();
    const clipped = working.filter(el => { const r=el.getBoundingClientRect(); return r.left < cr.left-1 || r.right > cr.right+1 || (innerHeight >= 620 && (r.top < cr.top-1 || r.bottom > cr.bottom+1)); }).map(describe);
    // Recipe connector ports and village labels intentionally extend outside
    // their hit areas. Measure their text instead of treating decoration as clipping.
    const textOverflow = buttons.filter(el => !el.matches('.supply-ingredient,.village-building') && el.scrollWidth > el.clientWidth + 2).map(describe);
    const shortTargets = buttons.filter(el => {const r=el.getBoundingClientRect(); return r.width<43 || r.height<43;}).map(describe);
    const fieldSelectors = '.crafted-item-name,.crafted-item-effect,.crafted-item-req,.item-status,.supply-ingredient > span:first-child,.supply-ingredient > small,.region-event-tag,.forge-turn-instruction,.forge-quality-guide';
    const textClipped = [...area.querySelectorAll(fieldSelectors)].filter(visible).filter(el => el.scrollWidth > el.clientWidth+2).map(describe);
    const pins = [...area.querySelectorAll('.atlas-pin,.atlas-village-pin')].filter(visible), map = document.getElementById('atlas-map-panel').getBoundingClientRect();
    const mapClipped = pins.filter(el => {const r=el.getBoundingClientRect(); return r.left<map.left || r.right>map.right || r.top<map.top || r.bottom>map.bottom;}).map(describe);
    const legend = document.querySelector('.atlas-map-legend').getBoundingClientRect();
    const mapObscured = pins.filter(el => { const r=el.getBoundingClientRect(); return Math.min(r.right,legend.right)-Math.max(r.left,legend.left)>1 && Math.min(r.bottom,legend.bottom)-Math.max(r.top,legend.top)>1; }).map(describe);
    const phone = innerWidth <= 760, tablet = innerWidth > 760 && innerWidth <= 1000;
    const region = document.querySelector('.region-panel:not([hidden])');
    const dossier = document.getElementById('atlas-dossier').getBoundingClientRect();
    const worldMap = !isModal && visible(document.getElementById('atlas-map-panel'));
    const layout = !worldMap || ((!tablet || map.width > document.querySelector('.atlas-workspace').clientWidth * .9) && (!phone || region.getBoundingClientRect().width > dossier.width * .8) && (!phone || visible(region.querySelector('.region-approach'))));
    const brokenImages = [...area.querySelectorAll('img')].filter(visible).filter(img => !img.complete || !img.naturalWidth).map(img => img.getAttribute('src'));
    return { overflow: document.documentElement.scrollWidth>innerWidth+1, modalOverflow:isModal&&modal.scrollWidth>modal.clientWidth+1, clipped, textOverflow, textClipped, mapClipped, mapObscured, shortTargets, layout, brokenImages, touch:matchMedia('(pointer: coarse)').matches, modalScroll:isModal&&modal.scrollHeight>modal.clientHeight+2, untranslated:document.documentElement.lang==='en'&&/[\u3400-\u9fff]/.test(area.innerText) };
  });
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const browser = await chromium.launch({headless:true, executablePath:process.env.UEBH_BROWSER_EXECUTABLE||undefined});
  const results=[],errors=[];
  try {
    for (const [width,height] of sizes) {
      if (storesOnly && width > 1024) continue;
      for (const language of englishSizes.includes(width) ? ['zh','en'] : ['zh']) {
        const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<=1024}),page=await context.newPage();
        page.on('pageerror',error=>errors.push(error.message));
        try {
          for (const scene of storesOnly ? ['stores','ledger'] : mapOnly ? ['map','region'] : scenes) {
            const label=`${width}-${height}-${language}-${scene}`;
            try {
              await page.goto(`http://127.0.0.1:${server.address().port}`);await fixture(page,scene,language);
              const metrics=await measure(page);
              const failed=metrics.overflow||metrics.modalOverflow||metrics.clipped.length||metrics.textOverflow.length||metrics.textClipped.length||metrics.mapClipped.length||metrics.mapObscured.length||metrics.untranslated||!metrics.layout||metrics.brokenImages.length||(metrics.touch&&metrics.shortTargets.length);
              const screenshot=(failed || ([390,768,1440].includes(width)&&language==='zh'))?`${label}.png`:null;
              if(screenshot)await page.screenshot({path:path.join(out,screenshot),animations:'disabled'});
              results.push({width,height,language,scene,failed:!!failed,screenshot,...metrics});
            } catch(error) {results.push({width,height,language,scene,failed:true,error:error.message});}
          }
          console.log(`${width}x${height} ${language}: ${results.filter(r=>r.width===width&&r.height===height&&r.language===language&&r.failed).length} findings`);
        } finally {await context.close();}
      }
    }
    const failures=results.filter(r=>r.failed);
    fs.writeFileSync(path.join(out,'checks.json'),JSON.stringify({results,failures,errors},null,2));
    fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><meta charset="utf-8"><title>响应式布局检查</title><style>body{background:#e4ddc7;color:#383e33;font:14px system-ui;margin:24px}main{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}img{width:100%}a{color:inherit}p{line-height:1.6}</style><h1>三类布局与断点检查</h1><p>${results.length} 组状态 / ${failures.length} 项发现</p><main>${results.filter(r=>r.screenshot).map(r=>`<a href="${r.screenshot}"><img loading="lazy" src="${r.screenshot}"><p>${r.width}×${r.height} ${r.language} ${r.scene}${r.failed?' · 待处理':''}</p></a>`).join('')}</main>`);
    console.log(JSON.stringify({cases:results.length,failures:failures.length,errors}));
    if(pass==='after'){assert.deepEqual(errors,[]);assert.equal(failures.length,0,'See outputs/responsive-layout/after/checks.json');}
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
