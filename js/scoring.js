// ============================================
// Utopia Engine: Beast Hunter - Scoring
// ============================================

const Scoring = {
  calculate() {
    return this.getTotal();
  },

  getBreakdown(options = {}) {
    const includeZero = Boolean(options.includeZero);
    const s = GAME_DATA.scoring;
    const items = [];
    const won = GameState.checkWinCondition();

    const push = (item) => {
      if (includeZero || item.points !== 0) items.push(item);
    };

    // Beasts defeated
    for (const [key, defeated] of Object.entries(GameState.beastsDefeated)) {
      push({
        section: '基础',
        label: `击败 ${GAME_DATA.regions[key].terribleBeast.nameZh}`,
        detail: defeated ? '已击败' : '未击败',
        points: defeated ? s.beastDefeated : 0,
      });
    }

    // Towers standing
    const towerNames = { south: '南方塔', west: '西南塔', east: '东方塔' };
    for (const [key, tower] of Object.entries(GameState.towers)) {
      push({
        section: '基础',
        label: `${towerNames[key] || key}仍矗立`,
        detail: tower.complete ? '完成/未被摧毁' : '未完成或已摧毁',
        points: tower.complete ? s.towerStanding : 0,
      });
    }

    // Equipment forged
    for (const [key, level] of Object.entries(GameState.equipment)) {
      const eq = GAME_DATA.equipment.find(item => item.name.toLowerCase().replace(/ /g, '_') === key);
      if (level === 'mastercraft') {
        push({ section: '基础', label: `${eq?.nameZh || key} - 精工`, detail: '精工装备', points: s.mastercraftForged });
      } else if (level === 'standard') {
        push({ section: '基础', label: `${eq?.nameZh || key} - 标准`, detail: '标准装备', points: s.standardForged });
      } else {
        push({ section: '基础', label: `${eq?.nameZh || key} - 未锻造`, detail: '未锻造', points: 0 });
      }
    }

    // Items crafted
    for (const recipe of GAME_DATA.craftingRecipes) {
      const key = recipe.name.toLowerCase().replace(/ /g, '_');
      const crafted = Boolean(GameState.craftedItemHistory?.[key]);
      push({
        section: '基础',
        label: `合成 ${recipe.nameZh}`,
        detail: crafted ? '曾打造' : '未打造',
        points: crafted ? s.itemCrafted : 0,
      });
    }

    // Win bonuses
    if (won) {
      const intactHuts = GameState.huts.filter(h => h).length;
      const hutCount = GAME_DATA.hutCount || 9;
      push({
        section: '胜利奖励',
        label: '无小屋被毁',
        detail: `${intactHuts}/${hutCount} 间完好`,
        points: intactHuts === hutCount ? s.bonusNoDestroyedHuts : 0,
        bonus: true,
      });

      const daysLeft = 14 - GameState.daysCrossed.length;
      push({
        section: '胜利奖励',
        label: `剩余天数 x${Math.max(0, daysLeft)}`,
        detail: `${s.bonusDayRemaining} 分/天`,
        points: Math.max(0, daysLeft) * s.bonusDayRemaining,
        bonus: true,
      });

      push({
        section: '胜利奖励',
        label: `剩余HP x${Math.max(0, GameState.hp.current)}`,
        detail: `${s.bonusHpRemaining} 分/HP`,
        points: Math.max(0, GameState.hp.current) * s.bonusHpRemaining,
        bonus: true,
      });

      const doubtLeft = GameState.doubt.max - GameState.doubt.current;
      push({
        section: '胜利奖励',
        label: `剩余怀疑 x${Math.max(0, doubtLeft)}`,
        detail: `${s.bonusDoubtRemaining} 分/格`,
        points: Math.max(0, doubtLeft) * s.bonusDoubtRemaining,
        bonus: true,
      });
    } else if (includeZero) {
      items.push({
        section: '胜利奖励',
        label: '胜利奖励',
        detail: '未胜利，不计入无小屋、剩余天数、HP、怀疑奖励',
        points: 0,
        bonus: true,
      });
    }

    return items;
  },

  getTotal() {
    return this.getBreakdown().reduce((sum, item) => sum + item.points, 0);
  },
};
