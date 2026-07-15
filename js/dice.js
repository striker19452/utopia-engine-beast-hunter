// ============================================
// Utopia Engine: Beast Hunter - Dice System
// ============================================

const Dice = {
  /**
   * Roll n six-sided dice
   * @param {number} n - number of dice
   * @returns {number[]} array of results (1-6)
   */
  roll(n = 1) {
    const results = [];
    for (let i = 0; i < n; i++) {
      results.push(Math.floor(Math.random() * 6) + 1);
    }
    return results;
  },

  /**
   * Sum of dice results
   */
  sum(results) {
    return results.reduce((a, b) => a + b, 0);
  },

  /**
   * Check if result is doubles (for critical hit)
   */
  isDoubles(results) {
    return results.length >= 2 && results[0] === results[1];
  },

  /**
   * Apply determination point modifier to a die
   * @param {number} value - current die value
   * @param {number} modifier - +1 or -1
   * @returns {number|null} new value or null if invalid
   */
  modifyDie(value, modifier) {
    const newVal = value + modifier;
    if (newVal < 1 || newVal > 6) return null;
    return newVal;
  },

  /**
   * Calculate search box result from top and bottom rows
   * @param {number[]} top - array of 3 values (hundreds, tens, ones)
   * @param {number[]} bottom - array of 3 values (hundreds, tens, ones)
   * @returns {number|null} result (top - bottom) or null if not all filled
   */
  searchBoxResult(top, bottom) {
    if (top.some(v => v === null) || bottom.some(v => v === null)) return null;
    const topNum = top[0] * 100 + top[1] * 10 + top[2];
    const bottomNum = bottom[0] * 100 + bottom[1] * 10 + bottom[2];
    return topNum - bottomNum;
  },

  /**
   * Get search result from total
   * @param {number} total - search box total
   * @returns {{ type: string, desc: string }}
   */
  getSearchResult(total) {
    if (total >= 0) {
      for (const entry of GAME_DATA.searchResults.positive) {
        if (total >= entry.min && total <= entry.max) {
          return { ...entry, sign: 'positive' };
        }
      }
      return { result: 'nothing', desc: '无收获', sign: 'positive' };
    } else {
      for (const entry of GAME_DATA.searchResults.negative) {
        if (total >= entry.min && total <= entry.max) {
          return { ...entry, sign: 'negative' };
        }
      }
      return { result: 'nothing', desc: '无收获', sign: 'negative' };
    }
  },

  /**
   * Get encounter level from search total
   */
  getEncounterLevel(total) {
    const table = total >= 0 ? GAME_DATA.encounterLevels.positive : GAME_DATA.encounterLevels.negative;
    for (const entry of table) {
      if (total >= entry.min && total <= entry.max) {
        return entry.level;
      }
    }
    return 1;
  },

  /**
   * Roll for events (E day) - 1 die per event
   */
  rollEvents() {
    return this.roll(4); // 4 events
  },

  /**
   * Map event die to region
   */
  dieToRegion(value) {
    if (value <= 2) return 'halebeard';
    if (value <= 4) return 'coastal';
    return 'scar';
  },

  /**
   * Roll for beast attack direction
   */
  rollDirection(region) {
    const die = this.roll(1)[0];
    return GAME_DATA.regions[region].approach[die];
  },

  /**
   * Roll for tower damage
   */
  rollTowerDamage() {
    const die = this.roll(1)[0];
    for (const entry of GAME_DATA.towerDamage) {
      if (die >= entry.min && die <= entry.max) {
        return { roll: die, ...entry };
      }
    }
    return { roll: die, damage: 0, desc: '无伤害' };
  },
};

const DeterminationUI = {
  render(rolls, handlerName, used = false, luckHandlerName = null, luckRerolls = 0) {
    const dp = GameState.determination;
    const canUseLuck = luckHandlerName && (!GameState.toolbelt.luck_charm || luckRerolls > 0) && luckRerolls < 3;
    const diceHtml = rolls.map((r, i) => `
      <div class="dp-die-control">
        <div class="die">${r}</div>
        <div class="dp-mod-controls">
          <button class="mod-btn" ${dp <= 0 || r <= 1 ? 'disabled' : ''} onclick="${handlerName}(${i}, -1)">-</button>
          <button class="mod-btn" ${dp <= 0 || r >= 6 ? 'disabled' : ''} onclick="${handlerName}(${i}, 1)">+</button>
        </div>
      </div>
    `).join('');

    return `
      <div class="dp-roll-panel">
        ${diceHtml}
        <div class="dp-roll-note">
          决心 ${dp}：掷骰后可花1点将单个骰子调整 ±1，不能低于1或高于6。
          ${used ? '<br>本次掷骰已使用过决心。' : ''}
          ${luckHandlerName ? `<br>幸运符：重掷全部骰子，最多3次（本次 ${luckRerolls}/3）。` : ''}
        </div>
        ${luckHandlerName ? `
          <button class="btn" ${canUseLuck ? '' : 'disabled'} onclick="${luckHandlerName}()">
            使用幸运符重掷全部骰子
          </button>
        ` : ''}
      </div>
    `;
  },

  modifyRoll(rolls, index, modifier) {
    if (!rolls || !Number.isInteger(index)) return false;
    const next = Dice.modifyDie(rolls[index], modifier);
    if (next === null) return false;
    if (!GameState.spendDetermination(1)) return false;
    rolls[index] = next;
    UI.renderTopBar();
    return true;
  },
};
