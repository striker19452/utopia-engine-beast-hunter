const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const source = ['data', 'state', 'dice', 'combat']
  .map(name => fs.readFileSync(path.join(__dirname, '..', 'js', `${name}.js`), 'utf8'))
  .join('\n');

function resolveRoll(options = {}) {
  const {
    beastType = 'common', beastHp = 1, rolls = [6, 1], playerHp = 10,
    nature = null, attackRange = [1, 3], playerRange = [5, 6],
    equipment = {}, craftedItems = {}, roundCount = 0, ambushBonus = false,
    originalRoll = rolls, usedDetermination = false,
  } = options;
  const diceArea = { innerHTML: '' };
  const context = vm.createContext({
    document: { getElementById: id => id === 'combat-dice' ? diceArea : null },
    UI: {},
  });
  const { GameState, CombatUI } = vm.runInContext(`${source}\n({ GameState, CombatUI });`, context);
  GameState.reset();
  GameState.phase = 'combat';
  GameState.hp.current = playerHp;
  Object.assign(GameState.equipment, equipment);
  Object.assign(GameState.craftedItems, craftedItems);
  const combat = GameState.combat = {
    beastType, beastHp, maxHp: beastHp, region: 'halebeard', nature,
    beast: { attackRange: [...attackRange], playerRange: [...playerRange] },
    pendingRoll: [...rolls], originalPendingRoll: [...originalRoll],
    pendingRollType: 'combat', usedDeterminationThisRoll: usedDetermination,
    roundCount, ambushBonus, log: [],
  };
  let outcome;
  CombatUI.victory = () => { outcome = 'victory'; GameState.combat = null; GameState.phase = 'idle'; };
  CombatUI.defeat = () => { outcome = 'defeat'; GameState.combat = null; GameState.phase = 'game_over'; };
  CombatUI.renderCombat = () => { outcome = 'continue'; };
  CombatUI.resolveCombatRoll();
  return { state: GameState, combat, outcome };
}

test('a lethal player hit skips enemy damage in either dice order', () => {
  for (const rolls of [[6, 1], [1, 6]]) {
    const { state, combat, outcome } = resolveRoll({ rolls, playerHp: 1 });
    assert.equal(outcome, 'victory');
    assert.equal(state.hp.current, 1, 'A defeated enemy must not damage the player.');
    assert.equal(state.phase, 'idle');
    assert.equal(state.determination, 0);
    assert.match(combat.log.at(-1), /怪物造成 0 伤害$/);
    assert.equal(combat.pendingRoll, null);
  }
});

test('a lethal hit does not consume Crab Plate or Reviving Dose', () => {
  for (const crabPlate of [2, null]) {
    const { state, outcome } = resolveRoll({
      playerHp: 1, craftedItems: { crab_plate: crabPlate, reviving_dose: 1 },
    });
    assert.equal(outcome, 'victory');
    assert.equal(state.hp.current, 1);
    assert.equal(state.craftedItems.crab_plate, crabPlate);
    assert.equal(state.craftedItems.reviving_dose, 1);
  }
});

test('a defeated Cruel beast cannot inflict a grievous wound', () => {
  const { state, combat, outcome } = resolveRoll({
    beastType: 'terrible', nature: 'Cruel', rolls: [1, 6], playerHp: 1,
  });
  assert.equal(outcome, 'victory');
  assert.equal(state.hp.current, 1);
  assert.equal(state.hp.max, 10);
  assert.equal(combat.log.some(entry => entry.includes('造成了重伤')), false);
  assert.match(combat.log.at(-1), /巨兽造成 0 伤害$/);
});

test('critical bonus damage can kill before an overlapping enemy attack', () => {
  const { state, combat, outcome } = resolveRoll({
    beastHp: 3, rolls: [6, 6], attackRange: [1, 6],
  });
  assert.equal(outcome, 'victory');
  assert.equal(combat.beastHp, 0);
  assert.equal(state.hp.current, 10);
  assert.equal(state.determination, 1);
});

test('a determination-assisted Mastercraft critical kill skips enemy damage', () => {
  const { state, combat, outcome } = resolveRoll({
    beastHp: 3, rolls: [4, 4], originalRoll: [3, 4], attackRange: [1, 4],
    equipment: { disintegrator_lance: 'mastercraft' }, usedDetermination: true,
  });
  assert.equal(outcome, 'victory');
  assert.equal(combat.beastHp, 0);
  assert.equal(state.hp.current, 10);
  assert.equal(state.determination, 0);
});

test('a surviving enemy still attacks after player damage', () => {
  const { state, combat, outcome } = resolveRoll({ beastHp: 2 });
  assert.equal(outcome, 'continue');
  assert.equal(combat.beastHp, 1);
  assert.equal(state.hp.current, 9);
  const playerLog = combat.log.findIndex(entry => entry.includes('你造成了'));
  const enemyLog = combat.log.findIndex(entry => entry.includes('对你造成了'));
  assert.ok(playerLog >= 0 && enemyLog > playerLog);
});

test('a surviving Cruel beast still inflicts a grievous wound', () => {
  const { state, combat, outcome } = resolveRoll({
    beastType: 'terrible', beastHp: 2, nature: 'Cruel',
  });
  assert.equal(outcome, 'continue');
  assert.equal(combat.beastHp, 1);
  assert.equal(state.hp.max, 9);
  assert.equal(state.hp.current, 8);
  const playerLog = combat.log.findIndex(entry => entry.includes('你造成了'));
  const woundLog = combat.log.findIndex(entry => entry.includes('造成了重伤'));
  assert.ok(playerLog >= 0 && woundLog > playerLog);
});

test('a surviving enemy still consumes Crab Plate when it absorbs a hit', () => {
  const { state, outcome } = resolveRoll({ beastHp: 2, craftedItems: { crab_plate: 2 } });
  assert.equal(outcome, 'continue');
  assert.equal(state.hp.current, 10);
  assert.equal(state.craftedItems.crab_plate, 1);
});

test('a surviving enemy can still defeat the player', () => {
  const { state, combat, outcome } = resolveRoll({ beastHp: 2, playerHp: 1 });
  assert.equal(outcome, 'defeat');
  assert.equal(combat.beastHp, 1);
  assert.equal(state.hp.current, 0);
});

test('Cunning damage cancellation leaves the enemy alive and able to attack', () => {
  const { state, combat, outcome } = resolveRoll({ beastType: 'terrible', nature: 'Cunning' });
  assert.equal(outcome, 'continue');
  assert.equal(combat.beastHp, 1);
  assert.equal(state.hp.current, 9);
});

test('ambush cancels Cunning so a lethal hit prevents retaliation', () => {
  const { state, outcome } = resolveRoll({
    beastType: 'terrible', nature: 'Cunning', ambushBonus: true, roundCount: 2,
  });
  assert.equal(outcome, 'victory');
  assert.equal(state.hp.current, 10);
});

test('ambush still prevents attacks from a surviving enemy for two rounds', () => {
  for (const roundCount of [0, 1, 2]) {
    const { state, combat, outcome } = resolveRoll({ beastHp: 2, ambushBonus: true, roundCount });
    assert.equal(outcome, 'continue');
    assert.equal(combat.beastHp, 1);
    assert.equal(state.hp.current, roundCount < 2 ? 10 : 9);
  }
});
