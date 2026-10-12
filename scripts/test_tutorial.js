// Run with Playwright available through NODE_PATH (or a local installation).
// Set UEBH_BROWSER_EXECUTABLE to use an existing Chrome/Edge installation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'uebh-tutorial-'));
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve(root, '.' + (relative === '/' ? '/index.html' : relative));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', (types[path.extname(file)] || 'text/plain') + (['.html', '.js', '.css'].includes(path.extname(file)) ? '; charset=utf-8' : ''));
    res.end(data);
  });
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.UEBH_BROWSER_EXECUTABLE || undefined });
  const url = `http://127.0.0.1:${server.address().port}`;
  const errors = [];
  async function fresh(options = {}, noStorage = false) {
    const context = await browser.newContext(options);
    if (noStorage) await context.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('#btn-start-game').click();
    await page.locator('#onboarding-invitation').waitFor({ state: 'visible' });
    return { context, page };
  }
  const clickAction = (page, action) => page.locator(`#modal-content button[onclick="${action}"]`).click();
  async function begin(page) {
    await page.locator('#onboarding-invitation button').first().click();
    assert.equal(await page.locator('#tutorial-note').innerText().then(text => text.includes('在14天内击败三只恐怖巨兽') && text.includes('为什么要探索')), true);
    await clickAction(page, 'Game.showSearchDialog()');
    assert.equal(await page.locator('#modal-content button:enabled').filter({ hasText: '海岸洞穴' }).count(), 0);
    await clickAction(page, "UI.closeModal(); Game.startSearch('halebeard');");
  }
  async function fillBox(page) {
    for (let col = 0; col < 3; col++) {
      await page.locator('#search-dice button').filter({ hasText: '掷骰子' }).click();
      await page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).waitFor({ state: 'visible' });
      assert.equal(await page.locator('#search-placement button:enabled').count(), 0);
      await page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).click();
      await clickAction(page, `SearchUI.placeDie('top', ${col}, 0)`);
      await page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).click();
      await clickAction(page, `SearchUI.placeDie('bottom', ${col}, 1)`);
    }
  }
  async function finish(page) {
    await fillBox(page);
    assert.equal(await page.locator('#tutorial-note').innerText().then(text => text.includes('为什么要建造塔楼') && text.includes('3个追踪圈')), true);
    assert.equal(await page.evaluate(() => GameState.materials.stone), 1);
    await clickAction(page, "UI.closeModal(); SearchUI.start('halebeard');");
    await fillBox(page);
    await clickAction(page, 'SearchUI.continueSearch();');
    await clickAction(page, 'CombatUI.rollCombatDice()');
    await page.locator('#combat-dice button').filter({ hasText: '结算战斗骰' }).waitFor({ state: 'visible' });
    await clickAction(page, 'CombatUI.resolveCombatRoll()');
    assert.equal(await page.locator('#tutorial-note').innerText().then(text => text.includes('决心的作用') && text.includes('±1')), true);
    assert.deepEqual(await page.evaluate(() => [GameState.hp.current, GameState.combat.beastHp, GameState.determination]), [9, 1, 1]);
    await clickAction(page, 'CombatUI.rollCombatDice()');
    await page.locator('#combat-dice button').filter({ hasText: '结算战斗骰' }).waitFor({ state: 'visible' });
    assert.equal(await page.locator('button[onclick="CombatUI.resolveCombatRoll()"]:enabled').count(), 0);
    await clickAction(page, 'CombatUI.modifyPendingDie(0, 1)');
    await clickAction(page, 'CombatUI.resolveCombatRoll()');
    assert.equal(await page.evaluate(() => GameState.materials.foul_blood), 1);
    await clickAction(page, 'UI.closeModal(); SearchUI.showPostCombatOptions();');
    assert.equal(await page.locator('#tutorial-note').innerText().then(text => text.includes('时间轨道') && text.includes('E代表事件')), true);
    await clickAction(page, 'SearchUI.endSearchDay();');
    await page.locator('button[onclick="UI.closeModal(); Events.afterEvents();"]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#tutorial-note').innerText().then(text => text.includes('村民的怀疑') && text.includes('被赶出村庄')), true);
    assert.equal(await page.evaluate(() => GameState.doubt.current), 0, 'Doubt must wait until after events');
    await clickAction(page, 'UI.closeModal(); Events.afterEvents();');
    assert.deepEqual(await page.evaluate(() => [Tutorial.stage, GameState.currentDay, GameState.doubt.current]), ['complete', 2, 1]);
    assert.equal(await page.locator('#tutorial-note').innerText().then(text => text.includes('今天为什么增加1点怀疑') && text.includes('达到18就会失败')), true);
    assert.deepEqual(await page.locator('.mentor-stats dd').allTextContents(), ['2/14', '1/18', '0']);
    await page.waitForFunction(() => {
      const pointer = document.getElementById('tutorial-pointer');
      const target = Tutorial.currentTarget();
      if (!pointer || !target) return false;
      const a = pointer.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const y = pointer.classList.contains('points-up') ? Math.min(innerHeight - 44, b.bottom - 3) : b.top - 38;
      return Math.abs(a.top - Math.round(y)) < 2;
    });
    assert.equal(await page.evaluate(() => Object.values(GameState.activeEvents).some(events => events.includes('Foul Weather') && events.includes('Madness'))), false);
  }

  try {
    const { context, page } = await fresh({ viewport: { width: 1280, height: 900 } });
    await page.evaluate(() => {
      GameState.hp.current = 7;
      GameState.materials.silver = 2;
      GameState.log.push({ time: new Date(), message: 'Original progress' });
      GameState.save();
      window.originalState = JSON.stringify(Tutorial.capture());
      window.originalSave = localStorage.getItem('uebh_save_0');
    });
    await begin(page);
    await page.locator('#tutorial-pointer').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#tutorial-pointer').evaluate(el => getComputedStyle(el).pointerEvents), 'none');
    assert.equal(await page.locator('.tutorial-hand').evaluate(el => getComputedStyle(el).animationName), 'tutorial-tap');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.getElementById('modal-content').contains(document.activeElement)), true);
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.getElementById('modal-content').contains(document.activeElement)), true);
    await page.evaluate(() => { Game.saveGame(); GameState.save(); Game.loadGame(); });
    assert.equal(await page.evaluate(() => localStorage.getItem('uebh_save_0') === window.originalSave), true);
    // Retry clears partial placement and grants no duplicate rewards.
    await clickAction(page, 'SearchUI.rollDice()');
    await page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).waitFor({ state: 'visible' });
    await page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).click();
    await clickAction(page, "SearchUI.placeDie('top', 0, 0)");
    await clickAction(page, 'Tutorial.retry()');
    assert.equal(await page.evaluate(() => GameState.regions.halebeard.searchBoxes[0].top[0]), null);
    await finish(page);
    await page.screenshot({ path: path.join(output, 'desktop-complete.png') });
    // Completed results are idempotent even if an old event callback is repeated.
    await page.evaluate(() => Game.finishDayAndCheck());
    assert.equal(await page.evaluate(() => GameState.doubt.current), 1);
    await clickAction(page, 'Tutorial.exit()');
    assert.equal(await page.locator('#tutorial-pointer').count(), 0);
    assert.equal(await page.evaluate(() => JSON.stringify(Tutorial.capture()) === window.originalState), true);
    assert.equal(await page.locator('#game-log').innerText().then(text => text.includes('Original progress')), true);
    assert.equal(await page.locator('#game-log').innerText().then(text => text.includes('霜地精')), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('uebh_save_0') === window.originalSave), true);
    assert.equal(await page.evaluate(() => Tutorial.practiceRoll('search')), null);
    assert.deepEqual(await page.evaluate(() => {
      const originalRoll = Dice.roll;
      Dice.roll = n => Array(n).fill(2);
      try { return Dice.rollFor('search'); } finally { Dice.roll = originalRoll; }
    }), [2, 2], 'Formal play must delegate to ordinary dice');
    await page.reload();
    await page.locator('#btn-start-game').click();
    assert.equal(await page.locator('#onboarding-invitation').isVisible(), false);
    // First-time hints and manual review.
    await page.locator('#btn-build').click();
    await page.locator('#mentor-hint').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: '知道了', exact: true }).click();
    await page.evaluate(() => { UI.closeModal(); Game.showBuildDialog(); });
    assert.equal(await page.locator('#mentor-hint').count(), 0);
    await page.evaluate(() => { UI.closeModal(); Tutorial.toggleHints(false); Game.showForgeDialog(); });
    assert.equal(await page.locator('#mentor-hint').count(), 0);
    await page.evaluate(() => Game.showHelp());
    await page.getByText('重看机制提示', { exact: true }).click();
    await page.locator('.mentor-actions button').filter({ hasText: '锻造装备' }).click();
    await page.locator('#mentor-hint').waitFor({ state: 'visible' });
    await context.close();

    const mobile = await fresh({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await begin(mobile.page);
    await clickAction(mobile.page, 'SearchUI.rollDice()');
    await mobile.page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).waitFor({ state: 'visible' });
    await mobile.page.locator('#search-placement button').first().waitFor({ state: 'visible' });
    await mobile.page.locator('#tutorial-note button').filter({ hasText: '点选骰子' }).click();
    await mobile.page.waitForFunction(() => {
      const pointer = document.getElementById('tutorial-pointer');
      const target = Tutorial.currentTarget();
      if (!pointer || !target) return false;
      const a = pointer.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      return Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)) < 2;
    });
    await mobile.page.screenshot({ path: path.join(output, 'mobile-search.png') });
    await mobile.page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await mobile.page.locator('.tutorial-hand').evaluate(el => getComputedStyle(el).animationName), 'none');
    await mobile.page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await mobile.page.evaluate(() => document.querySelector('#modal-content').scrollWidth <= document.querySelector('#modal-content').clientWidth), true);
    await clickAction(mobile.page, 'Tutorial.retry()');
    await finish(mobile.page);
    await mobile.page.screenshot({ path: path.join(output, 'mobile-complete.png') });
    await clickAction(mobile.page, 'Tutorial.exit(true)');
    assert.deepEqual(await mobile.page.evaluate(() => [GameState.hp.current, GameState.currentDay, GameState.materials.stone, GameState.materials.foul_blood]), [10, 1, 0, 0]);
    // Exit while a roll animation is pending, then ensure no stale callback changes state.
    await mobile.page.locator('#btn-help').click();
    await mobile.page.getByRole('button', { name: '重玩教学', exact: true }).click();
    await clickAction(mobile.page, 'Game.showSearchDialog()');
    await clickAction(mobile.page, "UI.closeModal(); Game.startSearch('halebeard');");
    await clickAction(mobile.page, 'SearchUI.rollDice()');
    await clickAction(mobile.page, 'Tutorial.exit()');
    await mobile.page.waitForTimeout(700); // Intentionally wait beyond the pending 600ms callback.
    assert.equal(await mobile.page.evaluate(() => GameState.search), null);
    await mobile.context.close();

    const blocked = await fresh({}, true);
    await begin(blocked.page);
    await finish(blocked.page);
    await clickAction(blocked.page, 'Tutorial.exit(true)');
    await blocked.page.locator('#language-toggle').click();
    assert.equal(await blocked.page.locator('html').getAttribute('lang'), 'en');
    await blocked.page.locator('#btn-help').click();
    assert.equal(await blocked.page.getByRole('button', { name: 'Replay tutorial', exact: true }).count(), 1);
    await blocked.page.getByRole('button', { name: 'Replay tutorial', exact: true }).click();
    assert.equal(await blocked.page.locator('#tutorial-note').innerText().then(text => /[\u3400-\u9fff]/.test(text)), false);
    await blocked.page.keyboard.press('Escape');
    assert.equal(await blocked.page.evaluate(() => Tutorial.active), false);
    await blocked.context.close();

    // Every lesson boundary restores the original state and log, including
    // transitions that still have delayed encounter/event callbacks queued.
    const boundaries = await fresh();
    for (const target of ['ready', 'region', 'search', 'result', 'encounter', 'combat', 'victory', 'end', 'day', 'events']) {
      await boundaries.page.evaluate(target => {
        GameState.hp.current = 6;
        window.beforeBoundary = JSON.stringify(Tutorial.capture());
        Tutorial.start();
        if (target === 'ready') return;
        Game.showSearchDialog();
        if (target === 'region') return;
        Game.startSearch('halebeard');
        if (target === 'search') return;
        for (let box = 0; box < 2; box++) {
          for (let col = 0; col < 3; col++) {
            SearchUI.rollDice();
            SearchUI.renderPendingRollPlacement();
            Tutorial.selectDie(0);
            SearchUI.placeDie('top', col, 0);
            Tutorial.selectDie(1);
            SearchUI.placeDie('bottom', col, 1);
          }
          if (target === 'result') return;
          if (box === 0) SearchUI.start('halebeard');
        }
        if (target !== 'encounter') SearchUI.continueSearch();
      }, target);
      if (['combat', 'victory', 'end', 'day', 'events'].includes(target)) {
        await boundaries.page.waitForFunction(() => Tutorial.stage === 'combat');
        if (target === 'combat') {
          // Retry a wounded combat round and verify the complete encounter resets.
          await boundaries.page.evaluate(() => {
            CombatUI.rollCombatDice(); CombatUI.renderPendingCombatRoll(); CombatUI.resolveCombatRoll();
            Tutorial.retry();
          });
          assert.deepEqual(await boundaries.page.evaluate(() => [GameState.hp.current, GameState.combat.beastHp, GameState.determination]), [10, 2, 0]);
        } else {
          await boundaries.page.evaluate(target => {
            CombatUI.rollCombatDice(); CombatUI.renderPendingCombatRoll(); CombatUI.resolveCombatRoll();
            CombatUI.rollCombatDice(); CombatUI.renderPendingCombatRoll(); CombatUI.modifyPendingDie(0, 1); CombatUI.resolveCombatRoll();
            if (target === 'victory') return;
            SearchUI.showPostCombatOptions();
            if (target !== 'end') SearchUI.endSearchDay();
          }, target);
          if (target === 'events') await boundaries.page.waitForFunction(() => Tutorial.stage === 'events');
        }
      }
      assert.equal(await boundaries.page.evaluate(() => Tutorial.stage), target);
      await boundaries.page.keyboard.press('Escape');
      assert.equal(await boundaries.page.evaluate(() => JSON.stringify(Tutorial.capture()) === window.beforeBoundary), true, `Restore at ${target}`);
      assert.equal(await boundaries.page.evaluate(() => document.getElementById('game-interface').inert), false);
    }
    await boundaries.page.waitForTimeout(700);
    assert.equal(await boundaries.page.evaluate(() => GameState.combat), null);
    await boundaries.context.close();
    assert.deepEqual(errors, []);
    console.log('Tutorial integration: OK (full lesson, animated pointer, mobile targeting, reduced motion, search/combat retry, restore at 10 boundaries, logs, saves, events, hints, unavailable storage, English, keyboard, stale callbacks)');
    console.log(`Screenshots: ${output}`);
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
