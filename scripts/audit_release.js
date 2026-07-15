const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const version = read('js/version.js');
const state = read('js/state.js');
const combat = read('js/combat.js');
const search = read('js/search.js');
const html = read('index.html');
const main = read('js/main.js');
const data = read('js/data.js');
eval(data + '; globalThis.__releaseData = GAME_DATA;');

const checks = [
  ['central version number', /number:\s*'\d+\.\d+\.\d+'/.test(version)],
  ['save schema metadata', /saveSchema:\s*GAME_VERSION\.saveSchema/.test(state)],
  ['version rendered in both surfaces', (html.match(/data-game-version/g) || []).length === 2],
  ['common-only material reward', /combat\.beastType !== 'terrible' && Boolean\(beast\.material\)/.test(combat)],
  ['terrible beast search card says no drop', /const terribleBeastCell[\s\S]*?<span>无掉落<\/span>/.test(search)],
  ['rules explain no terrible beast drop', (main.match(/恐怖巨兽不掉落材料/g) || []).length >= 2],
  ['Terrible Beast data has no material field', Object.values(__releaseData.regions).every(region => !Object.hasOwn(region.terribleBeast, 'material'))],
];

const failed = checks.filter(([, passed]) => !passed).map(([label]) => label);
if (failed.length) {
  console.error(`Release audit failed: ${failed.join(', ')}`);
  process.exit(1);
}
console.log(`Release audit: OK (${checks.length} checks)`);
