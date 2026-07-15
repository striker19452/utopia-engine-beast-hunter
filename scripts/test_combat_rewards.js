const fs = require('fs');
const path = require('path');

let materialCalls = 0;
global.GameState = {
  combat: null,
  search: null,
  phase: 'combat',
  elders: { epiphoros: false, sipporos: false, nikandros: false },
  beastsDefeated: { halebeard: false },
  beastWounds: { halebeard: 0 },
  commonBeastWounds: {},
  addMaterial: () => { materialCalls += 1; return 1; },
  addDetermination: () => {},
  advanceDay: () => {},
};
global.GAME_DATA = { materialNames: { sacred_feathers: '圣羽', foul_blood: '污血' } };
global.UI = { showModal: () => {} };
global.Game = {};
global.BuildUI = {};
global.SearchUI = {};

eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'combat.js'), 'utf8') + '; globalThis.__combatUI = CombatUI;');

GameState.combat = {
  beastType: 'terrible',
  beast: { name: 'Giant of the Peaks', nameZh: '峰巅巨人', material: 'sacred_feathers' },
  region: 'halebeard',
};
__combatUI.victory();
if (materialCalls !== 0) throw new Error('Terrible Beast incorrectly granted material.');

GameState.combat = {
  beastType: 'common',
  beast: { name: 'Frost Gremlin', nameZh: '霜地精', material: 'foul_blood' },
  region: 'halebeard',
};
__combatUI.victory();
if (materialCalls !== 1) throw new Error('Common beast did not grant material.');

console.log('Combat reward test: OK (Terrible Beast 0, common beast 1)');
