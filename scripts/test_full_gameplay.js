// Real browser runs: only dice are scripted; resources, days, wounds and wins
// must be earned through the same controls a player uses.
// NODE_PATH must provide Playwright. UEBH_BROWSER_EXECUTABLE can select Chrome.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'outputs', 'full-gameplay');
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' }[path.extname(file)] || 'application/octet-stream'));
    res.end(data);
  });
});

const runs = [];
const boundaries = [];
const errors = [];
async function click(page, action) {
  await page.locator(`#modal-content [onclick=${JSON.stringify(action)}]:visible`).first().click();
}
async function confirm(page) { await page.locator('#modal-content .confirm-actions button:enabled:visible').last().click(); }

async function setup(browser, url, language, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(7000);
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  await page.evaluate(() => { Tutorial.preferences.hints = false; Tutorial.dismissInvitation(); });
  await page.click('#btn-start-game');
  await page.evaluate(language => {
    I18n.setLanguage(language);
    window.__pairs = [];
    window.__singles = { 3: [1, 1, 3], 4: [1, 3, 5], 6: [3, 5, 2], 7: [2], 9: [5, 4, 2], 10: [5, 4, 6], 12: [5, 2, 3], 14: [5] };
    window.__events = { 1: [1, 3, 5, 1], 4: [3, 1, 5, 5], 7: [1, 3, 5, 3], 10: [1, 3, 5, 5], 13: [1, 3, 5, 3] };
    window.__rollAudit = [];
    Dice.roll = (n = 1) => {
      const day = GameState.pendingDayAction ? GameState.daysCrossed.at(-1) : GameState.currentDay;
      let dice;
      if (n === 2) dice = window.__pairs.shift() || [6, 6];
      else if (n === 4) dice = window.__events[day];
      else if (n === 1) dice = [window.__singles[day]?.shift()];
      if (!dice || dice.length !== n || dice.some(value => !Number.isInteger(value) || value < 1 || value > 6)) throw new Error(`Unexpected dice request: day ${day}, ${n} dice`);
      window.__rollAudit.push({ day, dice: [...dice] });
      return [...dice];
    };
  }, language);
  return { context, page };
}

async function searchBox(page, top, bottom) {
  await page.evaluate(({ top, bottom }) => { window.__pairs = top.map((value, col) => [value, bottom[col]]); }, { top, bottom });
  for (let col = 0; col < 3; col++) {
    await click(page, 'SearchUI.rollDice()');
    await click(page, `SearchUI.placeDie('top', ${col}, 0)`);
    await click(page, `SearchUI.placeDie('bottom', ${col}, 1)`);
  }
  assert.equal(await page.evaluate(() => window.__pairs.length), 0);
}

async function startSearch(page, region) {
  await page.click('#btn-search');
  await click(page, `UI.closeModal(); Game.startSearch('${region}');`);
}

async function fight(page) {
  await page.waitForFunction(() => !!GameState.combat);
  for (let round = 0; round < 12 && await page.evaluate(() => !!GameState.combat); round++) {
    await click(page, 'CombatUI.rollCombatDice()');
    await click(page, 'CombatUI.resolveCombatRoll()');
  }
  assert.equal(await page.evaluate(() => GameState.combat), null, 'Combat must reach a result.');
  await confirm(page);
}

async function hunt(page, region) {
  // Use the map's actual region card and hunt confirmation.
  await page.locator(`[data-atlas-page="map"]`).click();
  await page.locator(`[data-atlas-region="${region}"]`).click();
  await page.locator(`.region-panel.${region} button[onclick*="confirmTerribleBeastHunt"]`).click();
  await click(page, `UI.closeModal(); Game.startTerribleBeastHunt('${region}', false);`);
  await fight(page);
}

async function buildTower(page, tower, material) {
  await page.click('#btn-build');
  await click(page, `UI.closeModal(); BuildUI.selectMaterial('${tower}');`);
  await click(page, `UI.closeModal(); BuildUI.startBuild('${tower}', '${material}');`);
  for (let placements = 0; placements < 50 && await page.evaluate(() => !!GameState.build); placements++) {
    const pending = await page.evaluate(() => !!GameState.build.pendingRoll);
    if (!pending) await click(page, 'BuildUI.rollDice()');
    await click(page, 'BuildUI.selectDie(0)');
    const index = await page.evaluate(() => {
      const build = GameState.build;
      return BuildUI.getActiveIndices(build.tower).find(index => GameState.towers[build.tower].grid[index] === null && BuildUI.isValidPlacement(build.tower, index, build.pendingRoll[build.selectedDieIndex], GameState.towers[build.tower].grid));
    });
    assert.notEqual(index, undefined);
    await page.locator('#modal-content .tower-grid > .tower-cell').nth(index).click();
  }
  assert.equal(await page.evaluate(() => GameState.build), null);
}

async function settle(page, day, expectedDoubt, elder = null, win = false) {
  if (elder) {
    await click(page, `UI.closeModal(); BuildUI.selectElder('${elder}');`);
    if (elder === 'nikandros') await click(page, "UI.closeModal(); BuildUI.rechargeItem('toolbelt', 'balance_blade');");
    else await confirm(page);
  }
  for (let dialogs = 0; dialogs < 8 && await page.evaluate(() => !!GameState.pendingDayAction); dialogs++) {
    const button = page.locator('#modal-content .confirm-actions button:enabled:visible').last();
    await button.waitFor({ state: 'visible' });
    await button.click();
  }
  await page.waitForFunction(() => !GameState.pendingDayAction);
  assert.deepEqual(await page.evaluate(() => [GameState.currentDay, GameState.doubt.current, GameState.phase]), [day + 1, expectedDoubt, win ? 'game_over' : 'idle']);
  assert.equal(await page.evaluate(() => GameState.daysCrossed.length), day);
  assert.equal(await page.evaluate(() => new Set(GameState.daysCrossed).size), day);
  assert.equal(await page.evaluate(() => window.__singles[GameState.daysCrossed.at(-1)]?.length || 0), 0, 'Every expected attack die is consumed exactly once.');
  if (win) await page.locator('.gameover-result.win').waitFor({ state: 'visible' });
  else assert.equal(await page.locator('#modal-overlay.active').count(), 0);
  return page.evaluate(() => ({ day: GameState.currentDay - 1, hp: GameState.hp.current, doubt: GameState.doubt.current, huts: GameState.huts.filter(Boolean).length, beasts: { ...GameState.beastsDefeated }, towers: Object.fromEntries(Object.entries(GameState.towers).map(([key, value]) => [key, { complete: value.complete, destroyed: value.destroyed, faults: BuildUI.countFaults(key, value.grid) }])) }));
}

async function fullRun(browser, url, language, viewport) {
  const { context, page } = await setup(browser, url, language, viewport);
  const days = [];
  const name = `${viewport.width}-${language}`;
  try {
    // Day 1: common material, lair + rare material, common encounter and loot.
    await startSearch(page, 'halebeard');
    await searchBox(page, [6, 6, 6], [6, 5, 5]);
    await click(page, "UI.closeModal(); SearchUI.start('halebeard');");
    await searchBox(page, [2, 2, 2], [2, 2, 1]);
    const box = await page.evaluate(() => GameState.search.lastCompletedBoxIndex);
    await click(page, `SearchUI.chooseLairMaterial('halebeard', ${box}, 'rare')`);
    await click(page, "UI.closeModal(); SearchUI.start('halebeard');");
    await searchBox(page, [3, 3, 3], [1, 1, 1]);
    await click(page, 'SearchUI.continueSearch();');
    await click(page, 'CombatUI.useItem()');
    await click(page, "CombatUI.activateItem('balance_blade')");
    await fight(page); // Search limit reached: the result continuation ends day 1.
    days.push(await settle(page, 1, 1));
    assert.deepEqual(await page.evaluate(() => [GameState.materials.stone, GameState.materials.silver, GameState.materials.foul_blood]), [1, 1, 1]);

    // Day 2: forge the rare material into mastercraft armour.
    await page.click('#btn-forge');
    await click(page, "UI.closeModal(); ForgeUI.start('silver_plate');");
    for (let col = 0; col < 3; col++) {
      await click(page, 'ForgeUI.rollDice()');
      await click(page, 'ForgeUI.selectDie(0)');
      await click(page, `ForgeUI.placeDie('top', ${col})`);
      await click(page, 'ForgeUI.selectDie(0)');
      await click(page, `ForgeUI.placeDie('bottom', ${col})`);
    }
    await click(page, 'ForgeUI.complete(0)');
    await confirm(page);
    days.push(await settle(page, 2, 2));
    assert.equal(await page.evaluate(() => GameState.equipment.silver_plate), 'mastercraft');

    await buildTower(page, 'east', 'stone');
    days.push(await settle(page, 3, 2));
    assert.equal(days.at(-1).towers.east.faults, 2);

    await hunt(page, 'halebeard');
    days.push(await settle(page, 4, 4, 'epiphoros'));
    assert.equal(days.at(-1).huts, 8);

    await startSearch(page, 'coastal');
    await searchBox(page, [2, 2, 2], [2, 2, 1]);
    await click(page, "SearchUI.chooseLairMaterial('coastal', 0, 'common')");
    await click(page, 'SearchUI.endSearchDay();');
    days.push(await settle(page, 5, 6));

    await buildTower(page, 'south', 'cord');
    days.push(await settle(page, 6, 6));
    assert.equal(days.at(-1).towers.south.faults, 1);

    await hunt(page, 'coastal');
    days.push(await settle(page, 7, 6, 'sipporos'));

    await startSearch(page, 'scar');
    assert.equal(await page.evaluate(() => GameState.search.maxSearches), 2, 'Foul Weather limits this search day.');
    await searchBox(page, [2, 2, 2], [2, 2, 1]);
    await click(page, "SearchUI.chooseLairMaterial('scar', 0, 'common')");
    await click(page, 'SearchUI.endSearchDay();');
    days.push(await settle(page, 8, 8));
    // A stable day-boundary save/load must preserve every scored resource.
    const beforeSave = await page.evaluate(() => JSON.stringify([GameState.daysCrossed, GameState.materials, GameState.beastsDefeated, GameState.doubt, GameState.equipment]));
    await page.click('#btn-save'); await confirm(page);
    await page.click('#btn-load');
    assert.equal(await page.evaluate(() => JSON.stringify([GameState.daysCrossed, GameState.materials, GameState.beastsDefeated, GameState.doubt, GameState.equipment])), beforeSave);

    await buildTower(page, 'west', 'tar');
    days.push(await settle(page, 9, 8, 'nikandros'));
    assert.equal(await page.evaluate(() => GameState.toolbelt.balance_blade), false);

    for (const [day, doubt] of [[10, 9], [11, 10], [12, 11], [13, 12]]) {
      await page.click('#btn-rest');
      await confirm(page);
      days.push(await settle(page, day, doubt));
    }
    assert.equal(days[9].towers.west.destroyed, true, 'The day-10 event assault destroys the west tower.');
    assert.equal(days[11].towers.south.faults, 3);

    await hunt(page, 'scar');
    days.push(await settle(page, 14, 12, null, true));
    assert.equal(await page.evaluate(() => Object.values(GameState.beastsDefeated).every(Boolean)), true);
    assert.equal(await page.evaluate(() => Object.values(GameState.elders).every(Boolean)), true);
    assert.doesNotMatch(await page.locator('.gameover-text').innerText(), /他们将你赶出了村庄/);
    const score = await page.evaluate(() => ({ value: GameState.score, rows: Scoring.getBreakdown({ includeZero: true }), dice: window.__rollAudit }));
    assert.equal(score.value, score.rows.reduce((sum, row) => sum + row.points, 0));
    await page.screenshot({ path: path.join(out, `${name}-victory.png`), fullPage: true });
    runs.push({ name, days, score });
    console.log(`Full 14-day game passed: ${name}, score ${score.value}`);
  } catch (error) {
    await page.screenshot({ path: path.join(out, `${name}-failure.png`), fullPage: true });
    console.error('State at failure:', await page.evaluate(() => ({ phase: GameState.phase, day: GameState.currentDay, pending: GameState.pendingDayAction, title: document.querySelector('.modal-title')?.textContent, build: GameState.build, search: GameState.search })));
    throw error;
  } finally { await context.close(); }
}

async function failurePaths(browser, url) {
  // Saving during an event dialog must preserve a good save and the dialog's
  // continuation. Saving is available again once the full day has settled.
  {
    const { context, page } = await setup(browser, url, 'zh', { width: 1280, height: 900 });
    try {
      await page.click('#btn-save'); await confirm(page);
      const initialSave = await page.evaluate(() => localStorage.getItem('uebh_save_0'));
      await page.click('#btn-rest'); await confirm(page);
      await page.locator('button[onclick="UI.closeModal(); Events.afterEvents();"]').waitFor({ state: 'visible' });
      assert.equal(await page.locator('#day-display').textContent(), '1/14');
      assert.equal(await page.locator('.atlas-sheet-meta span').first().locator('b').textContent(), '1/14');
      assert.equal(await page.locator('#btn-save').isDisabled(), true);
      assert.equal(await page.evaluate(() => GameState.save()), false);
      await page.evaluate(() => Game.saveGame());
      assert.equal(await page.evaluate(() => localStorage.getItem('uebh_save_0')), initialSave);
      await click(page, 'UI.closeModal(); Events.afterEvents();');
      assert.equal(await page.evaluate(() => GameState.pendingDayAction), null);
      assert.equal(await page.locator('#btn-save').isEnabled(), true);
      await page.click('#btn-save'); await confirm(page);
      assert.deepEqual(await page.evaluate(() => {
        const saved = JSON.parse(localStorage.getItem('uebh_save_0'));
        return [saved.currentDay, saved.pendingDayAction, saved.doubt.current];
      }), [2, null, 1]);
      boundaries.push('Saving during day end preserves the previous save and active dialog; saving resumes after settlement.');
    } finally { await context.close(); }
  }
  // Death starts at the real opening and uses a searched encounter, with no
  // HP or day edits. Each miss lets the Gremlin attack with both dice.
  {
    const { context, page } = await setup(browser, url, 'zh', { width: 1280, height: 900 });
    try {
      await startSearch(page, 'halebeard');
      await searchBox(page, [3, 3, 3], [1, 1, 1]);
      await click(page, 'SearchUI.continueSearch();');
      await page.evaluate(() => { window.__pairs = Array.from({ length: 5 }, () => [1, 1]); });
      await fight(page);
      await page.locator('.gameover-result.lose').waitFor({ state: 'visible' });
      assert.deepEqual(await page.evaluate(() => [GameState.hp.current, GameState.currentDay, GameState.daysCrossed.length, GameState.pendingDayAction, GameState.phase]), [0, 1, 0, null, 'game_over']);
      assert.equal(await page.evaluate(() => Scoring.getBreakdown().some(row => row.bonus)), false);
      assert.equal(await page.locator('#btn-rest').isDisabled(), true);
      boundaries.push('Opening encounter: death ends combat without advancing a day or awarding victory bonuses.');
    } finally { await context.close(); }
  }
  // A second entire opening-to-defeat run: four unblocked attacks plus daily
  // Rest Doubt reach the limit during the day-6 attack itself.
  {
    const { context, page } = await setup(browser, url, 'zh', { width: 390, height: 844 });
    try {
      await page.evaluate(() => {
        window.__events[1] = [1, 3, 5, 5];
        window.__singles = { 1: [1, 1], 3: [3, 5], 4: [5, 2], 6: [1, 1] };
      });
      const expected = [3, 4, 9, 16, 17, 18];
      for (let day = 1; day <= 6; day++) {
        await page.click('#btn-rest'); await confirm(page);
        for (let step = 0; step < 5 && await page.evaluate(() => !!GameState.pendingDayAction); step++) {
          await page.locator('#modal-content .confirm-actions button:enabled:visible').last().click();
        }
        assert.equal(await page.evaluate(() => GameState.pendingDayAction), null);
        assert.equal(await page.evaluate(() => GameState.doubt.current), expected[day - 1]);
        assert.equal(await page.evaluate(() => GameState.currentDay), day + 1);
      }
      await page.locator('.gameover-result.lose').waitFor({ state: 'visible' });
      assert.deepEqual(await page.evaluate(() => [GameState.huts.filter(Boolean).length, GameState.phase, GameState.daysCrossed.length]), [5, 'game_over', 6]);
      assert.equal(await page.evaluate(() => Scoring.getBreakdown().some(row => row.bonus)), false);
      boundaries.push('Six-day opening-to-defeat run: hut penalties and Rest Doubt reach 18; defeat follows the attack result.');
    } finally { await context.close(); }
  }
  // Isolated deadline boundary, separate from the uninterrupted full games.
  {
    const { context, page } = await setup(browser, url, 'en', { width: 390, height: 844 });
    try {
      await page.evaluate(() => {
        GameState.currentDay = 14;
        GameState.daysCrossed = Array.from({ length: 13 }, (_, i) => i + 1);
        UI.render();
      });
      await page.click('#btn-rest'); await confirm(page);
      await page.locator('.gameover-result.lose').waitFor({ state: 'visible' });
      assert.deepEqual(await page.evaluate(() => [GameState.currentDay, GameState.daysCrossed.length, GameState.doubt.current, GameState.pendingDayAction, GameState.checkWinCondition()]), [15, 14, 1, null, false]);
      assert.equal(await page.locator('#day-display').textContent(), '14/14');
      assert.equal(await page.locator('.atlas-sheet-meta span').first().locator('b').textContent(), '14/14');
      assert.equal(await page.evaluate(() => Scoring.getBreakdown().some(row => row.bonus)), false);
      boundaries.push('Isolated day-14 deadline: incomplete objective loses after daily Doubt, with no victory bonuses.');
    } finally { await context.close(); }
  }
  console.log('Browser boundaries passed: day-end save guard, combat death, Doubt defeat, day-14 timeout.');
}

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UEBH_BROWSER_EXECUTABLE || undefined });
    const url = `http://127.0.0.1:${server.address().port}`;
    const boundariesOnly = process.argv.includes('--boundaries-only');
    if (boundariesOnly && fs.existsSync(path.join(out, 'report.json'))) runs.push(...JSON.parse(fs.readFileSync(path.join(out, 'report.json'))).runs);
    if (!boundariesOnly) {
      await fullRun(browser, url, 'zh', { width: 1440, height: 900 });
      await fullRun(browser, url, 'en', { width: 390, height: 844 });
    }
    await failurePaths(browser, url);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify({ runs, boundaries, errors }, null, 2));
    console.log(`Full gameplay report: ${out}`);
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
