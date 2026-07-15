// ============================================
// Utopia Engine: Beast Hunter - UI localization
// ============================================

const I18n = {
  language: localStorage.getItem('uebh-language') === 'en' ? 'en' : 'zh',
  observer: null,
  originals: new WeakMap(),

  exact: {
    '开始游戏': 'Begin Game',
    '游戏版本': 'Game Version',
    '代码实现：striker1945': 'Code by striker1945',
    '乌托邦引擎': 'UTOPIA ENGINE',
    '怪兽猎人': 'BEAST HUNTER',
    '决心': 'Resolve',
    '怀疑': "Villager's Doubt",
    '天数': 'Day',
    '石 / 银': 'Stone / Silver',
    '绳 / 磁石': 'Cord / Lodestone',
    '焦油 / 黄铁矿': 'Tar / Pyrite',
    '海尔比尔德峰': 'Halebeard Peak',
    '海岸洞穴': 'Coastal Caverns',
    '裂痕之地': 'The Scar',
    '峰巅巨人': 'Giant of the Peaks',
    '潮汐潜伏者': 'Dweller in the Tides',
    '燃烧者': 'The Burning Man',
    '完成的塔只阻挡对应来袭方向：东方塔挡东，南方塔挡南，西南塔挡西南。未完成或被摧毁的塔不能阻挡；鹰图腾塔免疫巨兽攻击。': 'A completed tower blocks only its matching approach: Eastern blocks East, Southern blocks South, and South Western blocks South West. Incomplete or destroyed towers cannot block; a tower with a Hawk Totem is immune to beast attacks.',
    '南方塔': 'Southern Tower',
    '西南塔': 'South Western Tower',
    '东方塔': 'Eastern Tower',
    '村庄长老审批': 'Village Elder Approval',
    '获得方式：每击败1只恐怖巨兽，或三座防御塔全部建成时，可获得1位未审批长老的奖励。': 'Earn one unclaimed elder reward whenever you defeat a Terrible Beast, or when all three defensive towers are completed.',
    '埃皮霍罗斯 Epiphoros': 'Epiphoros',
    '西波罗斯 Sipporos': 'Sipporos',
    '尼坎德罗斯 Nikandros': 'Nikandros',
    '恢复 2 HP': 'Restore 2 HP',
    '获得 2 决心点': 'Gain 2 Resolve',
    '恢复 1 个已使用物品': 'Restore 1 used item',
    '材料库存': 'Material Inventory',
    '村民小屋': 'The Village',
    '合成道具': 'Crafted Items',
    '普通材料': 'Common Materials',
    '稀有材料': 'Rare Materials',
    '怪物材料': 'Beast Materials',
    '搜索': 'Search',
    '建造': 'Build',
    '锻造': 'Forge',
    '合成': 'Craft',
    '休息': 'Rest',
    '物品栏': 'Inventory',
    '保存': 'Save',
    '加载': 'Load',
    '新游戏': 'New Game',
    '调试': 'Debug',
    '帮助': 'Help',
    '取消': 'Cancel',
    '确定': 'Confirm',
    '安装': 'Install',
    '使用': 'Use',
    '可用': 'Available',
    '已用': 'Used',
    '未造': 'Not crafted',
    '再造': 'Craft again',
    '结束搜索': 'End Search',
    '结束搜索日': 'End Search Day',
    '进入遭遇': 'Enter Encounter',
    '掷骰子': 'Roll Dice',
    '继续': 'Continue',
    '返回': 'Back',
    '关闭': 'Close',
    '胜利！': 'Victory!',
    '失败...': 'Defeat...',
    '游戏结束': 'Game Over',
    '计分': 'Scoring',
    '总分': 'Total Score',
    '基础': 'Base',
    '胜利奖励': 'Victory Bonus',
    '无当前事件': 'No active event',
    '巢穴已发现！': 'Lair Found',
    '巢穴未发现': 'Lair Not Found',
    '恐怖巨兽已击败': 'Terrible Beast defeated',
    '无掉落': 'No Drop',
    '巨兽来袭方向 / 阻挡塔': 'Beast Approach / Blocking Tower',
    '丰饶': 'Abundance',
    '搜索到材料时 +1': '+1 whenever materials are found',
    '突然清醒': 'Sudden Clarity',
    '攻击范围 +1': '+1 attack range',
    '恶劣天气': 'Foul Weather',
    '每天只能搜索 2 次': 'Only 2 searches per day',
    '疯狂': 'Madness',
    '所有怪物 +2 HP': 'All beasts gain +2 HP',
    '已摧毁 - 需要重建': 'Destroyed, rebuilding required',
    '✓ 完成': '✓ Complete',
    '🦅 安装鹰图腾': '🦅 Install Hawk Totem',
    '在塔上安装': 'Install on a tower',
    '战斗中使用': 'Use in combat',
    '濒死自动': 'Automatic at 0 HP',
    '被动': 'Passive',
    '该塔将免疫所有巨兽攻击。': 'This tower will become immune to all beast attacks.',
    '确定要开始新游戏吗？当前进度将丢失。': 'Start a new game? Your current progress will be lost.',
    '选择要执行的操作：搜索 / 建造 / 锻造 / 合成 / 休息': 'Choose an action: Search / Build / Forge / Craft / Rest',
    '石头': 'Stone', '绳索': 'Cord', '焦油': 'Tar', '白银': 'Silver', '磁石': 'Lodestone', '黄铁矿': 'Pyrite',
    '污血': 'Foul Blood', '兽皮': 'Beast Pelt', '油肉': 'Oily Meat', '龙烟': 'Dragon Smoke', '圣羽': 'Sacred Feathers', '噩梦甲壳': 'Nightmare Chitin', '巨魔灰': 'Troll Ash',
    '血饵': 'Blood Lure', '强力诱饵': 'Potent Bait', '厚外套': 'Heavy Coat', '火焰盒': 'Firebox', '蟹甲': 'Crab Plate', '复活药': 'Reviving Dose', '鹰图腾': 'Hawk Totem',
    '银甲': 'Silver Plate', '探矿杖': 'Dowsing Rod', '分解矛': 'Disintegrator Lance',
    '幸运符': 'Luck Charm', '平衡之刃': 'Balance Blade', '光学扰乱器': 'Optic Disruptor',
    '霜地精': 'Frost Gremlin', '冰熊': 'Ice Bear', '血狼群': 'Blood Wolves', '食马鹰': 'Horse Eater Hawk',
    '钩齿哥布林': 'Hooktooth Goblins', '碎壳巨魔': 'Shell-Cracker Troll', '陆鲨': 'Land Shark', '噩梦蟹': 'Nightmare Crab',
    '空洞鸟': 'Hollow Birds', '火花猎犬': 'Spark Hounds', '煤龙': 'Coal Dragon', '灰烬巨魔': 'Ash Troll',
  },

  phrases: [
    [/时间轨道/g, 'Time Track'],
    [/第\s*(\d+)\s*天/g, 'Day $1'],
    [/最后一天/g, 'Final day'],
    [/事件日/g, 'Event day'],
    [/巨兽袭击日/g, 'Beast attack day'],
    [/追踪\s*(\d+)\/3/g, 'Tracking $1/3'],
    [/搜索进度:\s*(\d+)\/(\d+)/g, 'Search progress: $1/$2'],
    [/进度:\s*(\d+)\/(\d+)\s*\((\d+)\s*个故障\)/g, 'Progress: $1/$2 ($3 faults)'],
    [/小屋\s*(\d+)/g, 'Hut $1'],
    [/已毁\s*(\d+)/g, 'Destroyed $1'],
    [/需要:\s*/g, 'Requires: '],
    [/(\d+)次/g, '$1 uses'],
    [/搜索结果\s*-\s*/g, 'Search Result - '],
    [/搜索完成\s*-\s*/g, 'Search Complete - '],
    [/搜索总和:/g, 'Search total:'],
    [/搜索结果:/g, 'Search result:'],
    [/获得\s*(\d+)\s*/g, 'Gain $1 '],
    [/遭遇了\s*/g, 'Encountered '],
    [/发现了\s*/g, 'Discovered '],
    [/的巢穴/g, "'s lair"],
    [/决心点/g, 'Resolve'],
    [/继续搜索/g, 'Continue searching '],
    [/花费1次搜索挑战/g, 'Spend 1 search to challenge '],
    [/快速搜索/g, 'Quick Search'],
    [/怪物攻击/g, 'Beast attack'],
    [/你的攻击/g, 'Your attack'],
    [/温顺/g, 'Cowed'], [/残忍/g, 'Cruel'], [/狡猾/g, 'Cunning'],
  ],

  translateString(value) {
    if (!value || this.language === 'zh') return value;
    const trimmed = value.trim();
    let translated = this.exact[trimmed] || trimmed;
    if (translated === trimmed) {
      for (const [pattern, replacement] of this.phrases) translated = translated.replace(pattern, replacement);
      for (const [zh, en] of Object.entries(this.exact).sort((a, b) => b[0].length - a[0].length)) {
        translated = translated.replaceAll(zh, en);
      }
    }
    return value.replace(trimmed, translated);
  },

  translateNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (!node.nodeValue.trim() || ['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) return;
      if (!this.originals.has(node)) this.originals.set(node, node.nodeValue);
      const original = this.originals.get(node);
      const next = this.language === 'en' ? this.translateString(original) : original;
      if (node.nodeValue !== next) node.nodeValue = next;
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    for (const attr of ['title', 'aria-label', 'alt']) {
      if (!node.hasAttribute(attr)) continue;
      const key = `data-i18n-${attr}`;
      if (!node.hasAttribute(key)) node.setAttribute(key, node.getAttribute(attr));
      const original = node.getAttribute(key);
      node.setAttribute(attr, this.language === 'en' ? this.translateString(original) : original);
    }
    node.childNodes.forEach(child => this.translateNode(child));
  },

  apply(root = document.documentElement) {
    document.documentElement.lang = this.language === 'en' ? 'en' : 'zh-CN';
    this.translateNode(root);
    const toggle = document.getElementById('language-toggle');
    if (toggle) {
      toggle.textContent = this.language === 'en' ? '中文' : 'EN';
      toggle.setAttribute('aria-label', this.language === 'en' ? '切换到中文' : 'Switch to English');
      toggle.title = this.language === 'en' ? '切换到中文' : 'Switch to English';
    }
  },

  setLanguage(language) {
    this.language = language === 'en' ? 'en' : 'zh';
    localStorage.setItem('uebh-language', this.language);
    document.title = this.language === 'en'
      ? 'Utopia Engine: Beast Hunter'
      : 'Utopia Engine: Beast Hunter - 乌托邦引擎：怪兽猎人';
    if (typeof UI !== 'undefined' && document.getElementById('game-interface') && !document.getElementById('game-interface').hidden) UI.render();
    this.apply();
  },

  toggle() {
    this.setLanguage(this.language === 'zh' ? 'en' : 'zh');
  },

  init() {
    document.getElementById('language-toggle')?.addEventListener('click', () => this.toggle());
    this.apply();
    this.observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach(node => this.translateNode(node));
      }
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
  },
};
