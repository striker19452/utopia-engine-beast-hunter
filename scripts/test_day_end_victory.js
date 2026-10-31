const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = ['version', 'data', 'state', 'dice', 'scoring', 'combat', 'build', 'events', 'main']
  .map(name => fs.readFileSync(path.join(__dirname, '..', 'js', `${name}.js`), 'utf8'))
  .join('\n');

function createGame(day = 2) {
  let modal = '';
  const callbacks = [];
  const storage = new Map();
  const context = vm.createContext({
    document: { getElementById: () => null, addEventListener: () => {} },
    setTimeout: callback => callbacks.push(callback),
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    UI: {
      render: () => {},
      closeModal: () => { modal = ''; },
      showModal: html => { modal = html; },
    },
  });
  const modules = vm.runInContext(`${source}\n({ GameState, Game, CombatUI, BuildUI, Events, Dice, Scoring, GAME_DATA });`, context);
  const { GameState, Dice } = modules;
  GameState.reset();
  GameState.currentDay = day;
  GameState.daysCrossed = Array.from({ length: day - 1 }, (_, index) => index + 1);
  // Foul Weather and Madness coincide: all beasts dead must suppress attacks,
  // while the event itself must still be resolved before victory.
  Dice.rollEvents = () => [1, 1, 1, 1];
  Dice.roll = () => { throw new Error('A defeated beast must not attack.'); };
  return {
    ...modules,
    get modal() { return modal; },
    readSave() { return storage.get('uebh_save_0'); },
    confirm() {
      const action = modal.match(/<button[^>]*onclick="([^"]+)"/)?.[1];
      assert.ok(action, 'The current dialog must offer a continuation.');
      vm.runInContext(action, context);
    },
    flush() {
      while (callbacks.length) callbacks.shift()();
    },
  };
}

function defeatLastBeast(game, elder = 'epiphoros') {
  const { GameState, GAME_DATA, CombatUI } = game;
  GameState.beastsDefeated.halebeard = true;
  GameState.beastsDefeated.coastal = true;
  GameState.hp.current = 5;
  GameState.doubt.current = 7;
  GameState.elders = { epiphoros: true, sipporos: true, nikandros: true };
  if (elder) GameState.elders[elder] = false;
  GameState.search = { region: 'scar' };
  GameState.phase = 'combat';
  GameState.combat = {
    region: 'scar', beastType: 'terrible', beast: GAME_DATA.regions.scar.terribleBeast,
  };
  CombatUI.victory();
}

function assertPending(game) {
  assert.equal(game.GameState.pendingDayAction, 'kill_beast');
  assert.equal(game.GameState.checkWinCondition(), false);
  assert.equal(game.Game.checkGameEnd(), false, 'Do not bypass day-end dialogs.');
  assert.equal(game.GameState.phase, 'idle');
  assert.equal(game.Scoring.getBreakdown().some(row => row.bonus), false);
}

function finishEvents(game, day) {
  game.flush();
  if (game.GAME_DATA.timeTrack[day - 1].event === 'E') {
    assertPending(game);
    assert.match(game.modal, /event-result-item/);
    assert.ok(game.GameState.activeEvents.halebeard.includes('Madness'));
    game.confirm();
  }
}

for (let day = 1; day <= 14; day++) {
  test(`day ${day}: third-beast victory waits for rewards and the complete day end`, () => {
    const game = createGame(day);
    const { GameState, BuildUI } = game;
    defeatLastBeast(game);
    assertPending(game);
    assert.equal(GameState.determination, 1);
    assert.equal(GameState.search, null);
    assert.equal(GameState.currentDay, day + 1);
    assert.equal(GameState.daysCrossed.at(-1), day);
    assert.equal(GameState.getDisplayDay(), day, 'Rewards and events identify the day being settled.');
    game.confirm();
    assert.match(game.modal, /选择一位长老/);
    assertPending(game);
    BuildUI.selectElder('epiphoros');
    assert.equal(GameState.hp.current, 7, 'The final approval reward is applied before scoring.');
    assertPending(game);
    game.confirm();
    finishEvents(game, day);

    assert.equal(GameState.pendingDayAction, null);
    assert.equal(GameState.getDisplayDay(), day, 'The ending displays the day on which the hunt was completed.');
    assert.equal(GameState.checkWinCondition(), true);
    assert.equal(GameState.phase, 'game_over');
    assert.equal(GameState.doubt.current, 7, 'A beast-kill day adds no daily Doubt.');
    assert.match(game.modal, /gameover-result win/);
    assert.match(game.modal, /你已经证明了自己的价值/);
    assert.doesNotMatch(game.modal, /他们将你赶出了村庄/);
    const rows = game.Scoring.getBreakdown({ includeZero: true });
    assert.equal(rows.find(row => row.label.startsWith('剩余HP')).points, 7 * game.GAME_DATA.scoring.bonusHpRemaining);
    assert.equal(rows.find(row => row.label.startsWith('剩余天数')).points, (14 - day) * game.GAME_DATA.scoring.bonusDayRemaining);
    game.Game.finishDayAndCheck();
    assert.equal(GameState.daysCrossed.length, day, 'Repeated checks do not consume another day.');
    assert.equal(GameState.doubt.current, 7);
  });
}

test('a final Nikandros approval waits for item restoration before day-end victory', () => {
  const game = createGame(12);
  defeatLastBeast(game, 'nikandros');
  game.GameState.toolbelt.balance_blade = true;
  game.confirm();
  game.BuildUI.selectElder('nikandros');
  assert.match(game.modal, /恢复物品/);
  assertPending(game);
  game.BuildUI.rechargeItem('toolbelt', 'balance_blade');
  finishEvents(game, 12);
  assert.equal(game.GameState.toolbelt.balance_blade, false);
  assert.equal(game.GameState.checkWinCondition(), true);
  assert.match(game.modal, /gameover-result win/);
});

test('all elders already approved still finish a no-attacker ! day', () => {
  const game = createGame(9);
  defeatLastBeast(game, null);
  assertPending(game);
  game.confirm();
  finishEvents(game, 9);
  assert.equal(game.GameState.pendingDayAction, null);
  assert.match(game.modal, /gameover-result win/);
});

test('a surviving beast on a ! day still attacks before daily Doubt and game-end checks', () => {
  const game = createGame(12);
  const { GameState, Game, Dice } = game;
  GameState.beastsDefeated.halebeard = true;
  GameState.beastsDefeated.coastal = true;
  Dice.roll = () => [5]; // Scar region, then a direction without a standing tower.
  GameState.advanceDay('search');
  Game.onDayAdvanced();
  game.flush();
  assert.match(game.modal, /巨兽袭击/);
  assert.equal(GameState.pendingDayAction, 'search');
  assert.equal(GameState.huts.filter(Boolean).length, 8);
  assert.equal(GameState.doubt.current, 2, 'Immediate hut damage precedes daily Doubt.');
  assert.equal(Game.checkGameEnd(), false);
  game.confirm();
  assert.equal(GameState.pendingDayAction, null);
  assert.equal(GameState.doubt.current, 4);
  assert.equal(GameState.phase, 'idle');
});

test('day 14 without all three beasts defeated loses only after daily Doubt', () => {
  const game = createGame(14);
  game.GameState.advanceDay('search');
  assert.equal(game.GameState.phase, 'idle');
  assert.equal(game.Game.checkGameEnd(), false);
  game.Game.onDayAdvanced();
  assert.equal(game.GameState.pendingDayAction, null);
  assert.equal(game.GameState.doubt.current, 1);
  assert.equal(game.GameState.phase, 'game_over');
  assert.equal(game.GameState.checkWinCondition(), false);
  assert.match(game.modal, /gameover-result lose/);
  assert.match(game.modal, /他们将你赶出了村庄/);
});

for (const failure of ['hp', 'doubt', 'deadline']) {
  test(`all three defeat flags do not override a ${failure} failure or award victory bonuses`, () => {
    const game = createGame(failure === 'deadline' ? 16 : 14);
    Object.keys(game.GameState.beastsDefeated).forEach(key => { game.GameState.beastsDefeated[key] = true; });
    if (failure === 'hp') game.GameState.takeDamage(10);
    if (failure === 'doubt') game.GameState.addDoubt(18);
    assert.equal(game.Game.checkGameEnd(), true);
    assert.equal(game.GameState.checkWinCondition(), false);
    assert.match(game.modal, /gameover-result lose/);
    assert.equal(game.Scoring.getBreakdown().some(row => row.bonus), false);
  });
}

test('completing the third tower with every elder already approved still finishes the day', () => {
  const game = createGame(2);
  const { GameState, BuildUI } = game;
  GameState.elders = { epiphoros: true, sipporos: true, nikandros: true };
  GameState.towers.east.complete = true;
  GameState.towers.south.complete = true;
  GameState.materials.tar = 1;
  GameState.startBuild('west', 'tar');
  const indices = BuildUI.getActiveIndices('west');
  indices.slice(0, -1).forEach(index => { GameState.towers.west.grid[index] = 6; });
  Object.assign(GameState.build, { pendingRoll: [6, 6], selectedDieIndex: 0 });
  BuildUI.placeCell(indices.at(-1));
  game.flush();
  assert.equal(GameState.towers.west.complete, true);
  assert.equal(GameState.pendingDayAction, null, 'An unavailable elder reward must not block day end.');
  assert.equal(GameState.currentDay, 3);
});

test('a second rest or a new search cannot start while the prior day is settling', () => {
  const game = createGame(1);
  game.Game.doRest();
  assert.equal(game.GameState.startSearch('halebeard'), false);
  game.Game.doRest();
  assert.deepEqual(Array.from(game.GameState.daysCrossed), [1]);
  assert.equal(game.GameState.currentDay, 2);
  assert.equal(game.GameState.search, null);
});

test('repeating day advancement opens and rolls an event only once', () => {
  const game = createGame(1);
  let rolls = 0;
  game.Dice.rollEvents = () => { rolls++; return [1, 3, 5, 1]; };
  game.GameState.advanceDay('rest');
  game.Game.onDayAdvanced();
  game.Game.onDayAdvanced();
  game.flush();
  assert.equal(rolls, 1);
  game.confirm();
  assert.equal(game.GameState.doubt.current, 1);
  game.Game.onDayAdvanced();
  game.flush();
  assert.equal(rolls, 1, 'A completed day cannot be replayed.');
  assert.equal(game.GameState.doubt.current, 1);
});

test('an old day-end timer cannot open events after a new game', () => {
  const game = createGame(1);
  game.Game.doRest();
  game.Game.newGame();
  game.flush();
  assert.equal(game.GameState.currentDay, 1);
  assert.equal(game.GameState.pendingDayAction, null);
  assert.equal(game.modal, '');
  assert.equal(Object.values(game.GameState.activeEvents).every(events => events.length === 0), true);
});

test('a queued assault that reaches maximum Doubt ends the game before another assault', () => {
  const game = createGame(4);
  game.GameState.doubt.current = 17;
  game.GameState.advanceDay('rest');
  game.Dice.roll = () => [1];
  game.Events.processNextBeastAttack(2, 0);
  assert.equal(game.GameState.huts.filter(Boolean).length, 8);
  assert.equal(game.GameState.phase, 'game_over');
  game.confirm();
  assert.equal(game.GameState.huts.filter(Boolean).length, 8, 'Do not execute more attacks after defeat.');
  assert.equal(game.Events._pendingAttacks, null);
  assert.equal(game.GameState.pendingDayAction, null);
  assert.match(game.modal, /gameover-result lose/);
});

test('two surviving queued assaults apply hut penalties in order, then daily Doubt once', () => {
  const game = createGame(4);
  game.GameState.advanceDay('search');
  game.Dice.roll = () => [1];
  game.Events.processNextBeastAttack(2, 0);
  assert.equal(game.GameState.doubt.current, 2);
  assert.equal(game.GameState.pendingDayAction, 'search');
  game.confirm();
  assert.equal(game.GameState.doubt.current, 6);
  assert.equal(game.GameState.huts.filter(Boolean).length, 7);
  assert.equal(game.GameState.pendingDayAction, 'search');
  game.confirm();
  assert.equal(game.GameState.doubt.current, 9);
  assert.equal(game.GameState.pendingDayAction, null);
  assert.equal(game.Events._pendingAttacks, null);
  assert.equal(game.GameState.phase, 'idle');
  game.Game.finishDayAndCheck();
  assert.equal(game.GameState.doubt.current, 9);
});

test('weather plus Madness still rolls a surviving attacker when the event region beast is dead', () => {
  const game = createGame(4);
  game.GameState.beastsDefeated.halebeard = true;
  game.GameState.advanceDay('rest');
  const singles = [1, 2, 3, 5]; // Two rejected dead-region rolls, then Coastal attacking south.
  game.Dice.roll = () => [singles.shift()];
  game.Game.onDayAdvanced();
  game.flush();
  assert.match(game.modal, /巨兽袭击！/);
  assert.equal(game.GameState.doubt.current, 0);
  game.confirm();
  assert.match(game.modal, /潮汐潜伏者/);
  assert.equal(game.GameState.regions.coastal.tracking.filter(Boolean).length, 1);
  assert.equal(game.GameState.regions.halebeard.tracking.filter(Boolean).length, 0);
  assert.equal(game.GameState.doubt.current, 2);
  game.confirm();
  assert.equal(game.GameState.doubt.current, 3, 'Rest adds only 1 daily Doubt, even with a destroyed hut.');
  assert.equal(singles.length, 0);
});

for (const [action, increase] of [['rest', 1], ['search', 3], ['forge', 3], ['default', 3], ['build', 0], ['kill_beast', 0]]) {
  test(`${action}: daily Doubt with two destroyed huts is ${increase} and is applied once`, () => {
    const game = createGame(2);
    game.GameState.huts[0] = false;
    game.GameState.huts[1] = false;
    game.GameState.advanceDay(action);
    game.Game.onDayAdvanced();
    game.Game.finishDayAndCheck();
    assert.equal(game.GameState.doubt.current, increase);
    assert.equal(game.GameState.currentDay, 3);
    assert.equal(game.GameState.pendingDayAction, null);
  });
}

for (const [directionRoll, towerKey] of [[1, 'east'], [3, 'south'], [5, 'west']]) {
  for (const [damageRoll, faults, destroyed, hawk] of [[1, 0, false, false], [2, 1, false, false], [3, 2, false, false], [6, 0, true, false], [null, 0, false, true]]) {
    test(`${towerKey}: attack ${hawk ? 'blocked by Hawk Totem' : `damage roll ${damageRoll}`} protects huts and updates the tower`, () => {
      const game = createGame(3);
      const tower = game.GameState.towers[towerKey];
      game.BuildUI.getActiveIndices(towerKey).forEach(index => { tower.grid[index] = 6; });
      tower.complete = true;
      tower.hawkTotem = hawk;
      game.GameState.regions.halebeard.tracking = [true, true, false];
      const dice = [1, directionRoll, ...(damageRoll ? [damageRoll] : [])];
      game.Dice.roll = () => [dice.shift()];
      game.GameState.advanceDay('search');
      game.Game.onDayAdvanced();
      game.flush();
      assert.equal(game.GameState.huts.every(Boolean), true);
      assert.equal(game.GameState.doubt.current, 0);
      assert.equal(tower.destroyed, destroyed);
      assert.equal(tower.complete, !destroyed);
      assert.equal(game.BuildUI.countFaults(towerKey, tower.grid), faults);
      assert.equal(game.GameState.regions.halebeard.lairFound, true);
      assert.equal(game.GameState.determination, 1);
      game.confirm();
      assert.equal(game.GameState.doubt.current, 1);
      assert.equal(game.GameState.pendingDayAction, null);
      assert.equal(dice.length, 0);
    });
  }
}

test('existing tower faults are added to the damage roll before deciding destruction', () => {
  const game = createGame(3);
  const tower = game.GameState.towers.east;
  const indices = game.BuildUI.getActiveIndices('east');
  indices.forEach((index, i) => { tower.grid[index] = i < 3 ? 'X' : 6; });
  tower.complete = true;
  const dice = [1, 1, 3];
  game.Dice.roll = () => [dice.shift()];
  game.GameState.advanceDay('rest');
  game.Game.onDayAdvanced();
  game.flush();
  assert.equal(tower.destroyed, true);
  assert.equal(game.BuildUI.countFilled('east', tower.grid), 0);
  assert.equal(game.GameState.huts.every(Boolean), true, 'A tower destroyed by this attack still absorbs it.');
  game.confirm();
  assert.equal(game.GameState.doubt.current, 1);
});

test('saving cannot replace a good save with an incomplete day settlement', () => {
  const game = createGame(1);
  game.GameState.save();
  const originalSave = game.readSave();
  game.Game.doRest();
  const priorModal = game.modal;
  game.Game.saveGame();
  assert.equal(game.readSave(), originalSave);
  assert.equal(game.modal, priorModal, 'Do not replace a committed day-end dialog with Save Success.');
  assert.equal(game.GameState.save(), false, 'Direct save calls must also reject an unfinished settlement.');
  game.Dice.rollEvents = () => [1, 3, 5, 1];
  game.flush(); game.confirm();
  game.Game.saveGame();
  assert.equal(JSON.parse(game.readSave()).pendingDayAction, null);
  assert.equal(JSON.parse(game.readSave()).currentDay, 2);
});

test('loading a stable save invalidates the previous day-end callback', () => {
  const game = createGame(1);
  game.GameState.save();
  game.Game.doRest();
  game.Game.loadGame();
  game.flush();
  assert.equal(game.GameState.currentDay, 1);
  assert.equal(game.GameState.pendingDayAction, null);
  assert.equal(game.GameState.phase, 'idle');
  assert.equal(game.modal, '');
});
