// ============================================
// Utopia Engine: Beast Hunter - UI Renderer
// ============================================

const UI = {
  // === Render all ===
  render() {
    this.renderTopBar();
    this.renderTimeTrack();
    this.renderRegions();
    this.renderTowers();
    this.renderElders();
    this.renderMaterials();
    this.renderCraftedItems();
    this.renderHuts();
    this.renderStatusBar();
  },

  // === Top Bar ===
  renderTopBar() {
    // HP
    const hpBar = document.getElementById('hp-bar');
    hpBar.innerHTML = '';
    for (let i = 0; i < GameState.hp.max; i++) {
      const cell = document.createElement('div');
      cell.className = `hp-cell ${i < GameState.hp.current ? 'filled' : 'empty'}`;
      if (i === 0) cell.classList.add('skull');
      cell.title = `HP: ${GameState.hp.current}/${GameState.hp.max}`;
      hpBar.appendChild(cell);
    }
    document.getElementById('hp-text').textContent = `${GameState.hp.current}/${GameState.hp.max}`;

    // Determination
    document.getElementById('dp-value').textContent = GameState.determination;

    // Doubt
    const doubtBar = document.getElementById('doubt-bar');
    doubtBar.innerHTML = '';
    for (let i = 0; i < GameState.doubt.max; i++) {
      const cell = document.createElement('div');
      cell.className = `doubt-cell ${i < GameState.doubt.current ? 'filled' : 'empty'}`;
      if (i === GameState.doubt.max - 1) cell.classList.add('skull');
      cell.title = `怀疑: ${GameState.doubt.current}/${GameState.doubt.max}`;
      doubtBar.appendChild(cell);
    }
    document.getElementById('doubt-text').textContent = `${GameState.doubt.current}/${GameState.doubt.max}`;

    // Day
    document.getElementById('day-display').textContent = `${GameState.currentDay}/14`;
  },

  // === Time Track ===
  renderTimeTrack() {
    const container = document.getElementById('time-track');
    container.innerHTML = `
      <div class="tt-label">
        <span>时间轨道</span>
        <span class="tt-subtitle">The March of the Blazing Star Regiment</span>
      </div>
    `;
    const daysContainer = document.createElement('div');
    daysContainer.className = 'time-days';
    daysContainer.setAttribute('role', 'list');
    daysContainer.setAttribute('aria-label', '时间轨道');
    daysContainer.tabIndex = 0;

    GAME_DATA.timeTrack.forEach((day, i) => {
      const el = document.createElement('div');
      el.className = 'time-day';
      el.setAttribute('role', 'listitem');
      if (GameState.daysCrossed.includes(day.day)) el.classList.add('crossed');
      if (day.day === GameState.currentDay) el.classList.add('current');
      if (day.skull) el.classList.add('skull');

      let html = `<span>${day.day}</span>`;
      if (day.skull) {
        html += '<span class="skull-marker">💀</span>';
      }
      if (day.event) {
        const cls = day.event === 'E' ? 'event-e' : 'event-bang';
        html += `<span class="event-marker ${cls}">${day.event}</span>`;
      }
      el.innerHTML = html;
      el.title = `第 ${day.day} 天${day.skull ? ' - 最后一天' : ''}${day.event ? (day.event === 'E' ? ' - 事件日' : ' - 巨兽袭击日') : ''}`;
      daysContainer.appendChild(el);
    });

    container.appendChild(daysContainer);
  },

  // === Regions ===
  renderRegions() {
    for (const [regionKey, regionData] of Object.entries(GAME_DATA.regions)) {
      const stateData = GameState.regions[regionKey];

      // Search boxes (2 rows of 3 squares each)
      const boxesContainer = document.getElementById(`${regionKey}-boxes`);
      boxesContainer.innerHTML = '';

      const approachEl = document.getElementById(`${regionKey}-approach`);
      if (approachEl) {
        approachEl.innerHTML = this.renderApproachInfo(regionData.approach);
      }

      const eventsEl = document.getElementById(`${regionKey}-events`);
      if (eventsEl) {
        eventsEl.innerHTML = '';
        const events = GameState.activeEvents[regionKey] || [];
        if (events.length > 0) {
          for (const eventName of events) {
            const eventData = this.getRegionEventDisplay(eventName);
            const tag = document.createElement('div');
            tag.className = `region-event-tag ${eventData.className}`;
            tag.title = eventData.effect;
            tag.innerHTML = `<span>${eventData.nameZh}</span><small>${eventData.effect}</small>`;
            eventsEl.appendChild(tag);
          }
        } else {
          const empty = document.createElement('div');
          empty.className = 'region-events-empty';
          empty.textContent = '无当前事件';
          eventsEl.appendChild(empty);
        }
      }

      stateData.searchBoxes.forEach((box, boxIdx) => {
        const boxEl = document.createElement('div');
        boxEl.className = `search-box ${box.complete ? 'complete' : ''}`;

        // Top row (3 squares)
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.gap = '2px';
        for (let i = 0; i < 3; i++) {
          const cell = document.createElement('div');
          cell.className = `search-cell ${box.top[i] !== null ? 'filled' : ''}`;
          cell.textContent = box.top[i] !== null ? box.top[i] : '';
          topRow.appendChild(cell);
        }
        boxEl.appendChild(topRow);

        // Bottom row (3 squares)
        const bottomRow = document.createElement('div');
        bottomRow.style.display = 'flex';
        bottomRow.style.gap = '2px';
        for (let i = 0; i < 3; i++) {
          const cell = document.createElement('div');
          cell.className = `search-cell ${box.bottom[i] !== null ? 'filled' : ''}`;
          cell.textContent = box.bottom[i] !== null ? box.bottom[i] : '';
          bottomRow.appendChild(cell);
        }
        boxEl.appendChild(bottomRow);

        // Show result if complete
        if (box.complete) {
          const result = Dice.searchBoxResult(box.top, box.bottom);
          const resultEl = document.createElement('div');
          resultEl.className = 'search-box-total';
          resultEl.textContent = `= ${result}`;
          resultEl.style.color = result < 0 ? 'var(--red)' : 'var(--ink-dark)';
          boxEl.appendChild(resultEl);
        }

        boxesContainer.appendChild(boxEl);
      });

      // Tracking circles
      const trackingEl = document.getElementById(`${regionKey}-tracking`);
      if (trackingEl) {
        trackingEl.innerHTML = '';
        const filledTracking = stateData.tracking.filter(Boolean).length;
        const label = document.createElement('span');
        label.className = 'tracking-label';
        label.textContent = `追踪 ${filledTracking}/3`;
        trackingEl.appendChild(label);

        for (let i = 0; i < 3; i++) {
          const circle = document.createElement('div');
          circle.className = `tracking-circle ${stateData.tracking[i] ? 'filled' : ''}`;
          circle.textContent = stateData.tracking[i] ? '✓' : '';
          circle.title = '追踪圈：搜索结果11-99或巨兽袭击后填入；3圈满后发现巢穴并+1决心';
          trackingEl.appendChild(circle);
        }

        const note = document.createElement('div');
        note.className = 'tracking-note';
        note.textContent = '3圈满=发现巢穴；巨兽袭击后+1追踪';
        trackingEl.appendChild(note);
      }

      // Lair status
      const lairEl = document.getElementById(`${regionKey}-lair`);
      lairEl.innerHTML = '';
      const checkbox = document.createElement('div');
      checkbox.className = `lair-checkbox ${stateData.lairFound ? 'checked' : ''}`;
      lairEl.appendChild(checkbox);
      const label = document.createElement('span');
      label.textContent = stateData.lairFound ? '巢穴已发现！' : '巢穴未发现';
      lairEl.appendChild(label);

      const huntEl = document.getElementById(`${regionKey}-beast-hunt`);
      if (huntEl) {
        huntEl.innerHTML = this.renderBeastHunt(regionKey, regionData, stateData);
      }

      // Track info
      const trackEl = document.getElementById(`${regionKey}-track`);
      if (trackEl) {
        const completedBoxes = stateData.searchBoxes.filter(b => b.complete).length;
        trackEl.textContent = `搜索进度: ${completedBoxes}/${stateData.searchBoxes.length}`;
      }
    }
  },

  renderBeastHunt(regionKey, regionData, stateData) {
    const defeated = GameState.beastsDefeated[regionKey];
    const hasBait = GameState.craftedItems.potent_bait !== null && GameState.craftedItems.potent_bait > 0;
    const canAct = GameState.phase === 'idle';
    const beast = regionData.terribleBeast;
    const rangeText = typeof CombatUI !== 'undefined' ? CombatUI.formatRange(beast.playerAttackRange || [6, 6]) : `${beast.playerAttackRange[0]}-${beast.playerAttackRange[1]}`;
    const wounds = GameState.beastWounds[regionKey] || 0;
    const currentHp = Math.max(1, beast.hp - wounds);

    if (defeated) {
      return `
        <div class="beast-hunt defeated">
          <div class="beast-hunt-title">恐怖巨兽已击败</div>
          <div class="beast-hunt-note">${beast.nameZh} 不再袭击村庄。</div>
        </div>
      `;
    }

    const actions = [];
    if (stateData.lairFound) {
      actions.push(`
        <button class="btn danger" ${canAct ? '' : 'disabled'}
                onclick="Game.confirmTerribleBeastHunt('${regionKey}', false)">
          搜索巢穴挑战 ${beast.nameZh}
        </button>
      `);
    }
    if (hasBait) {
      actions.push(`
        <button class="btn" ${canAct ? '' : 'disabled'}
                onclick="Game.confirmTerribleBeastHunt('${regionKey}', true)">
          使用强力诱饵挑战
        </button>
      `);
    }

    const status = stateData.lairFound
      ? '巢穴已发现：可花费1次搜索遭遇该区域恐怖巨兽。'
      : hasBait
        ? '巢穴未发现：可消耗强力诱饵强行引出巨兽。'
        : '填满3个追踪圈或搜索结果为0/1-10后发现巢穴。';

    return `
      <div class="beast-hunt ${stateData.lairFound || hasBait ? '' : 'locked'}">
        <div class="beast-hunt-title">${beast.nameZh} HP ${currentHp}/${beast.hp}</div>
        <div class="beast-hunt-note">
          ${status}<br>
          巨兽攻击 ${beast.attackRange[0]}-${beast.attackRange[1]}；你的攻击 ${rangeText}。首次遭遇会随机确定温顺、残忍或狡猾特性。
        </div>
        ${actions.length ? `<div class="beast-hunt-actions">${actions.join('')}</div>` : ''}
      </div>
    `;
  },

  renderApproachInfo(approach) {
    const directionNames = { E: '东', S: '南', SW: '西南' };
    const towerNames = { E: '东方塔', S: '南方塔', SW: '西南塔' };
    const counts = { E: 0, S: 0, SW: 0 };

    Object.values(approach).forEach(direction => {
      counts[direction] = (counts[direction] || 0) + 1;
    });

    const tags = ['E', 'S', 'SW'].map(direction => {
      const count = counts[direction] || 0;
      const pct = Math.round((count / 6) * 100);
      const title = `${directionNames[direction]}方向，${towerNames[direction]}阻挡，概率 ${count}/6`;
      return `
        <span class="approach-tag" title="${title}">
          ${directionNames[direction]} ${count}/6 (${pct}%)
        </span>
      `;
    }).join('');

    return `
      <div class="approach-title">巨兽来袭方向 / 阻挡塔</div>
      <div class="approach-tags">${tags}</div>
    `;
  },

  getRegionEventDisplay(eventName) {
    const eventDisplays = {
      Abundance: {
        nameZh: '丰饶',
        effect: '搜索到材料时 +1',
        className: 'abundance',
      },
      'Sudden Clarity': {
        nameZh: '突然清醒',
        effect: '攻击范围 +1',
        className: 'clarity',
      },
      'Foul Weather': {
        nameZh: '恶劣天气',
        effect: '每天只能搜索 2 次',
        className: 'weather',
      },
      Madness: {
        nameZh: '疯狂',
        effect: '所有怪物 +2 HP',
        className: 'madness',
      },
    };

    return eventDisplays[eventName] || {
      nameZh: eventName,
      effect: '',
      className: 'unknown',
    };
  },

  // === Resolve Search Box ===
  resolveSearchBox(regionKey, boxIdx) {
    const box = GameState.regions[regionKey].searchBoxes[boxIdx];
    const total = box.filled.reduce((a, b) => a + b, 0);
    const result = Dice.getSearchResult(total);

    UI.showSearchResult(regionKey, total, result);
  },

  // === Show Search Result Modal ===
  showSearchResult(regionKey, total, result) {
    const regionData = GAME_DATA.regions[regionKey];

    let html = `
      <div class="modal-title">搜索结果 - ${regionData.nameZh}</div>
      <div class="search-result-display">
        <div>搜索总和: <strong>${total}</strong></div>
        <div style="margin-top:8px; font-size:16px;">${result.desc}</div>
      </div>
    `;

    // Process result
    if (result.result === 'lair_material' || result.result === 'lair_rare') {
      GameState.regions[regionKey].lairFound = true;
      GameState.addDetermination(1);
      html += `<div style="margin-top:12px; color:var(--green); font-weight:bold;">✓ 发现了 ${regionData.nameZh} 的巢穴！+1 决心点</div>`;

      if (result.result === 'lair_rare') {
        GameState.addMaterial(regionData.rareMaterial, 1);
        html += `<div style="margin-top:4px;">获得 1 ${GAME_DATA.materialNames[regionData.rareMaterial]}</div>`;
      } else {
        GameState.addMaterial(regionData.commonMaterial, 1);
        html += `<div style="margin-top:4px;">获得 1 ${GAME_DATA.materialNames[regionData.commonMaterial]}</div>`;
      }
    } else if (result.result === 'lair_ambush') {
      GameState.regions[regionKey].lairFound = true;
      GameState.addDetermination(1);
      html += `<div style="margin-top:12px; color:var(--green); font-weight:bold;">✓ 发现了 ${regionData.nameZh} 的巢穴！+1 决心点</div>`;
      html += `<div style="margin-top:4px; color:var(--red); font-weight:bold;">⚠ 但是遭遇了伏击！巨兽突然出现！</div>`;
      // Start terrible beast combat
      setTimeout(() => {
        UI.closeModal();
        CombatUI.startCombat(regionKey, 'terrible');
      }, 1500);
    } else if (result.result === 'common_material') {
      GameState.addMaterial(regionData.commonMaterial, 1);
      html += `<div style="margin-top:8px;">获得 1 ${GAME_DATA.materialNames[regionData.commonMaterial]}</div>`;
    } else if (result.result === 'rare_material') {
      GameState.addMaterial(regionData.rareMaterial, 1);
      html += `<div style="margin-top:8px;">获得 1 ${GAME_DATA.materialNames[regionData.rareMaterial]}</div>`;
    } else if (result.result === 'encounter' || result.result === 'encounter_2' || result.result === 'encounter_3' || result.result === 'encounter_4') {
      const level = Dice.getEncounterLevel(total);
      const beast = regionData.commonBeasts.find(b => b.level === level) || regionData.commonBeasts[0];
      html += `<div style="margin-top:8px; color:var(--red);">遭遇了 ${beast.nameZh}！</div>`;
      setTimeout(() => {
        UI.closeModal();
        CombatUI.startCombat(regionKey, 'common', beast);
      }, 1500);
    } else if (result.result === 'beast_encounter') {
      html += `<div style="margin-top:8px; color:var(--red); font-weight:bold;">遭遇了 ${regionData.terribleBeast.nameZh}！</div>`;
      setTimeout(() => {
        UI.closeModal();
        CombatUI.startCombat(regionKey, 'terrible');
      }, 1500);
    } else {
      html += `<div style="margin-top:8px; color:var(--ink-light);">这次搜索没有收获。</div>`;
    }

    html += `<div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal(); UI.endSearchTurn();">确定</button></div>`;
    UI.showModal(html);
  },

  // === End Search Turn ===
  endSearchTurn() {
    GameState.search = null;
    GameState.phase = 'idle';
    UI.render();
  },

  // === Towers ===
  renderTowers() {
    for (const [towerKey, towerData] of Object.entries(GameState.towers)) {
      const gridEl = document.getElementById(`tower-${towerKey}-grid`);
      if (!gridEl) continue;
      const panelEl = gridEl.closest('.tower-panel');
      if (panelEl) {
        panelEl.classList.toggle('tower-destroyed', Boolean(towerData.destroyed));
      }
      gridEl.innerHTML = '';
      const shape = GAME_DATA.towerShapes[towerKey] || ['11111', '11111', '11111', '11111', '11111'];
      const cols = shape[0].length;
      gridEl.style.gridTemplateColumns = `repeat(${cols}, var(--tower-cell-size, 24px))`;

      for (let i = 0; i < towerData.grid.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        const isActive = shape[row] && shape[row][col] === '1';
        const cell = document.createElement('div');
        if (!isActive) {
          cell.className = 'tower-cell inactive';
          gridEl.appendChild(cell);
          continue;
        }
        const val = towerData.grid[i];
        cell.className = `tower-cell ${val !== null ? 'filled' : ''} ${towerData.destroyed ? 'destroyed' : ''}`;
        if (val === 'X') {
          cell.classList.add('fault');
          cell.textContent = 'X';
        } else if (val !== null) {
          cell.textContent = val;
        } else if (towerData.destroyed) {
          cell.textContent = '!';
        }

        gridEl.appendChild(cell);
      }

      // Status and hawk totem
      const statusEl = document.getElementById(`tower-${towerKey}-status`);
      if (statusEl) {
        const activeIndices = BuildUI.getActiveIndices(towerKey);
        const xCount = activeIndices.filter(i => towerData.grid[i] === 'X').length;
        const filledCount = activeIndices.filter(i => towerData.grid[i] !== null).length;
        let statusText = towerData.destroyed
          ? '已摧毁 - 需要重建'
          : (towerData.complete ? '✓ 完成' : `进度: ${filledCount}/${activeIndices.length} (${xCount} 个故障)`);
        if (towerData.hawkTotem) statusText += ' | 🦅 鹰图腾';
        statusEl.textContent = statusText;

        // Show hawk totem button if player has hawk totem and tower is complete
        const hawkBtnEl = document.getElementById(`tower-${towerKey}-hawk`);
        if (hawkBtnEl) {
          hawkBtnEl.innerHTML = '';
          if (towerData.complete && !towerData.hawkTotem && GameState.craftedItems.hawk_totem) {
            const btn = document.createElement('button');
            btn.className = 'btn';
            btn.style.fontSize = '11px';
            btn.style.padding = '4px 8px';
            btn.textContent = '🦅 安装鹰图腾';
            btn.onclick = () => UI.attachHawkTotem(towerKey);
            hawkBtnEl.appendChild(btn);
          }
        }
      }
    }
  },

  // === Elders ===
  renderElders() {
    for (const elder of GAME_DATA.elders) {
      const key = elder.name.toLowerCase();
      const checkbox = document.getElementById(`elder-${key}`);
      if (checkbox) {
        checkbox.className = `elder-checkbox ${GameState.elders[key] ? 'checked' : ''}`;
      }
    }
  },

  // === Materials ===
  renderMaterials() {
    const container = document.getElementById('materials-grid');
    if (!container) return;
    container.innerHTML = '';

    const groups = [
      { title: '普通材料', subtitle: 'Common', items: GAME_DATA.materials.common },
      { title: '稀有材料', subtitle: 'Rare', items: GAME_DATA.materials.rare },
      { title: '怪物材料', subtitle: 'Beast', items: GAME_DATA.materials.beast },
    ];

    groups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'material-group';

      const titleEl = document.createElement('div');
      titleEl.className = 'material-group-title';
      titleEl.innerHTML = `<span>${group.title}</span><small>${group.subtitle}</small>`;
      groupEl.appendChild(titleEl);

      const itemsEl = document.createElement('div');
      itemsEl.className = 'material-group-items';

      group.items.forEach(mat => {
        const item = document.createElement('div');
        item.className = 'material-item';
        item.title = `${GAME_DATA.materialNames[mat]}: ${GameState.materials[mat]}/${GAME_DATA.materialLimit || 4}`;

        const name = document.createElement('span');
        name.className = 'material-name';
        name.textContent = GAME_DATA.materialNames[mat];
        item.appendChild(name);

        const dots = document.createElement('div');
        dots.className = 'material-dots';
        for (let i = 0; i < (GAME_DATA.materialLimit || 4); i++) {
          const dot = document.createElement('div');
          dot.className = `material-dot ${i < GameState.materials[mat] ? 'filled' : ''}`;
          dots.appendChild(dot);
        }
        item.appendChild(dots);
        itemsEl.appendChild(item);
      });

      groupEl.appendChild(itemsEl);
      container.appendChild(groupEl);
    });
  },

  renderCraftedItems() {
    const container = document.getElementById('crafted-grid');
    if (!container) return;
    container.innerHTML = '';

    for (const recipe of GAME_DATA.craftingRecipes) {
      const key = recipe.name.toLowerCase().replace(/ /g, '_');
      const status = GameState.craftedItems[key];
      const wasCrafted = Boolean(GameState.craftedItemHistory[key]);
      const owned = status !== null;
      const canCraft = GameState.phase !== 'combat'
        && !owned
        && Object.entries(recipe.requires).every(([mat, amt]) => GameState.hasMaterial(mat, amt));
      const reqText = Object.entries(recipe.requires)
        .map(([mat, amt]) => `${GAME_DATA.materialNames[mat]}x${amt}`)
        .join(' + ');

      const card = document.createElement('div');
      card.className = `crafted-item ${owned ? 'owned' : wasCrafted ? 'spent' : ''}`;
      card.title = `${recipe.effect} | 需要: ${reqText}`;

      const stateText = owned
        ? (typeof status === 'number' ? `${status}次` : '可用')
        : wasCrafted
          ? '已用'
          : '未造';

      card.innerHTML = `
        <div class="crafted-item-name">
          <span>${recipe.nameZh}</span>
          <span class="item-status ${owned ? 'available' : 'used'}">${stateText}</span>
        </div>
        <div class="crafted-item-effect">${recipe.effect}</div>
        <div class="crafted-item-req">需要: ${reqText}</div>
        <div class="crafted-item-actions">
          <button class="btn ${canCraft ? 'primary' : ''}" ${canCraft ? '' : 'disabled'}
                  onclick="CraftUI.craft('${key}')">${wasCrafted ? '再造' : '合成'}</button>
          ${this.renderCraftedItemUseButton(key, owned)}
        </div>
      `;
      container.appendChild(card);
    }
  },

  renderCraftedItemUseButton(key, owned) {
    if (!owned) return '';
    if (key === 'blood_lure') {
      return `<button class="btn" ${GameState.phase === 'idle' ? '' : 'disabled'} onclick="Game.showBloodLureDialog()">使用</button>`;
    }
    if (key === 'potent_bait') {
      return `<button class="btn" ${GameState.phase === 'idle' ? '' : 'disabled'} onclick="Game.showPotentBaitDialog()">使用</button>`;
    }
    if (key === 'hawk_totem') {
      return '<button class="btn" disabled>在塔上安装</button>';
    }
    if (key === 'firebox') {
      return '<button class="btn" disabled>战斗中使用</button>';
    }
    if (key === 'crab_plate') {
      return '<button class="btn" disabled>自动防护</button>';
    }
    if (key === 'reviving_dose') {
      return '<button class="btn" disabled>濒死自动</button>';
    }
    if (key === 'heavy_coat') {
      return '<button class="btn" disabled>被动</button>';
    }
    return '';
  },

  renderHuts() {
    const container = document.getElementById('huts-grid');
    const note = document.getElementById('hut-note');
    if (!container) return;

    container.innerHTML = '';
    GameState.huts.forEach((intact, idx) => {
      const hut = document.createElement('div');
      hut.className = `hut-cell ${intact ? '' : 'destroyed'}`;
      hut.textContent = intact ? `小屋 ${idx + 1}` : `已毁 ${idx + 1}`;
      hut.title = intact ? '小屋完好' : '小屋已被巨兽摧毁';
      container.appendChild(hut);
    });

    if (note) {
      const destroyed = GameState.huts.filter(h => !h).length;
      note.textContent = `巨兽无塔阻挡时摧毁1间小屋；被毁时立即增加 ${destroyed > 0 ? destroyed * 2 : 2} 怀疑。每天默认怀疑还会加上已毁小屋数。`;
    }
  },

  // === Status Bar ===
  renderStatusBar() {
    const el = document.getElementById('status-text');
    if (GameState.phase === 'idle') {
      const actions = [];
      if (GameState.currentDay <= 14) actions.push('选择要执行的操作：搜索 / 建造 / 锻造 / 合成 / 休息');
      el.textContent = actions.join(' | ');
    }
  },

  // === Hawk Totem ===
  attachHawkTotem(towerKey) {
    const tower = GameState.towers[towerKey];
    if (!tower.complete || tower.hawkTotem || !GameState.craftedItems.hawk_totem) return;

    UI.showModal(`
      <div class="modal-title">🦅 安装鹰图腾</div>
      <p style="text-align:center; margin-bottom:16px;">
        将鹰图腾安装到 ${towerKey === 'south' ? '南方塔' : towerKey === 'west' ? '西南塔' : '东方塔'}？<br>
        <span style="font-size:12px; color:var(--ink-medium);">该塔将免疫所有巨兽攻击。</span>
      </p>
      <div class="confirm-actions">
        <button class="btn" onclick="UI.closeModal()">取消</button>
        <button class="btn primary" onclick="UI.closeModal(); UI.confirmAttachHawkTotem('${towerKey}');">安装</button>
      </div>
    `);
  },

  confirmAttachHawkTotem(towerKey) {
    GameState.towers[towerKey].hawkTotem = true;
    GameState.craftedItems.hawk_totem = null; // Consume the item
    GameLog.add(`鹰图腾已安装到 ${towerKey === 'south' ? '南方塔' : towerKey === 'west' ? '西南塔' : '东方塔'}！`);
    UI.render();
  },

  // === Modal ===
  showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    content.scrollTop = 0;
    overlay.classList.add('active');
  },

  keepModalCurrent(selector, options = {}) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    if (!overlay || !content || !overlay.classList.contains('active')) return;

    requestAnimationFrame(() => {
      const target = selector ? content.querySelector(selector) : this.findModalCurrentTarget(content);
      if (!target) return;

      const nestedScroll = target.matches('.combat-log') ? target : target.querySelector?.('.combat-log');
      if (nestedScroll) nestedScroll.scrollTop = nestedScroll.scrollHeight;

      const contentRect = content.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const margin = options.margin ?? 16;
      const targetTop = targetRect.top - contentRect.top + content.scrollTop - margin;
      const targetBottom = targetRect.bottom - contentRect.top + content.scrollTop + margin;
      const visibleTop = content.scrollTop;
      const visibleBottom = content.scrollTop + content.clientHeight;

      if (targetTop >= visibleTop && targetBottom <= visibleBottom) return;

      const maxScroll = content.scrollHeight - content.clientHeight;
      const preferredTop = targetRect.height >= content.clientHeight
        ? targetTop
        : Math.min(targetTop, targetBottom - content.clientHeight);
      const top = Math.max(0, Math.min(maxScroll, preferredTop));
      content.scrollTo({ top, behavior: options.smooth ? 'smooth' : 'auto' });
    });
  },

  scrollToLatest(selector, root = document) {
    requestAnimationFrame(() => {
      const el = root.querySelector(selector);
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    });
  },

  findModalCurrentTarget(content) {
    return content.querySelector('[data-current]') ||
      [...content.querySelectorAll('[id$="-placement"]')].find(el => el.textContent.trim()) ||
      content.querySelector('#combat-dice, #forge-dice, #build-dice, #search-dice') ||
      content.querySelector('.confirm-actions');
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
  },

  // === New Game Dialog ===
  showNewGameDialog() {
    const html = `
      <div class="modal-title">新游戏</div>
      <p style="text-align:center; margin-bottom:16px;">确定要开始新游戏吗？当前进度将丢失。</p>
      <div class="confirm-actions">
        <button class="btn" onclick="UI.closeModal()">取消</button>
        <button class="btn primary" onclick="UI.closeModal(); Game.newGame();">确定</button>
      </div>
    `;
    UI.showModal(html);
  },

  // === Rest Dialog ===
  showRestDialog() {
    const html = `
      <div class="modal-title">休息</div>
      <p style="text-align:center; margin-bottom:16px;">
        花费一天时间休息，恢复 2 点 HP。<br>
        <span style="color:var(--red);">村民怀疑 +1</span>
      </p>
      <div class="confirm-actions">
        <button class="btn" onclick="UI.closeModal()">取消</button>
        <button class="btn primary" onclick="UI.closeModal(); Game.doRest();">休息</button>
      </div>
    `;
    UI.showModal(html);
  },
};
