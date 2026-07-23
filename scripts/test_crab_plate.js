const fs = require('fs');
const path = require('path');

global.GameState = {
  combat: null,
  craftedItems: { crab_plate: 2 },
};
global.GAME_DATA = {};
global.UI = {};
global.Game = {};
global.BuildUI = {};
global.SearchUI = {};

eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'combat.js'), 'utf8') + '; globalThis.__combatUI = CombatUI;');

const combat = { log: [] };

const noHit = __combatUI.applyCrabPlate(0, combat);
if (noHit.damage !== 0 || GameState.craftedItems.crab_plate !== 2) {
  throw new Error('Crab Plate consumed a use without absorbing damage.');
}

const firstHit = __combatUI.applyCrabPlate(3, combat);
if (firstHit.damage !== 1 || firstHit.absorbed !== 2 || firstHit.usesRemaining !== 1 || firstHit.shattered) {
  throw new Error('Crab Plate did not absorb the first hit correctly.');
}
if (GameState.craftedItems.crab_plate !== 1) {
  throw new Error('Crab Plate did not retain exactly one use after the first absorption.');
}

const secondHit = __combatUI.applyCrabPlate(1, combat);
if (secondHit.damage !== 0 || secondHit.absorbed !== 1 || secondHit.usesRemaining !== 0 || !secondHit.shattered) {
  throw new Error('Crab Plate did not absorb the second hit and shatter.');
}
if (GameState.craftedItems.crab_plate !== null) {
  throw new Error('Shattered Crab Plate was not removed from inventory.');
}

const afterShatter = __combatUI.applyCrabPlate(2, combat);
if (afterShatter.damage !== 2 || afterShatter.absorbed !== 0) {
  throw new Error('Crab Plate continued absorbing after shattering.');
}

if (!combat.log.some(entry => entry.includes('剩余1次')) || !combat.log.some(entry => entry.includes('随后碎裂'))) {
  throw new Error('Crab Plate feedback did not report remaining use and shattering.');
}

console.log('Crab Plate test: OK (automatic absorb twice, then shatter)');
