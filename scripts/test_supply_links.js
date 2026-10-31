// Live recipe links must follow the real inventory, remain attached on resize,
// and leave the existing crafting/forging handlers in charge of state changes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs/supply-links');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream');
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.UEBH_BROWSER_EXECUTABLE || undefined });
  const errors = [], results = [];
  try {
    for (const [width, height, language] of [[1440, 1000, 'zh'], [1024, 900, 'zh'], [662, 706, 'zh'], [390, 844, 'zh'], [320, 740, 'en']]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width <= 1024 });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const label = `${width}-${language}`;
      try {
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        await page.evaluate(language => {
          Tutorial.preferences.hints = false; Tutorial.dismissInvitation();
          document.getElementById('btn-start-game').click(); I18n.setLanguage(language);
          Object.assign(GameState.materials, { stone: 2, cord: 1, tar: 2, foul_blood: 0, beast_pelt: 1, oily_meat: 0, dragon_smoke: 1, sacred_feathers: 0, nightmare_chitin: 1, troll_ash: 1, silver: 1, lodestone: 0, pyrite: 1 });
          UI.render(); AtlasUI.setPage('stores');
        }, language);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => document.querySelectorAll('.supply-wire').length === 17);
        async function geometry() {
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          return page.evaluate(() => {
            const svg = document.querySelector('.atlas-supply-wires');
            const bounds = svg.getBoundingClientRect();
            const bad = [];
            for (const line of svg.querySelectorAll('path')) {
              const card = document.querySelector(`[data-supply-recipe="${line.dataset.recipe}"]`);
              const source = card.querySelector(`[data-supply-source="${line.dataset.material}"] .supply-port`);
              const target = card.querySelector('.supply-output > .supply-port');
              const a = source.getBoundingClientRect(), b = target.getBoundingClientRect();
              const start = line.getPointAtLength(0), end = line.getPointAtLength(line.getTotalLength());
              if (Math.abs(start.x + bounds.left - a.left - a.width / 2) > 2 || Math.abs(start.y + bounds.top - a.top - a.height / 2) > 2 || Math.abs(end.x + bounds.left - b.left - b.width / 2) > 2 || Math.abs(end.y + bounds.top - b.top - b.height / 2) > 2 || end.x <= start.x) bad.push({ material: line.dataset.material, recipe: line.dataset.recipe });
            }
            return { bad, overflow: document.documentElement.scrollWidth > innerWidth + 1, count: svg.querySelectorAll('path').length };
          });
        }
        assert.deepEqual((await geometry()).bad, []);
        assert.equal((await geometry()).overflow, false);
        async function readableContent() {
          return page.evaluate(() => {
            const cards = [...document.querySelectorAll('#atlas-stores-page [data-supply-recipe]')];
            const missing = [], clipped = [];
            for (const card of cards) {
              for (const selector of ['.supply-target-button', '.item-status', '.crafted-item-effect', '.crafted-item-req']) {
                const field = card.querySelector(selector);
                if (!field || !field.innerText.trim() || !field.getClientRects().length) missing.push({ key: card.dataset.supplyRecipe, selector });
                else if (field.scrollHeight > field.clientHeight + 1 || field.scrollWidth > field.clientWidth + 1) clipped.push({ key: card.dataset.supplyRecipe, selector });
              }
            }
            return { cards: cards.length, missing, clipped, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
          });
        }
        const content = await readableContent();
        assert.equal(content.cards, 10);
        assert.deepEqual(content.missing, []);
        assert.deepEqual(content.clipped, []);
        const density = await page.evaluate(() => {
          const section = document.getElementById('atlas-stores-page');
          const bottom = Math.min(innerHeight, document.querySelector('.action-bar').getBoundingClientRect().top);
          return { height: Math.round(section.getBoundingClientRect().height), completeProductsInFirstView: [...section.querySelectorAll('[data-supply-recipe]')].filter(card => { const r = card.getBoundingClientRect(); return r.top >= 0 && r.bottom <= bottom; }).length };
        });
        assert.ok(density.height < ({ 1440: 1000, 1024: 1300, 662: 1400, 390: 1900, 320: 2400 }[width]), 'Keep the full inventory and recipes compact.');
        if (width === 1440) assert.ok(density.completeProductsInFirstView >= 7);
        await page.locator('#atlas-stores-page').screenshot({ path: path.join(out, `${label}-all.png`), animations: 'disabled', style: '.action-bar{visibility:hidden!important}' });
        // Pin a product, then move the pointer away: the relation stays selected.
        await page.locator('[data-supply-target="crab_plate"]').click();
        await page.mouse.move(0, 0);
        assert.equal(await page.locator('.supply-wire.is-related').count(), 2);
        assert.equal(await page.locator('[data-supply-target="crab_plate"]').getAttribute('aria-pressed'), 'true');
        await page.locator('#atlas-stores-page').screenshot({ path: path.join(out, `${label}-selected.png`), animations: 'disabled', style: '.action-bar{visibility:hidden!important}' });
        await page.locator('[data-supply-reset]').click();
        const stone = width > 760 ? page.locator('.materials-panel [data-supply-source="stone"]') : page.locator('[data-supply-recipe="blood_lure"] [data-supply-source="stone"]');
        await stone.focus(); await page.keyboard.press('Enter'); await page.mouse.move(0, 0);
        assert.equal(await page.locator('.supply-wire.is-related').count(), 4, 'Stone is part of the two complete recipes for Blood Lure and Crab Plate.');
        const stockBefore = await page.evaluate(() => JSON.stringify(GameState.materials));
        await page.locator('button[data-stores-view="ledger"]').click();
        assert.equal(await page.locator('.materials-panel').isVisible(), true);
        assert.equal(await page.locator('.material-dot').count(), 52);
        await page.locator('button[data-stores-view="relations"]').click();
        await page.mouse.move(0, 0);
        assert.equal(await page.evaluate(() => JSON.stringify(GameState.materials)), stockBefore);
        assert.deepEqual((await geometry()).bad, []);
        await page.locator('[data-supply-reset]').click();
        // Craft through the existing control and check actual consumption and
        // the line's availability after the inventory changes.
        await page.locator('[data-supply-recipe="crab_plate"] button[onclick="CraftUI.craft(\'crab_plate\')"]').click();
        assert.deepEqual(await page.evaluate(() => [GameState.materials.stone, GameState.materials.nightmare_chitin, GameState.craftedItems.crab_plate]), [1, 0, 2]);
        await page.locator('#modal-content button[onclick="UI.closeModal()"]:visible').click();
        await page.waitForFunction(() => !document.querySelector('.supply-wire[data-material="nightmare_chitin"]').classList.contains('has-stock'));
        assert.deepEqual((await geometry()).bad, []);
        assert.equal(await page.locator('[data-supply-recipe="crab_plate"] button[onclick="CraftUI.craft(\'crab_plate\')"]').isDisabled(), true);
        // Reflow across the desktop/mobile threshold without stale anchors.
        await page.setViewportSize({ width: width > 760 ? 390 : 1024, height });
        await page.waitForFunction(() => document.querySelector('.atlas-supply-wires').getAttribute('width') == document.querySelector('.atlas-supply-workspace').getBoundingClientRect().width);
        assert.deepEqual((await geometry()).bad, []);
        await page.setViewportSize({ width, height });
        await page.waitForFunction(() => document.querySelector('.atlas-supply-wires').getAttribute('width') == document.querySelector('.atlas-supply-workspace').getBoundingClientRect().width);
        // Owned items add use buttons. They must wrap without hiding any effect,
        // recipe, status or action in the narrower product columns.
        await page.evaluate(() => {
          for (const recipe of GAME_DATA.craftingRecipes) {
            const key = recipe.name.toLowerCase().replace(/ /g, '_');
            GameState.craftedItems[key] = key === 'heavy_coat' ? true : key === 'crab_plate' ? 2 : 1;
            GameState.craftedItemHistory[key] = true;
          }
          UI.render();
        });
        const ownedContent = await readableContent();
        assert.deepEqual(ownedContent.missing, []);
        assert.deepEqual(ownedContent.clipped, []);
        assert.equal(ownedContent.overflow, false);
        if (language === 'en') assert.doesNotMatch(await page.locator('#atlas-stores-page').innerText(), /[\u4e00-\u9fff]/);
        // The rare-material edge also leads to the original forging flow.
        await page.locator('[data-supply-recipe="disintegrator_lance"] button[onclick="ForgeUI.start(\'disintegrator_lance\')"]').click();
        assert.deepEqual(await page.evaluate(() => [GameState.phase, GameState.forge.equipment, GameState.materials.pyrite]), ['forging', 'disintegrator_lance', 0]);
        results.push({ width, height, language, edges: 17, density, informationRetained: 'passed', ownedInformation: 'passed', geometry: 'passed', selection: 'passed', consumption: 'passed', resizing: 'passed', forge: 'passed' });
        console.log(`Supply links passed: ${label}`);
      } catch (error) {
        await page.screenshot({ path: path.join(out, `${label}-failure.png`), fullPage: true });
        throw error;
      } finally { await context.close(); }
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify({ results, errors }, null, 2));
    console.log(`Supply links: ${results.length} viewports passed; output ${out}`);
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
