// ============================================
// Utopia Engine: Beast Hunter - Game Data
// ============================================

const GAME_DATA = {
  materialLimit: 4,
  hutCount: 9,

  // === Regions ===
  regions: {
    halebeard: {
      name: 'Halebeard Peak',
      nameZh: '海尔比尔德峰',
      commonMaterial: 'stone',
      rareMaterial: 'silver',
      approach: { 1: 'E', 2: 'E', 3: 'S', 4: 'S', 5: 'SW', 6: 'SW' },
      terribleBeast: {
        name: 'Giant of the Peaks',
        nameZh: '峰巅巨人',
        image: 'assets/monsters/giant-of-the-peaks.png',
        hp: 6,
        attackRange: [1, 3],
        playerAttackRange: [6, 6],
        nature: { 1: 'Cowed', 2: 'Cruel', 3: 'Cruel', 4: 'Cruel', 5: 'Cunning', 6: 'Cunning' },
      },
      commonBeasts: [
        { level: 1, name: 'Frost Gremlin', nameZh: '霜地精', image: 'assets/monsters/frost-gremlin.png', hp: 2, attackRange: [1, 1], playerRange: [5, 6], material: 'foul_blood' },
        { level: 2, name: 'Ice Bear', nameZh: '冰熊', image: 'assets/monsters/ice-bear.png', hp: 2, attackRange: [1, 2], playerRange: [5, 6], material: 'beast_pelt' },
        { level: 3, name: 'Blood Wolves', nameZh: '血狼群', image: 'assets/monsters/blood-wolves.png', hp: 3, attackRange: [1, 2], playerRange: [5, 6], material: 'beast_pelt' },
        { level: 4, name: 'Horse Eater Hawk', nameZh: '食马鹰', image: 'assets/monsters/horse-eater-hawk.png', hp: 4, attackRange: [1, 2], playerRange: [6, 6], material: 'sacred_feathers' },
      ],
    },
    coastal: {
      name: 'Coastal Caverns',
      nameZh: '海岸洞穴',
      commonMaterial: 'cord',
      rareMaterial: 'lodestone',
      approach: { 1: 'E', 2: 'E', 3: 'E', 4: 'E', 5: 'S', 6: 'S' },
      terribleBeast: {
        name: 'Dweller in the Tides',
        nameZh: '潮汐潜伏者',
        image: 'assets/monsters/dweller-in-the-tides.png',
        hp: 6,
        attackRange: [1, 3],
        playerAttackRange: [6, 6],
        nature: { 1: 'Cowed', 2: 'Cruel', 3: 'Cruel', 4: 'Cruel', 5: 'Cunning', 6: 'Cunning' },
      },
      commonBeasts: [
        { level: 1, name: 'Hooktooth Goblins', nameZh: '钩齿哥布林', image: 'assets/monsters/hooktooth-goblins.png', hp: 2, attackRange: [1, 1], playerRange: [5, 6], material: 'foul_blood' },
        { level: 2, name: 'Shell-Cracker Troll', nameZh: '碎壳巨魔', image: 'assets/monsters/shell-cracker-troll.png', hp: 2, attackRange: [1, 2], playerRange: [5, 6], material: 'oily_meat' },
        { level: 3, name: 'Land Shark', nameZh: '陆鲨', image: 'assets/monsters/land-shark.png', hp: 3, attackRange: [1, 2], playerRange: [5, 6], material: 'oily_meat' },
        { level: 4, name: 'Nightmare Crab', nameZh: '噩梦蟹', image: 'assets/monsters/nightmare-crab.png', hp: 3, attackRange: [1, 3], playerRange: [6, 6], material: 'nightmare_chitin' },
      ],
    },
    scar: {
      name: 'The Scar',
      nameZh: '裂痕之地',
      commonMaterial: 'tar',
      rareMaterial: 'pyrite',
      approach: { 1: 'E', 2: 'S', 3: 'S', 4: 'SW', 5: 'SW', 6: 'SW' },
      terribleBeast: {
        name: 'The Burning Man',
        nameZh: '燃烧者',
        image: 'assets/monsters/the-burning-man.png',
        hp: 6,
        attackRange: [1, 3],
        playerAttackRange: [6, 6],
        nature: { 1: 'Cowed', 2: 'Cruel', 3: 'Cruel', 4: 'Cruel', 5: 'Cunning', 6: 'Cunning' },
      },
      commonBeasts: [
        { level: 1, name: 'Hollow Birds', nameZh: '空洞鸟', image: 'assets/monsters/hollow-birds.png', hp: 2, attackRange: [1, 1], playerRange: [4, 6], material: 'foul_blood' },
        { level: 2, name: 'Spark Hounds', nameZh: '火花猎犬', image: 'assets/monsters/spark-hounds.png', hp: 3, attackRange: [1, 2], playerRange: [4, 6], material: 'dragon_smoke' },
        { level: 3, name: 'Coal Dragon', nameZh: '煤龙', image: 'assets/monsters/coal-dragon.png', hp: 3, attackRange: [1, 2], playerRange: [5, 6], material: 'dragon_smoke' },
        { level: 4, name: 'Ash Troll', nameZh: '灰烬巨魔', image: 'assets/monsters/ash-troll.png', hp: 4, attackRange: [1, 2], playerRange: [6, 6], material: 'troll_ash' },
      ],
    },
  },

  // === Search Result Table ===
  // Result = top 3-digit number - bottom 3-digit number
  searchResults: {
    positive: [
      { min: 100, max: 555, result: 'encounter', desc: '遭遇怪物' },
      { min: 11, max: 99, result: 'track_beast', desc: '追踪巨兽 + 1普通材料' },
      { min: 1, max: 10, result: 'lair_rare', desc: '找到巢穴 + 1稀有或2普通材料' },
      { min: 0, max: 0, result: 'lair_ambush', desc: '找到巢穴 + 伏击加成' },
    ],
    negative: [
      { min: -555, max: -1, result: 'encounter', desc: '遭遇怪物' },
    ],
  },

  // === Encounter Level Table ===
  encounterLevels: {
    positive: [
      { min: 100, max: 199, level: 'random' },
      { min: 200, max: 299, level: 1 },
      { min: 300, max: 399, level: 2 },
      { min: 400, max: 499, level: 3 },
      { min: 500, max: 555, level: 4 },
    ],
    negative: [
      { min: -100, max: -1, level: 'random' },
      { min: -200, max: -101, level: 1 },
      { min: -300, max: -201, level: 2 },
      { min: -400, max: -301, level: 3 },
      { min: -555, max: -401, level: 4 },
    ],
  },

  // === Materials ===
  materials: {
    common: ['stone', 'cord', 'tar'],
    rare: ['silver', 'lodestone', 'pyrite'],
    beast: ['foul_blood', 'beast_pelt', 'oily_meat', 'dragon_smoke', 'sacred_feathers', 'nightmare_chitin', 'troll_ash'],
  },

  materialNames: {
    stone: '石头', cord: '绳索', tar: '焦油',
    silver: '白银', lodestone: '磁石', pyrite: '黄铁矿',
    foul_blood: '污血', beast_pelt: '兽皮', oily_meat: '油肉',
    dragon_smoke: '龙烟', sacred_feathers: '圣羽', nightmare_chitin: '噩梦甲壳', troll_ash: '巨魔灰',
  },

  // === Crafting Recipes ===
  craftingRecipes: [
    { name: 'Blood Lure', nameZh: '血饵', requires: { foul_blood: 1, stone: 1 }, effect: '搜索前使用，立即遭遇该区域任意普通怪物' },
    { name: 'Potent Bait', nameZh: '强力诱饵', requires: { oily_meat: 1, cord: 1 }, effect: '搜索前使用，以1次搜索遭遇该区域恐怖巨兽' },
    { name: 'Heavy Coat', nameZh: '厚外套', requires: { beast_pelt: 1, cord: 1 }, effect: '恶劣天气下可搜索3次（无限使用）' },
    { name: 'Firebox', nameZh: '火焰盒', requires: { dragon_smoke: 1, tar: 1 }, effect: '战斗中使用，立即造成2点伤害' },
    { name: 'Crab Plate', nameZh: '蟹甲', requires: { nightmare_chitin: 1, stone: 1 }, effect: '合成后自动装备；受到伤害时吸收最多2点，吸收2次后碎裂' },
    { name: 'Reviving Dose', nameZh: '复活药', requires: { troll_ash: 1, cord: 1 }, effect: 'HP降为0时使用，恢复3HP' },
    { name: 'Hawk Totem', nameZh: '鹰图腾', requires: { sacred_feathers: 1, tar: 1 }, effect: '安装到已完成的塔，该塔免疫巨兽攻击' },
  ],

  // === Equipment ===
  equipment: [
    {
      name: 'Silver Plate', nameZh: '银甲', requires: 'silver',
      standard: '所有怪物攻击范围 -1（最低为1）',
      mastercraft: '同标准 + 任何攻击最多受1点伤害',
    },
    {
      name: 'Dowsing Rod', nameZh: '探矿杖', requires: 'lodestone',
      standard: '搜索时获得稀有材料替代普通材料',
      mastercraft: '同标准 + 找到普通或稀有材料时额外获得1个稀有材料',
    },
    {
      name: 'Disintegrator Lance', nameZh: '分解矛', requires: 'pyrite',
      standard: '你的攻击范围 +1',
      mastercraft: '同标准 + 攻击范围内两个相同数 = 暴击',
    },
  ],

  // === Toolbelt Items ===
  toolbeltItems: [
    { name: 'Luck Charm', nameZh: '幸运符', effect: '掷骰后在骰子旁使用：重掷全部骰子（同一次掷骰最多3次），必须接受最终结果' },
    { name: 'Balance Blade', nameZh: '平衡之刃', effect: '战斗中点“使用物品”：立即造成1点伤害' },
    { name: 'Optic Disruptor', nameZh: '光学扰乱器', effect: '战斗中点“使用物品”：立即逃离战斗' },
  ],

  // === Events ===
  events: [
    { name: 'Abundance', nameZh: '丰饶', effect: '搜索到材料时+1' },
    { name: 'Sudden Clarity', nameZh: '突然清醒', effect: '该区域你的攻击范围+1' },
    { name: 'Foul Weather', nameZh: '恶劣天气', effect: '该区域每天只能搜索2次' },
    { name: 'Madness', nameZh: '疯狂', effect: '该区域所有怪物+2HP' },
  ],

  // === Elders ===
  elders: [
    { name: 'Epiphoros', nameZh: '埃皮霍罗斯', reward: '恢复2HP', rewardType: 'heal', rewardValue: 2 },
    { name: 'Sipporos', nameZh: '西波罗斯', reward: '获得2决心点', rewardType: 'determination', rewardValue: 2 },
    { name: 'Nikandros', nameZh: '尼坎德罗斯', reward: '恢复1个已使用物品', rewardType: 'recharge', rewardValue: 1 },
  ],

  // === Tower Damage Chart ===
  towerDamage: [
    { min: 1, max: 1, damage: 0, desc: '无伤害' },
    { min: 2, max: 2, damage: 1, desc: '1点伤害' },
    { min: 3, max: 5, damage: 2, desc: '2点伤害' },
    { min: 6, max: 99, damage: 'destroy', desc: '塔被摧毁' },
  ],

  // === Tower construction grid shapes ===
  // 1 = buildable square, 0 = blank space outside the tower shape.
  towerShapes: {
    south: [
      '0110',
      '0110',
      '0110',
      '0111',
      '1111',
      '1111',
      '1111',
    ],
    west: [
      '011',
      '011',
      '111',
      '111',
      '101',
      '101',
      '111',
      '111',
      '111',
    ],
    east: [
      '00100',
      '01100',
      '11100',
      '11100',
      '11110',
      '11110',
      '10110',
      '10110',
    ],
  },

  // === Scoring ===
  scoring: {
    beastDefeated: 50,
    towerStanding: 15,
    mastercraftForged: 10,
    standardForged: 5,
    itemCrafted: 3,
    bonusNoDestroyedHuts: 50,
    bonusDayRemaining: 5,
    bonusHpRemaining: 2,
    bonusDoubtRemaining: 1,
  },

  // === Time Track ===
  timeTrack: [
    { day: 1, event: 'E' },
    { day: 2, event: null },
    { day: 3, event: '!' },
    { day: 4, event: 'E' },
    { day: 5, event: null },
    { day: 6, event: '!' },
    { day: 7, event: 'E' },
    { day: 8, event: null },
    { day: 9, event: '!' },
    { day: 10, event: 'E' },
    { day: 11, event: null },
    { day: 12, event: '!' },
    { day: 13, event: 'E' },
    { day: 14, event: null, skull: true },
  ],

  // === Doubt rules ===
  doubtRules: {
    default: 1,  // +1 base per day + destroyed huts
    rested: 1,
    built: 0,
    killedBeast: 0,
    hutDestroyedPenalty: 2, // per destroyed hut
  },
};
