// ============================================
// Utopia Engine: Beast Hunter - Search UI
// ============================================

const SearchUI = {
  rollRandomEncounterLevel() {
    const roll = Dice.roll(1)[0];
    if (roll <= 2) return 1;
    if (roll <= 4) return 2;
    if (roll === 5) return 3;
    return 4;
  },

  start(region) {
    const regionData = GAME_DATA.regions[region];
    const search = GameState.search;
    if (!search) return;

    const boxIndex = this.firstAvailableBox(region);
    if (boxIndex === -1 || search.boxesCompleted >= search.maxSearches) {
      this.endSearchDay();
      return;
    }

    search.region = region;
    search.boxIndex = boxIndex;
    search.rollCount = 0;

    let html = `
      <div class="modal-title">搜索 - ${regionData.nameZh}</div>
      <div class="search-panel">
        <div class="search-instructions">
          ${this.renderSearchInstructions()}
        </div>
        ${this.renderSearchReference()}
        <div class="dice-area" id="search-dice">
          <button class="btn primary" onclick="SearchUI.rollDice()">🎲 掷骰子</button>
        </div>
        <div id="search-dice-result"></div>
        <div id="search-placement" style="margin-top:16px;"></div>
      </div>
      <div class="confirm-actions">
        <button class="btn" onclick="SearchUI.endSearchDay()">结束搜索</button>
      </div>
    `;
    UI.showModal(html);
  },

  renderSearchInstructions(statusText = '') {
    const search = GameState.search;
    const progress = search
      ? `搜索格 ${search.boxesCompleted + 1}/${search.maxSearches} | ${statusText || `第 ${search.rollCount + 1}/3 次投掷`}`
      : '';

    return `
      掷2个骰子，将结果填入搜索格。<br>
      搜索格有上下两行各3个空位，形成两个3位数。<br>
      结果 = 上方数字 - 下方数字${progress ? `<br><span style="color:var(--blue);">${progress}</span>` : ''}
    `;
  },

  firstAvailableBox(region) {
    return GameState.regions[region].searchBoxes.findIndex(box => !box.complete);
  },

  remainingSearches() {
    const search = GameState.search;
    return search ? Math.max(0, search.maxSearches - search.boxesCompleted) : 0;
  },

  canSearchRegion(region) {
    return this.remainingSearches() > 0 && this.firstAvailableBox(region) !== -1;
  },

  canChallengeTerribleBeast(region) {
    return this.remainingSearches() > 0
      && GameState.regions[region].lairFound
      && !GameState.beastsDefeated[region];
  },

  renderSearchReference() {
    const materialName = mat => GAME_DATA.materialNames[mat] || mat;
    const rangeText = range => {
      if (!range) return '-';
      return range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`;
    };
    const beastCell = (regionKey, level) => {
      const regionName = GAME_DATA.regions[regionKey].nameZh;
      const beast = GAME_DATA.regions[regionKey].commonBeasts.find(b => b.level === level);
      if (!beast) return '-';
      return `
        <div class="encounter-beast-card">
          <div class="encounter-beast-region">${regionName}</div>
          <div class="encounter-beast-name">${beast.nameZh}</div>
          <div class="encounter-beast-stats">
            <span>HP ${beast.hp}</span>
            <span>怪 ${rangeText(beast.attackRange)}</span>
            <span>我 ${rangeText(beast.playerRange)}</span>
            <span>掉 ${materialName(beast.material)}</span>
          </div>
        </div>
      `;
    };
    const terribleBeastCell = regionKey => {
      const beast = GAME_DATA.regions[regionKey].terribleBeast;
      return `
        <div class="encounter-beast-card terrible">
          <div class="encounter-beast-name">${beast.nameZh}</div>
          <div class="encounter-beast-stats">
            <span>HP ${beast.hp}</span>
            <span>怪 ${rangeText(beast.attackRange)}</span>
            <span>我 ${rangeText(beast.playerAttackRange)}</span>
            <span>无掉落</span>
          </div>
        </div>
      `;
    };

    return `
      <details class="search-reference" open>
        <summary>搜索结果表 / Search Results</summary>
        <div class="search-reference-grid">
          <div>
            <div class="search-reference-title">搜索结果表</div>
            <table class="mini-rule-table">
              <tbody>
                <tr><th>100 ~ 555</th><td>遭遇怪物（查遭遇等级表）</td></tr>
                <tr><th>11 ~ 99</th><td>追踪巨兽 + 1普通材料</td></tr>
                <tr><th>1 ~ 10</th><td>找到巢穴 + 1稀有 或 2普通</td></tr>
                <tr><th>0</th><td>找到巢穴 + 伏击加成</td></tr>
                <tr><th>-1 ~ -555</th><td>遭遇怪物（查遭遇等级表）</td></tr>
              </tbody>
            </table>
          </div>
          <div>
            <div class="search-reference-title">遭遇等级表</div>
            <table class="mini-rule-table">
              <tbody>
                <tr><th>结果</th><td>等级</td></tr>
                <tr><th>100-199 / -1~-100</th><td>随机等级</td></tr>
                <tr><th>200-299 / -101~-200</th><td>1级</td></tr>
                <tr><th>300-399 / -201~-300</th><td>2级</td></tr>
                <tr><th>400-499 / -301~-400</th><td>3级</td></tr>
                <tr><th>500-555 / -401~-555</th><td>4级</td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div class="search-reference-title compact-title">等级怪物速查</div>
        <div class="encounter-matrix">
          <div class="encounter-matrix-head">等级</div>
          <div class="encounter-matrix-head">海尔比尔德峰</div>
          <div class="encounter-matrix-head">海岸洞穴</div>
          <div class="encounter-matrix-head">裂痕之地</div>
          <div class="encounter-level-label">1级</div>
          ${beastCell('halebeard', 1)}
          ${beastCell('coastal', 1)}
          ${beastCell('scar', 1)}
          <div class="encounter-level-label">2级</div>
          ${beastCell('halebeard', 2)}
          ${beastCell('coastal', 2)}
          ${beastCell('scar', 2)}
          <div class="encounter-level-label">3级</div>
          ${beastCell('halebeard', 3)}
          ${beastCell('coastal', 3)}
          ${beastCell('scar', 3)}
          <div class="encounter-level-label">4级</div>
          ${beastCell('halebeard', 4)}
          ${beastCell('coastal', 4)}
          ${beastCell('scar', 4)}
        </div>
        <div class="search-reference-title compact-title">恐怖巨兽速查</div>
        <div class="terrible-beast-grid">
          <div>
            <div class="encounter-region-label">海尔比尔德峰</div>
            ${terribleBeastCell('halebeard')}
          </div>
          <div>
            <div class="encounter-region-label">海岸洞穴</div>
            ${terribleBeastCell('coastal')}
          </div>
          <div>
            <div class="encounter-region-label">裂痕之地</div>
            ${terribleBeastCell('scar')}
          </div>
        </div>
      </details>
    `;
  },

  rollDice() {
    const search = GameState.search;
    if (!search || search.rollCount >= 3) return;

    const results = Dice.roll(2);
    GameState.search.pendingRoll = results;
    GameState.search.pendingDieIndex = 0;
    GameState.search.usedDeterminationThisRoll = false;
    GameState.search.luckRerollsThisRoll = 0;

    // Show dice
    const diceArea = document.getElementById('search-dice');
    diceArea.innerHTML = results.map((r, i) => `
      <div class="die rolling" style="animation-delay: ${i * 0.1}s">${r}</div>
    `).join('');
    UI.keepModalCurrent('#search-dice');

    // Show placement options
    setTimeout(() => {
      this.renderPendingRollPlacement();
    }, 600);
  },

  modifyPendingDie(index, modifier) {
    const search = GameState.search;
    if (!search || !search.pendingRoll || search.pendingDieIndex === 1) return;
    if (DeterminationUI.modifyRoll(search.pendingRoll, index, modifier)) {
      search.usedDeterminationThisRoll = true;
      this.renderPendingRollPlacement();
    }
  },

  rerollPendingWithLuckCharm() {
    const search = GameState.search;
    if (!search || !search.pendingRoll || search.pendingDieIndex === 1) return;
    if (GameState.toolbelt.luck_charm && !search.luckRerollsThisRoll) return;
    if ((search.luckRerollsThisRoll || 0) >= 3) return;

    GameState.toolbelt.luck_charm = true;
    search.luckRerollsThisRoll = (search.luckRerollsThisRoll || 0) + 1;
    search.pendingRoll = Dice.roll(search.pendingRoll.length);
    search.usedDeterminationThisRoll = false;
    this.renderPendingRollPlacement();
    UI.renderTopBar();
  },

  renderPendingRollPlacement() {
    const search = GameState.search;
    if (!search || !search.pendingRoll) return;

    const results = search.pendingRoll;
    const box = GameState.regions[search.region].searchBoxes[search.boxIndex];
    const diceArea = document.getElementById('search-dice');
    if (diceArea) {
      diceArea.innerHTML = DeterminationUI.render(
        results,
        'SearchUI.modifyPendingDie',
        search.usedDeterminationThisRoll,
        'SearchUI.rerollPendingWithLuckCharm',
        search.luckRerollsThisRoll || 0,
      );
    }

    let placeHtml = `<div style="margin-top:12px; font-size:13px;">将 <b>${results[0]}</b> 和 <b>${results[1]}</b> 分别放入空格：</div>`;
    placeHtml += `<div style="display:flex; gap:16px; justify-content:center; margin-top:8px;">`;

    placeHtml += `<div><div style="font-size:11px; color:var(--ink-medium); margin-bottom:4px;">上方（百十个）</div><div style="display:flex; gap:4px;">`;
    for (let i = 0; i < 3; i++) {
      if (box.top[i] === null) {
        placeHtml += `<button class="btn" onclick="SearchUI.placeDie('top', ${i}, 0)">${results[0]}</button>`;
      } else {
        placeHtml += `<button class="btn" disabled>${box.top[i]}</button>`;
      }
    }
    placeHtml += `</div></div>`;

    placeHtml += `<div><div style="font-size:11px; color:var(--ink-medium); margin-bottom:4px;">下方（百十个）</div><div style="display:flex; gap:4px;">`;
    for (let i = 0; i < 3; i++) {
      if (box.bottom[i] === null) {
        placeHtml += `<button class="btn" onclick="SearchUI.placeDie('bottom', ${i}, 0)">${results[0]}</button>`;
      } else {
        placeHtml += `<button class="btn" disabled>${box.bottom[i]}</button>`;
      }
    }
    placeHtml += `</div></div>`;
    placeHtml += `</div>`;
    document.getElementById('search-placement').innerHTML = placeHtml;

    const rollDisplay = document.querySelector('.search-instructions');
    if (rollDisplay) {
      rollDisplay.innerHTML = this.renderSearchInstructions(`第 ${search.rollCount + 1}/3 次 - 当前骰 ${results[0]} 和 ${results[1]}`);
    }
    UI.keepModalCurrent('#search-placement');
  },

  placeDie(row, col, dieIndex) {
    const search = GameState.search;
    if (!search || !search.pendingRoll) return;

    const box = GameState.regions[search.region].searchBoxes[search.boxIndex];
    const targetRow = row === 'top' ? box.top : box.bottom;

    if (targetRow[col] !== null) return;

    const value = search.pendingRoll[dieIndex];
    targetRow[col] = value;

    // If first die placed, show options for second die
    if (dieIndex === 0) {
      search.pendingDieIndex = 1;
      const remainingValue = search.pendingRoll[1];

      let placeHtml = `<div style="margin-top:12px; font-size:13px;">将 <b>${remainingValue}</b> 放入空格：</div>`;
      placeHtml += `<div style="display:flex; gap:16px; justify-content:center; margin-top:8px;">`;

      // Top row
      placeHtml += `<div><div style="font-size:11px; color:var(--ink-medium); margin-bottom:4px;">上方</div><div style="display:flex; gap:4px;">`;
      for (let i = 0; i < 3; i++) {
        if (box.top[i] === null) {
          placeHtml += `<button class="btn" onclick="SearchUI.placeDie('top', ${i}, 1)">${remainingValue}</button>`;
        } else {
          placeHtml += `<button class="btn" disabled>${box.top[i]}</button>`;
        }
      }
      placeHtml += `</div></div>`;

      // Bottom row
      placeHtml += `<div><div style="font-size:11px; color:var(--ink-medium); margin-bottom:4px;">下方</div><div style="display:flex; gap:4px;">`;
      for (let i = 0; i < 3; i++) {
        if (box.bottom[i] === null) {
          placeHtml += `<button class="btn" onclick="SearchUI.placeDie('bottom', ${i}, 1)">${remainingValue}</button>`;
        } else {
          placeHtml += `<button class="btn" disabled>${box.bottom[i]}</button>`;
        }
      }
      placeHtml += `</div></div>`;

      placeHtml += `</div>`;
      document.getElementById('search-placement').innerHTML = placeHtml;

      // Update dice display
      const diceArea = document.getElementById('search-dice');
      diceArea.innerHTML = search.pendingRoll.map((r, i) => {
        if (i === 0) return `<div class="die used">${r}</div>`;
        return `<div class="die selected">${r}</div>`;
      }).join('');
      UI.keepModalCurrent('#search-placement');
    } else {
      // Both dice placed
      search.rollCount++;
      search.pendingRoll = null;
      search.pendingDieIndex = 0;
      search.usedDeterminationThisRoll = false;
      search.luckRerollsThisRoll = 0;

      if (search.rollCount >= 3) {
        // All 3 rolls done for this box
        box.complete = true;
        search.boxesCompleted++;
        search.lastCompletedRegion = search.region;
        search.lastCompletedBoxIndex = search.boxIndex;

        // Resolve this box
        const result = Dice.searchBoxResult(box.top, box.bottom);
        const searchResult = Dice.getSearchResult(result);

        // Resolve every completed box before continuing or ending the search day.
        const nextBoxIndex = search.emptyBoxes[search.boxesCompleted];
        if (search.boxesCompleted < search.maxSearches && nextBoxIndex !== undefined) {
          search.boxIndex = nextBoxIndex;
          search.rollCount = 0;
        }
        UI.closeModal();
        this.showIntermediateResult(search.region, result, searchResult, search.boxesCompleted, search.maxSearches);
      } else {
        // Show roll button for next roll
        const diceArea = document.getElementById('search-dice');
        diceArea.innerHTML = `<button class="btn primary" onclick="SearchUI.rollDice()">🎲 掷骰子 (第 ${search.rollCount + 1} 次)</button>`;
        document.getElementById('search-placement').innerHTML = '';

        const rollDisplay = document.querySelector('.search-instructions');
        if (rollDisplay) {
          rollDisplay.innerHTML = this.renderSearchInstructions(`第 ${search.rollCount}/3 次已完成`);
        }
        UI.keepModalCurrent('#search-dice');
      }

      UI.render();
    }
  },

  showIntermediateResult(region, total, result, completed, max) {
    const regionData = GAME_DATA.regions[region];

    let html = `
      <div class="modal-title">搜索结果 - ${regionData.nameZh}</div>
      <div class="search-result-display">
        <div>搜索格 ${completed}/${max} 完成</div>
        <div>搜索结果: <strong>${total}</strong></div>
        <div style="margin-top:8px; font-size:16px;">${result.desc}</div>
      </div>
    `;

    const lastBoxIdx = GameState.search.lastCompletedBoxIndex ?? GameState.search.emptyBoxes[completed - 1];
    html += this.processSearchResult(region, total, result, lastBoxIdx);

    const box = GameState.regions[region].searchBoxes[lastBoxIdx];
    const hasEncounter = result.result === 'encounter';
    const needsMaterialChoice = Boolean(box?.pendingMaterialChoice);
    html += this.renderSearchResultActions(region, result, completed, max, hasEncounter, needsMaterialChoice, box);
    UI.showModal(html);
  },

  renderSearchResultActions(region, result, completed, max, hasEncounter, needsMaterialChoice, box) {
    if (hasEncounter) {
      return `<div id="search-result-actions" style="${needsMaterialChoice ? 'display:none;' : 'display:flex; flex-direction:column; gap:8px; margin-top:16px;'}">
        <button class="btn primary" onclick="SearchUI.continueSearch();">进入遭遇</button>
      </div>`;
    }

    const actions = [];
    if (box?.foundLairThisResult && !GameState.beastsDefeated[region]) {
      const ambush = Boolean(box.lairAmbush);
      const beast = GAME_DATA.regions[region].terribleBeast;
      actions.push(`
        <button class="btn danger" onclick="SearchUI.enterTerribleBeastFromLairResult('${region}', ${ambush ? 'true' : 'false'});">
          立即挑战 ${beast.nameZh}${ambush ? '（伏击）' : ''}
        </button>
      `);
    }

    if (this.canSearchRegion(region)) {
      actions.push(`<button class="btn primary" onclick="UI.closeModal(); SearchUI.start('${region}');">继续搜索本区域 (${completed}/${max})</button>`);
    }
    if (this.canChallengeTerribleBeast(region)) {
      actions.push(`<button class="btn danger" onclick="SearchUI.spendSearchForTerribleBeast('${region}', false);">花费1次搜索挑战恐怖巨兽</button>`);
    }

    actions.push(this.renderQuickSearchOptions());
    actions.push('<button class="btn" onclick="SearchUI.endSearchDay();">结束搜索日</button>');

    return `
      <div id="search-result-actions" style="${needsMaterialChoice ? 'display:none;' : 'display:flex; flex-direction:column; gap:8px; margin-top:16px;'}">
        ${actions.filter(Boolean).join('')}
      </div>
    `;
  },

  canQuickSearchTo(targetRegion, action = 'search') {
    const search = GameState.search;
    if (!search) return false;
    if (search.boxesCompleted !== 1 || search.maxSearches !== 3 || search.quickSearchUsed) return false;
    if (targetRegion === search.region) return false;

    const targetState = GameState.regions[targetRegion];
    if (action === 'search' && !targetState.searchBoxes.some(box => !box.complete)) return false;
    if (action === 'challenge' && (!targetState.lairFound || GameState.beastsDefeated[targetRegion])) return false;

    const hasHeavyCoat = Boolean(GameState.craftedItems.heavy_coat);
    if (!hasHeavyCoat) {
      const origin = search.originRegion || search.region;
      const originWeather = GameState.activeEvents[origin].includes('Foul Weather');
      const targetWeather = GameState.activeEvents[targetRegion].includes('Foul Weather');
      if (originWeather || targetWeather) return false;
    }

    return true;
  },

  quickSearchTargets() {
    return Object.keys(GAME_DATA.regions).filter(region => this.canQuickSearchTo(region));
  },

  renderQuickSearchOptions() {
    const targets = Object.keys(GAME_DATA.regions).filter(region =>
      this.canQuickSearchTo(region, 'search') || this.canQuickSearchTo(region, 'challenge')
    );
    if (targets.length === 0) return '';

    const buttons = targets.map(region => {
      const parts = [];
      if (this.canQuickSearchTo(region, 'search')) {
        parts.push(`
          <button class="btn" onclick="SearchUI.quickSearch('${region}')">
            快速搜索到 ${GAME_DATA.regions[region].nameZh}
          </button>
        `);
      }
      if (this.canQuickSearchTo(region, 'challenge')) {
        parts.push(`
          <button class="btn danger" onclick="SearchUI.quickSearchChallenge('${region}')">
            快速前往 ${GAME_DATA.regions[region].nameZh} 并挑战恐怖巨兽
          </button>
        `);
      }
      return parts.join('');
    }).join('');

    return `
      <div style="margin-top:12px; padding:10px; border:1px solid var(--border); border-radius:4px; background:var(--bg-card);">
        <div style="font-weight:bold; font-size:13px; margin-bottom:6px;">快速搜索</div>
        <div style="font-size:12px; color:var(--ink-medium); margin-bottom:8px;">
          花费1次搜索移动到另一区域；随后可在新区域搜索，或挑战已发现巢穴的恐怖巨兽。
        </div>
        <div style="display:flex; flex-direction:column; gap:6px;">${buttons}</div>
      </div>
    `;
  },

  quickSearch(targetRegion) {
    const search = GameState.search;
    if (!search || !this.canQuickSearchTo(targetRegion)) return;

    const targetBoxes = GameState.regions[targetRegion].searchBoxes;
    const targetBoxIndex = targetBoxes.findIndex(box => !box.complete);
    if (targetBoxIndex === -1) return;

    search.quickSearchUsed = true;
    search.region = targetRegion;
    search.boxIndex = targetBoxIndex;
    search.rollCount = 0;
    search.boxesCompleted += 1;

    UI.closeModal();
    this.start(targetRegion);
  },

  quickSearchChallenge(targetRegion) {
    const search = GameState.search;
    if (!search || !this.canQuickSearchTo(targetRegion, 'challenge')) return;
    search.quickSearchUsed = true;
    search.region = targetRegion;
    search.boxesCompleted += 1; // travel
    this.spendSearchForTerribleBeast(targetRegion, false);
  },

  showFinalResults(region) {
    const regionData = GAME_DATA.regions[region];
    const search = GameState.search;

    // Collect all results
    let resultsHtml = '';
    for (const boxIdx of search.emptyBoxes.slice(0, search.boxesCompleted)) {
      const box = GameState.regions[region].searchBoxes[boxIdx];
      const result = Dice.searchBoxResult(box.top, box.bottom);
      const searchResult = Dice.getSearchResult(result);
      resultsHtml += `<div style="margin:8px 0; padding:8px; background:var(--bg-secondary); border-radius:4px;">
        搜索格 ${boxIdx + 1}: 结果 ${result} → ${searchResult.desc}
      </div>`;
    }

    let html = `
      <div class="modal-title">搜索完成 - ${regionData.nameZh}</div>
      <div style="margin:16px 0;">
        <div style="font-weight:bold; margin-bottom:8px;">今日搜索结果：</div>
        ${resultsHtml}
      </div>
    `;

    html += `<div class="confirm-actions">
      <button class="btn primary" onclick="SearchUI.endSearchDay();">结束搜索日</button>
    </div>`;
    UI.showModal(html);
  },

  processSearchResult(region, total, result, boxIdx = null) {
    const regionData = GAME_DATA.regions[region];
    const hasAbundance = GameState.activeEvents[region].includes('Abundance');
    const box = boxIdx !== null ? GameState.regions[region].searchBoxes[boxIdx] : null;
    let html = '';

    if (box && box.resolved) {
      return '<div style="margin-top:4px; color:var(--ink-light);">该搜索格已结算。</div>';
    }
    if (box) box.resolved = true;

    if (result.result === 'lair_rare') {
      const wasLairFound = GameState.regions[region].lairFound;
      if (!wasLairFound) {
        GameState.regions[region].lairFound = true;
        GameState.addDetermination(1);
        if (box) {
          box.foundLairThisResult = true;
          box.lairAmbush = false;
        }
        html += `<div style="margin-top:8px; color:var(--green); font-weight:bold;">✓ 发现了 ${regionData.nameZh} 的巢穴！+1 决心点</div>`;
      } else {
        html += `<div style="margin-top:8px; color:var(--ink-light);">该区域巢穴已发现过，本次不再获得巢穴发现奖励。</div>`;
      }

      box.pendingMaterialChoice = true;
      html += `
        <div id="lair-material-choice" style="margin-top:8px;">
          <div style="font-size:13px; margin-bottom:6px;">选择本次搜索获得的材料：</div>
          <button class="btn primary" onclick="SearchUI.chooseLairMaterial('${region}', ${boxIdx}, 'rare')">
            ${this.describeSearchMaterialChoice(region, 'rare', 1)}
          </button>
          <button class="btn" onclick="SearchUI.chooseLairMaterial('${region}', ${boxIdx}, 'common')">
            ${this.describeSearchMaterialChoice(region, 'common', 2)}
          </button>
        </div>
        <div id="lair-material-result" style="margin-top:4px;"></div>
      `;
    } else if (result.result === 'lair_ambush') {
      const wasLairFound = GameState.regions[region].lairFound;
      if (!wasLairFound) {
        GameState.regions[region].lairFound = true;
        GameState.addDetermination(1);
        if (box) {
          box.foundLairThisResult = true;
          box.lairAmbush = true;
        }
        html += `<div style="margin-top:8px; color:var(--green); font-weight:bold;">✓ 发现了 ${regionData.nameZh} 的巢穴！+1 决心点</div>`;
        html += `<div style="margin-top:4px; color:var(--red); font-weight:bold;">⚠ 发现了适合伏击的机会：可立即挑战该区域恐怖巨兽并获得伏击加成。</div>`;
      } else {
        html += `<div style="margin-top:8px; color:var(--ink-light);">该区域巢穴已发现过，本次不再触发新的巢穴发现或伏击入口。</div>`;
      }
    } else if (result.result === 'track_beast') {
      // Fill in a tracking circle
      const tracking = GameState.regions[region].tracking;
      const emptyIdx = tracking.indexOf(false);
      if (emptyIdx !== -1) {
        tracking[emptyIdx] = true;
        html += `<div style="margin-top:8px; color:var(--blue);">追踪进度: ${tracking.filter(t => t).length}/3</div>`;

        // Check if all tracking circles are filled
        if (tracking.every(t => t) && !GameState.regions[region].lairFound) {
          GameState.regions[region].lairFound = true;
          GameState.addDetermination(1);
          if (box) {
            box.foundLairThisResult = true;
            box.lairAmbush = false;
          }
          html += `<div style="margin-top:4px; color:var(--green); font-weight:bold;">✓ 追踪完成！发现了 ${regionData.nameZh} 的巢穴！+1 决心点</div>`;
        }
      }

      html += this.awardSearchMaterial(region, 'common', 1);
    } else if (result.result === 'common_material') {
      html += this.awardSearchMaterial(region, 'common', 1);
    } else if (result.result === 'rare_material') {
      html += this.awardSearchMaterial(region, 'rare', 1);
    } else if (result.result === 'encounter') {
      // Determine level from result type
      let level = Dice.getEncounterLevel(total);
      if (level === 'random') level = this.rollRandomEncounterLevel();
      const beast = regionData.commonBeasts.find(b => b.level === level) || regionData.commonBeasts[0];
      if (box) box.encounterLevel = level;
      html += `<div style="margin-top:4px; color:var(--red);">遭遇了 ${beast.nameZh}！</div>`;
    } else {
      html += `<div style="margin-top:4px; color:var(--ink-light);">这次搜索没有收获。</div>`;
    }

    return html;
  },

  chooseLairMaterial(region, boxIdx, choice) {
    const box = GameState.regions[region].searchBoxes[boxIdx];
    if (!box || !box.pendingMaterialChoice) return;

    box.pendingMaterialChoice = false;
    box.materialChoice = choice;
    const choiceEl = document.getElementById('lair-material-choice');
    const resultEl = document.getElementById('lair-material-result');
    const actionsEl = document.getElementById('search-result-actions');
    if (choiceEl) choiceEl.style.display = 'none';
    if (resultEl) {
      resultEl.innerHTML = this.awardSearchMaterial(region, choice === 'rare' ? 'rare' : 'common', choice === 'rare' ? 1 : 2);
    }
    if (actionsEl) {
      actionsEl.style.display = 'flex';
      actionsEl.style.flexDirection = 'column';
      actionsEl.style.gap = '8px';
      actionsEl.style.marginTop = '16px';
    }
    UI.render();
    UI.keepModalCurrent('#search-result-actions');
  },

  describeSearchMaterialChoice(region, materialType, baseAmount) {
    const regionData = GAME_DATA.regions[region];
    const hasAbundance = GameState.activeEvents[region].includes('Abundance');
    const dowsing = GameState.equipment.dowsing_rod;
    const rareName = GAME_DATA.materialNames[regionData.rareMaterial];
    const commonName = GAME_DATA.materialNames[regionData.commonMaterial];

    if (materialType === 'common' && dowsing) {
      const amount = 1 + (hasAbundance ? 1 : 0) + (dowsing === 'mastercraft' ? 1 : 0);
      return `${baseAmount} 普通材料：${commonName} → 探矿杖改为 ${amount} ${rareName}`;
    }

    if (materialType === 'rare') {
      const amount = baseAmount + (hasAbundance ? 1 : 0) + (dowsing === 'mastercraft' ? 1 : 0);
      const notes = [
        hasAbundance ? '丰饶+1' : '',
        dowsing === 'mastercraft' ? '探矿杖精工+1' : '',
      ].filter(Boolean).join('，');
      return `${baseAmount} 稀有材料：${rareName}${notes ? `（${notes}，共${amount}）` : ''}`;
    }

    const amount = baseAmount + (hasAbundance ? 1 : 0);
    return `${baseAmount} 普通材料：${commonName}${hasAbundance ? `（丰饶+1，共${amount}）` : ''}`;
  },

  awardSearchMaterial(region, materialType, baseAmount) {
    const regionData = GAME_DATA.regions[region];
    const hasAbundance = GameState.activeEvents[region].includes('Abundance');
    const dowsing = GameState.equipment.dowsing_rod;
    const notes = [];
    let material;
    let amount;

    if (materialType === 'common' && dowsing) {
      material = regionData.rareMaterial;
      amount = 1;
      notes.push('探矿杖替代普通材料');
      if (hasAbundance) {
        amount += 1;
        notes.push('丰饶+1');
      }
      if (dowsing === 'mastercraft') {
        amount += 1;
        notes.push('探矿杖精工+1');
      }
    } else {
      material = materialType === 'rare' ? regionData.rareMaterial : regionData.commonMaterial;
      amount = baseAmount;
      if (hasAbundance) {
        amount += 1;
        notes.push('丰饶+1');
      }
      if (materialType === 'rare' && dowsing === 'mastercraft') {
        amount += 1;
        notes.push('探矿杖精工+1');
      }
    }

    const gained = GameState.addMaterial(material, amount);
    const noteText = notes.length ? `（${notes.join('，')}）` : '';
    return `<div style="margin-top:4px;">获得 ${gained} ${GAME_DATA.materialNames[material]}${noteText}${gained < amount ? '（库存已满，超出部分弃置）' : ''}</div>`;
  },

  enterTerribleBeastFromLairResult(region, ambushBonus = false) {
    if (!GameState.search) return;
    if (!GameState.regions[region].lairFound || GameState.beastsDefeated[region]) return;
    GameState.search.region = region;
    GameState.search.pendingRoll = null;
    GameState.search.directBeastHunt = true;
    GameState.search.freeLairBeastHunt = true;
    UI.closeModal();
    CombatUI.startCombat(region, 'terrible', null, { ambushBonus });
  },

  spendSearchForTerribleBeast(region, ambushBonus = false) {
    const search = GameState.search;
    if (!search || search.boxesCompleted >= search.maxSearches) return;
    if (!GameState.regions[region].lairFound || GameState.beastsDefeated[region]) return;

    search.boxesCompleted++;
    search.region = region;
    search.boxIndex = this.firstAvailableBox(region);
    search.rollCount = 0;
    search.pendingRoll = null;
    search.directBeastHunt = true;
    search.ambushBeastHunt = Boolean(ambushBonus);

    UI.closeModal();
    CombatUI.startCombat(region, 'terrible', null, { ambushBonus });
  },

  continueSearch() {
    const search = GameState.search;
    if (!search) return;

    // Check for encounters in the completed box
    const lastBoxIdx = search.lastCompletedBoxIndex ?? search.emptyBoxes[search.boxesCompleted - 1];
    const box = GameState.regions[search.region].searchBoxes[lastBoxIdx];
    const result = Dice.searchBoxResult(box.top, box.bottom);
    const searchResult = Dice.getSearchResult(result);

    // If encounter, close modal and start combat
    if (searchResult.result === 'encounter') {
      const regionData = GAME_DATA.regions[search.region];
      UI.closeModal();
      let level = box.encounterLevel || Dice.getEncounterLevel(result);
      if (level === 'random') level = this.rollRandomEncounterLevel();
      const beast = regionData.commonBeasts.find(b => b.level === level) || regionData.commonBeasts[0];
      setTimeout(() => {
        CombatUI.startCombat(search.region, 'common', beast);
      }, 200);
      return;
    }

    // Continue to next search decision point
    this.showSearchActionOptions('继续搜索日');
  },

  showPostCombatOptions() {
    if (!GameState.search) {
      UI.render();
      return;
    }
    GameState.phase = 'searching';
    this.showSearchActionOptions('战斗结束');
  },

  showSearchActionOptions(title = '继续搜索日') {
    const search = GameState.search;
    if (!search) return;
    if (this.remainingSearches() <= 0) {
      this.endSearchDay();
      return;
    }

    const region = search.region;
    const actions = [];
    if (this.canSearchRegion(region)) {
      actions.push(`<button class="btn primary" onclick="UI.closeModal(); SearchUI.start('${region}');">继续搜索 ${GAME_DATA.regions[region].nameZh}</button>`);
    }
    if (this.canChallengeTerribleBeast(region)) {
      actions.push(`<button class="btn danger" onclick="SearchUI.spendSearchForTerribleBeast('${region}', false);">花费1次搜索挑战 ${GAME_DATA.regions[region].terribleBeast.nameZh}</button>`);
    }
    actions.push(this.renderQuickSearchOptions());
    actions.push('<button class="btn" onclick="SearchUI.endSearchDay();">结束搜索日</button>');

    UI.showModal(`
      <div class="modal-title">${title}</div>
      <div style="font-size:13px; line-height:1.6; margin-bottom:12px; text-align:center;">
        剩余搜索次数：${this.remainingSearches()} / ${search.maxSearches}
      </div>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${actions.filter(Boolean).join('')}
      </div>
    `);
  },

  endSearchDay() {
    const search = GameState.search;
    if (!search) {
      UI.closeModal();
      return;
    }

    const region = search.region;

    // End the search day
    GameState.search = null;
    GameState.phase = 'idle';

    // Advance day
    GameState.advanceDay('search');
    GameLog.add(`在 ${GAME_DATA.regions[region].nameZh} 完成了搜索。`);

    UI.closeModal();
    UI.render();

    // Use centralized day advancement handler
    Game.onDayAdvanced();
  },
};
