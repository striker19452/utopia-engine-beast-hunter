const fs = require('fs');
const path = require('path');

global.localStorage = { getItem: () => 'en', setItem: () => {} };
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') + '; globalThis.__gameData = GAME_DATA;');
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n.js'), 'utf8') + '; globalThis.__i18n = I18n;');
global.I18n = global.__i18n;
eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'i18n-en.js'), 'utf8'));

const values = [
  ...Object.values(I18n.exact),
  ...I18n.phrases.map(([, replacement]) => replacement).filter(value => typeof value === 'string'),
];
const banned = [
  ['Resolve used as resource name', /\b(?:Gain|gains|gained|spend|spent|used|using|grants?|no|\+1|\d+)\s+Resolve\b|\bResolve\s+\d+\b/i],
  ['refinement instead of rulebook term', /\brefinement (?:grid|value)\b/i],
  ['repair instead of patch the fault', /\b(?:repair(?:ing)?|repair material)\b/i],
  ['unofficial inventory heading', /\bMaterial Inventory\b/i],
  ['unofficial approval heading', /\bVillage Elder Approval\b/i],
];

const failures = [];
for (const value of values) {
  for (const [label, pattern] of banned) {
    if (pattern.test(value)) failures.push(`${label}: ${value}`);
  }
}

const required = Object.values(I18n.officialTerms);
const actualNames = new Set([
  ...Object.values(__gameData.regions).flatMap(region => [
    region.name,
    region.terribleBeast.name,
    ...region.commonBeasts.map(beast => beast.name),
  ]),
  ...__gameData.craftingRecipes.map(item => item.name),
  ...__gameData.equipment.map(item => item.name),
  ...__gameData.toolbeltItems.map(item => item.name),
  ...__gameData.events.map(item => item.name),
]);
const officialNames = [
  'Halebeard Peak', 'Coastal Caverns', 'The Scar',
  'Giant of the Peaks', 'Dweller in the Tides', 'The Burning Man',
  'Frost Gremlin', 'Ice Bear', 'Blood Wolves', 'Horse Eater Hawk',
  'Hooktooth Goblins', 'Shell-Cracker Troll', 'Land Shark', 'Nightmare Crab',
  'Hollow Birds', 'Spark Hounds', 'Coal Dragon', 'Ash Troll',
  'Blood Lure', 'Potent Bait', 'Heavy Coat', 'Firebox', 'Crab Plate', 'Reviving Dose', 'Hawk Totem',
  'Silver Plate', 'Dowsing Rod', 'Disintegrator Lance',
  'Luck Charm', 'Balance Blade', 'Optic Disruptor',
  'Abundance', 'Sudden Clarity', 'Foul Weather', 'Madness',
];
for (const name of officialNames) {
  if (!actualNames.has(name)) failures.push(`official game name missing or changed: ${name}`);
}
const officialMaterialNames = {
  石头: 'Stone', 绳索: 'Cord', 焦油: 'Tar',
  白银: 'Silver', 磁石: 'Lodestone', 黄铁矿: 'Pyrite',
  污血: 'Foul Blood', 兽皮: 'Beast Pelt', 油肉: 'Oily Meat',
  龙烟: 'Dragon Smoke', 圣羽: 'Sacred Feathers', 噩梦甲壳: 'Nightmare Chitin', 巨魔灰: 'Troll Ash',
};
for (const [source, official] of Object.entries(officialMaterialNames)) {
  if (I18n.exact[source] !== official) failures.push(`material term mismatch: ${source} should be ${official}`);
}
const officialLabels = {
  决心: 'Determination',
  怀疑: "Villager's Doubt",
  村庄长老审批: "Elder's Approval",
  材料库存: 'Stores',
  村民小屋: 'The Village',
  合成道具: 'Crafted Items',
  巢穴已发现: 'Lair Found',
  遭遇等级表: 'Encounter Chart',
  等级怪物速查: 'Common Beasts',
  恐怖巨兽速查: 'Terrible Beasts',
  精炼格: 'Refining Field',
  精工: 'Mastercraft',
  标准: 'Standard',
};
for (const [source, official] of Object.entries(officialLabels)) {
  if (I18n.exact[source] !== official) failures.push(`official label mismatch: ${source} should be ${official}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`Official terminology audit: OK (${required.length} canonical terms, ${officialNames.length} game names)`);
