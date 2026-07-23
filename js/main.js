// ============================================
// Utopia Engine: Beast Hunter - Main Game Logic
// ============================================

const Game = {
  init() {
    GameState.reset();
    UI.render();
    this.bindActions();
    GameLog.add('游戏开始！你是猎人 Mason，有14天时间击败三只恐怖巨兽。');
  },

  newGame() {
    GameState.reset();
    UI.render();
    GameLog.add('新游戏开始！');
  },

  bindActions() {
    document.getElementById('btn-search').onclick = () => this.showSearchDialog();
    document.getElementById('btn-build').onclick = () => this.showBuildDialog();
    document.getElementById('btn-forge').onclick = () => this.showForgeDialog();
    document.getElementById('btn-craft').onclick = () => this.showCraftDialog();
    document.getElementById('btn-rest').onclick = () => UI.showRestDialog();
    document.getElementById('btn-new-game').onclick = () => UI.showNewGameDialog();
    document.getElementById('btn-save').onclick = () => this.saveGame();
    document.getElementById('btn-load').onclick = () => this.loadGame();
    document.getElementById('btn-inventory').onclick = () => this.showInventory();
    document.getElementById('btn-debug').onclick = () => this.showDebug();
    document.getElementById('btn-help').onclick = () => this.showHelp();
  },

  // === Search ===
  showSearchDialog() {
    if (GameState.phase !== 'idle') return;

    let html = `
      <div class="modal-title">搜索荒野</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        选择一个区域进行搜索。掷2个骰子3次，将结果填入搜索格。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    for (const [key, data] of Object.entries(GAME_DATA.regions)) {
      const completedBoxes = GameState.regions[key].searchBoxes.filter(b => b.complete).length;
      const totalBoxes = GameState.regions[key].searchBoxes.length;
      const allComplete = completedBoxes >= totalBoxes;
      html += `
        <button class="btn ${allComplete ? '' : 'primary'}" style="width:100%;" ${allComplete ? 'disabled' : ''}
                onclick="UI.closeModal(); Game.startSearch('${key}');">
          ${data.nameZh} (${data.name})
          <span style="font-size:11px; opacity:0.7;"> - 搜索 ${completedBoxes}/${totalBoxes}</span>
        </button>
      `;
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>`;
    UI.showModal(html);
  },

  startSearch(region) {
    if (GameState.startSearch(region)) {
      SearchUI.start(region);
    }
  },

  confirmTerribleBeastHunt(region, useBait = false) {
    if (GameState.phase !== 'idle') return;

    const regionData = GAME_DATA.regions[region];
    const stateData = GameState.regions[region];
    const beast = regionData.terribleBeast;
    const hasBait = GameState.craftedItems.potent_bait !== null && GameState.craftedItems.potent_bait > 0;

    if (GameState.beastsDefeated[region]) return;
    if (useBait && !hasBait) return;
    if (!useBait && !stateData.lairFound) return;

    const entryText = useBait
      ? '消耗1个强力诱饵，并作为今天第1次搜索遭遇该区域恐怖巨兽；即使巢穴未发现也可以使用。若逃离，剩余搜索次数仍可继续使用。'
      : '花费1次搜索进入已发现巢穴，立即遭遇该区域恐怖巨兽。若逃离，剩余搜索次数仍可继续使用。';

    UI.showModal(`
      <div class="modal-title">挑战恐怖巨兽</div>
      <div style="font-size:13px; line-height:1.6;">
        <p style="text-align:center; margin-bottom:12px;">
          <b>${regionData.nameZh}</b> 的 <b>${beast.nameZh}</b>
        </p>
        <div class="combat-reference" style="margin-bottom:12px;">
          <b>战斗入口</b><br>
          ${entryText}
        </div>
        <ul style="padding-left:20px;">
          <li>HP ${beast.hp}；巨兽攻击 ${beast.attackRange[0]}-${beast.attackRange[1]}；你的攻击 ${CombatUI.formatRange(beast.playerAttackRange || [6, 6])}。</li>
          <li>首次遭遇该巨兽时，随机确定特性：温顺会逐步缩小攻击范围，残忍会造成重伤，狡猾会让前2轮伤害无效。</li>
          <li>恐怖巨兽不掉落材料；击败后获得+1决心、一个长老审批，并且当天结束不增加怀疑。</li>
          <li>若逃离，已造成的伤害会保留到下次遭遇；只消耗这1次搜索，今天剩余搜索次数仍可继续使用。</li>
        </ul>
      </div>
      <div class="confirm-actions">
        <button class="btn" onclick="UI.closeModal()">取消</button>
        <button class="btn danger" onclick="UI.closeModal(); Game.startTerribleBeastHunt('${region}', ${useBait ? 'true' : 'false'});">进入战斗</button>
      </div>
    `);
  },

  startTerribleBeastHunt(region, useBait = false) {
    if (GameState.phase !== 'idle') return;
    if (GameState.beastsDefeated[region]) return;

    const stateData = GameState.regions[region];
    const hasBait = GameState.craftedItems.potent_bait !== null && GameState.craftedItems.potent_bait > 0;
    if (useBait) {
      if (!hasBait) return;
      GameState.craftedItems.potent_bait -= 1;
      if (GameState.craftedItems.potent_bait <= 0) GameState.craftedItems.potent_bait = null;
      GameLog.add(`使用强力诱饵，引出了 ${GAME_DATA.regions[region].terribleBeast.nameZh}。`);
    } else if (!stateData.lairFound) {
      return;
    }

    const maxSearches = GameState.getSearchLimit(region);
    GameState.search = {
      originRegion: region,
      region,
      boxIndex: GameState.regions[region].searchBoxes.findIndex(b => !b.complete),
      rollCount: 0,
      rolls: [],
      emptyBoxes: GameState.getAvailableSearchBoxes(region, maxSearches),
      boxesCompleted: 1,
      maxSearches,
      quickSearchUsed: false,
      directBeastHunt: true,
    };
    CombatUI.startCombat(region, 'terrible');
  },

  showPotentBaitDialog() {
    if (GameState.phase !== 'idle' || GameState.craftedItems.potent_bait === null) return;

    const buttons = Object.entries(GAME_DATA.regions)
      .filter(([key]) => !GameState.beastsDefeated[key])
      .map(([key, data]) => `
        <button class="btn danger" onclick="UI.closeModal(); Game.startTerribleBeastHunt('${key}', true);">
          ${data.nameZh} - ${data.terribleBeast.nameZh}
        </button>
      `).join('');

    UI.showModal(`
      <div class="modal-title">使用强力诱饵</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        消耗强力诱饵，选择一个未击败的区域恐怖巨兽立即遭遇；无需发现巢穴。若逃离，剩余搜索次数仍可继续使用。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">${buttons || '<div style="text-align:center;">没有可挑战的恐怖巨兽。</div>'}</div>
      <div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>
    `);
  },

  showBloodLureDialog() {
    if (GameState.phase !== 'idle' || GameState.craftedItems.blood_lure === null) return;

    const buttons = Object.entries(GAME_DATA.regions).map(([key, data]) => `
      <button class="btn primary" onclick="Game.showBloodLureBeasts('${key}')">
        ${data.nameZh}
      </button>
    `).join('');

    UI.showModal(`
      <div class="modal-title">使用血饵</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        消耗血饵，选择一个区域和一种当地普通怪物，立即遭遇。该行动会作为一次搜索日结算。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">${buttons}</div>
      <div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>
    `);
  },

  showBloodLureBeasts(region) {
    if (GameState.phase !== 'idle' || GameState.craftedItems.blood_lure === null) return;
    const regionData = GAME_DATA.regions[region];
    const buttons = regionData.commonBeasts.map((beast, index) => `
      <button class="btn primary" onclick="UI.closeModal(); Game.startBloodLureCombat('${region}', ${index});">
        Lv${beast.level} ${beast.nameZh} | HP ${beast.hp} | 掉落 ${GAME_DATA.materialNames[beast.material]}
      </button>
    `).join('');

    UI.showModal(`
      <div class="modal-title">血饵 - ${regionData.nameZh}</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        选择一种当地普通怪物立即遭遇。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">${buttons}</div>
      <div class="confirm-actions">
        <button class="btn" onclick="Game.showBloodLureDialog()">返回</button>
      </div>
    `);
  },

  startBloodLureCombat(region, beastIndex) {
    if (GameState.phase !== 'idle' || GameState.craftedItems.blood_lure === null) return;
    const beast = GAME_DATA.regions[region].commonBeasts[beastIndex];
    if (!beast) return;

    GameState.craftedItems.blood_lure -= 1;
    if (GameState.craftedItems.blood_lure <= 0) GameState.craftedItems.blood_lure = null;
    GameState.search = {
      originRegion: region,
      region,
      boxIndex: null,
      rollCount: 0,
      rolls: [],
      emptyBoxes: [],
      boxesCompleted: 1,
      maxSearches: 1,
      quickSearchUsed: true,
      directBeastHunt: false,
      bloodLure: true,
    };
    GameLog.add(`使用血饵，引来了 ${beast.nameZh}。`);
    CombatUI.startCombat(region, 'common', beast);
  },

  doRest() {
    GameState.heal(2);
    GameState.advanceDay('rest');
    GameLog.add('休息了一天，恢复了 2 HP。');
    UI.render();
    this.onDayAdvanced();
  },

  // === Build ===
  showBuildDialog() {
    if (GameState.phase !== 'idle') return;

    let html = `
      <div class="modal-title">建造防御塔</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        选择一座塔开始建造。需要花费 1 个普通材料。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    const towerNames = { south: '南方塔', west: '西南塔', east: '东方塔' };
    for (const [key, tower] of Object.entries(GameState.towers)) {
      if (tower.complete) {
        html += `<button class="btn" disabled>${towerNames[key]} - ✓ 已完成</button>`;
      } else {
        const canBuild = GameState.materials.stone > 0 || GameState.materials.cord > 0 || GameState.materials.tar > 0;
        html += `
          <button class="btn ${canBuild ? 'primary' : ''}" ${canBuild ? '' : 'disabled'}
                  onclick="UI.closeModal(); BuildUI.selectMaterial('${key}');">
            ${towerNames[key]}
          </button>
        `;
      }
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>`;
    UI.showModal(html);
  },

  // === Forge ===
  showForgeDialog() {
    if (GameState.phase !== 'idle') return;

    let html = `
      <div class="modal-title">锻造装备</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        消耗稀有材料，掷骰锻造强大装备。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    for (const eq of GAME_DATA.equipment) {
      const key = eq.name.toLowerCase().replace(/ /g, '_');
      const currentLevel = GameState.equipment[key];
      const hasMaterial = GameState.hasMaterial(eq.requires, 1);

      if (currentLevel === 'mastercraft') {
        html += `<button class="btn" disabled>${eq.nameZh} - ✓ 精工</button>`;
      } else {
        html += `
          <button class="btn ${hasMaterial ? 'primary' : ''}" ${hasMaterial ? '' : 'disabled'}
                  onclick="UI.closeModal(); ForgeUI.start('${key}');">
            ${eq.nameZh} ${currentLevel === 'standard' ? '(已标准，可精工)' : ''}
            <span style="font-size:11px; opacity:07;"> - 需要 ${GAME_DATA.materialNames[eq.requires]}</span>
          </button>
        `;
      }
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>`;
    UI.showModal(html);
  },

  // === Craft ===
  showCraftDialog() {
    if (GameState.phase !== 'idle') return;

    let html = `
      <div class="modal-title">合成物品</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        消耗材料合成有用的物品。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    for (const recipe of GAME_DATA.craftingRecipes) {
      const key = recipe.name.toLowerCase().replace(/ /g, '_');
      const alreadyCrafted = GameState.craftedItems[key] !== null;
      const wasCrafted = Boolean(GameState.craftedItemHistory[key]);
      const canCraft = Object.entries(recipe.requires).every(([mat, amt]) => GameState.hasMaterial(mat, amt));

      const reqText = Object.entries(recipe.requires)
        .map(([mat, amt]) => `${GAME_DATA.materialNames[mat]} x${amt}`)
        .join(' + ');

      html += `
        <div class="item-card">
          <div style="flex:1;">
            <div class="item-name">${recipe.nameZh} ${alreadyCrafted ? '✓' : wasCrafted ? '(已用，可再造)' : ''}</div>
            <div class="item-effect">${recipe.effect}</div>
            <div style="font-size:11px; color:var(--ink-faint); margin-top:2px;">需要: ${reqText}</div>
          </div>
          <button class="btn ${canCraft && !alreadyCrafted ? 'primary' : ''}" ${canCraft && !alreadyCrafted ? '' : 'disabled'}
                  onclick="UI.closeModal(); CraftUI.craft('${key}');">
            ${wasCrafted ? '再造' : '合成'}
          </button>
        </div>
      `;
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>`;
    UI.showModal(html);
  },

  // === Inventory ===
  showInventory() {
    let html = `<div class="modal-title">物品栏</div>`;

    // Toolbelt
    html += `<div style="margin-bottom:16px;"><div class="panel-title">初始物品 Toolbelt</div>`;
    for (const item of GAME_DATA.toolbeltItems) {
      const key = item.name.toLowerCase().replace(/ /g, '_');
      const used = GameState.toolbelt[key];
      html += `
        <div class="item-card">
          <div style="flex:1;">
            <div class="item-name">${item.nameZh}</div>
            <div class="item-effect">${item.effect}</div>
          </div>
          <span class="item-status ${used ? 'used' : 'available'}">${used ? '已使用' : '可用'}</span>
        </div>
      `;
    }
    html += `</div>`;

    // Crafted items
    html += `<div style="margin-bottom:16px;"><div class="panel-title">合成物品 Crafted Items</div>`;
    for (const recipe of GAME_DATA.craftingRecipes) {
      const key = recipe.name.toLowerCase().replace(/ /g, '_');
      const status = GameState.craftedItems[key];
      const wasCrafted = Boolean(GameState.craftedItemHistory[key]);
      if (status !== null || wasCrafted) {
        const owned = status !== null;
        html += `
          <div class="item-card">
            <div style="flex:1;">
              <div class="item-name">${recipe.nameZh}</div>
              <div class="item-effect">${recipe.effect}</div>
            </div>
            <span class="item-status ${owned ? 'available' : 'used'}">${owned ? (typeof status === 'number' ? `${status}次` : '可用') : '已用，可再造'}</span>
          </div>
        `;
      }
    }
    html += `</div>`;

    // Equipment
    html += `<div><div class="panel-title">装备 Equipment</div>`;
    for (const eq of GAME_DATA.equipment) {
      const key = eq.name.toLowerCase().replace(/ /g, '_');
      const level = GameState.equipment[key];
      html += `
        <div class="item-card">
          <div style="flex:1;">
            <div class="item-name">${eq.nameZh}</div>
            <div class="item-effect">标准: ${eq.standard}</div>
            <div class="item-effect" style="color:var(--gold);">精工: ${eq.mastercraft}</div>
          </div>
          <span class="item-status ${level ? 'available' : 'used'}">${level ? (level === 'mastercraft' ? '精工' : '标准') : '未锻造'}</span>
        </div>
      `;
    }
    html += `</div>`;

    html += `<div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">关闭</button></div>`;
    UI.showModal(html);
  },

  // === Debug ===
  showDebug() {
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const materialInputs = Object.keys(GameState.materials).map(mat => `
      <label style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span>${GAME_DATA.materialNames[mat]}</span>
        <input type="number" min="0" max="${GAME_DATA.materialLimit}" value="${GameState.materials[mat]}"
               onchange="Game.debugSetMaterial('${mat}', this.value)" style="width:64px;">
      </label>
    `).join('');

    const regionControls = Object.entries(GAME_DATA.regions).map(([key, region]) => {
      const state = GameState.regions[key];
      return `
        <div style="padding:8px; border:1px solid var(--border); border-radius:4px; background:var(--bg-card);">
          <div style="font-weight:bold; margin-bottom:6px;">${region.nameZh}</div>
          <label><input type="checkbox" ${state.lairFound ? 'checked' : ''}
                 onchange="Game.debugSetRegion('${key}', 'lairFound', this.checked)"> 巢穴已发现</label>
          <div style="display:flex; gap:6px; margin-top:6px;">
            ${state.tracking.map((v, i) => `
              <label><input type="checkbox" ${v ? 'checked' : ''}
                     onchange="Game.debugSetTracking('${key}', ${i}, this.checked)"> 追踪${i + 1}</label>
            `).join('')}
          </div>
          <label style="display:block; margin-top:6px;"><input type="checkbox" ${GameState.beastsDefeated[key] ? 'checked' : ''}
                 onchange="Game.debugSetBeastDefeated('${key}', this.checked)"> 巨兽已击败</label>
        </div>
      `;
    }).join('');

    const equipmentControls = Object.keys(GameState.equipment).map(key => `
      <label style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
        <span>${key.replace(/_/g, ' ')}</span>
        <select onchange="Game.debugSetEquipment('${key}', this.value)">
          <option value="" ${GameState.equipment[key] === null ? 'selected' : ''}>无</option>
          <option value="standard" ${GameState.equipment[key] === 'standard' ? 'selected' : ''}>标准</option>
          <option value="mastercraft" ${GameState.equipment[key] === 'mastercraft' ? 'selected' : ''}>精工</option>
        </select>
      </label>
    `).join('');

    const towerNames = { south: '南方塔', west: '西南塔', east: '东方塔' };
    const towerControls = Object.entries(GameState.towers).map(([key, tower]) => {
      const activeCount = BuildUI.getActiveIndices(key).length;
      const xCount = BuildUI.countFaults(key, tower.grid);
      return `
        <div style="padding:8px; border:1px solid var(--border); border-radius:4px; background:var(--bg-card);">
          <div style="font-weight:bold; margin-bottom:6px;">${towerNames[key]}</div>
          <label style="display:block;"><input type="checkbox" ${tower.complete ? 'checked' : ''}
                 onchange="Game.debugSetTowerComplete('${key}', this.checked)"> 已完成 / 可阻挡</label>
          <label style="display:block; margin-top:6px;"><input type="checkbox" ${tower.destroyed ? 'checked' : ''}
                 onchange="Game.debugSetTowerDestroyed('${key}', this.checked)"> 已摧毁标记</label>
          <label style="display:block; margin-top:6px;"><input type="checkbox" ${tower.hawkTotem ? 'checked' : ''}
                 onchange="Game.debugSetTowerHawk('${key}', this.checked)"> 鹰图腾</label>
          <label style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-top:6px;">
            <span>塔内X数量</span>
            <input type="number" min="0" max="${activeCount}" value="${xCount}"
                   onchange="Game.debugSetTowerFaults('${key}', this.value)" style="width:64px;">
          </label>
        </div>
      `;
    }).join('');

    const html = `
      <div class="modal-title">调试模式</div>
      <div style="font-size:13px; line-height:1.6; max-height:65vh; overflow-y:auto;">
        <h3 style="margin:8px 0;">核心数值</h3>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:8px;">
          <label>HP 当前 <input type="number" min="0" max="${GameState.hp.max}" value="${GameState.hp.current}" onchange="Game.debugSetStat('hp.current', this.value)"></label>
          <label>HP 上限 <input type="number" min="0" max="20" value="${GameState.hp.max}" onchange="Game.debugSetStat('hp.max', this.value)"></label>
          <label>决心 <input type="number" min="0" max="99" value="${GameState.determination}" onchange="Game.debugSetStat('determination', this.value)"></label>
          <label>怀疑 <input type="number" min="0" max="${GameState.doubt.max}" value="${GameState.doubt.current}" onchange="Game.debugSetStat('doubt.current', this.value)"></label>
          <label>怀疑上限 <input type="number" min="1" max="99" value="${GameState.doubt.max}" onchange="Game.debugSetStat('doubt.max', this.value)"></label>
          <label>当前天数 <input type="number" min="1" max="15" value="${GameState.currentDay}" onchange="Game.debugSetStat('currentDay', this.value)"></label>
        </div>

        <h3 style="margin:12px 0 8px;">村民小屋</h3>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          ${GameState.huts.map((v, i) => `<label><input type="checkbox" ${v ? 'checked' : ''} onchange="Game.debugSetHut(${i}, this.checked)"> 小屋${i + 1}完好</label>`).join('')}
        </div>

        <h3 style="margin:12px 0 8px;">材料（上限 ${GAME_DATA.materialLimit}）</h3>
        <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px 16px;">${materialInputs}</div>

        <h3 style="margin:12px 0 8px;">区域、追踪与巨兽</h3>
        <div style="display:grid; grid-template-columns:1fr; gap:8px;">${regionControls}</div>

        <h3 style="margin:12px 0 8px;">防御塔</h3>
        <div style="display:grid; grid-template-columns:1fr; gap:8px;">${towerControls}</div>

        <h3 style="margin:12px 0 8px;">装备</h3>
        <div style="display:grid; grid-template-columns:1fr; gap:6px;">${equipmentControls}</div>
      </div>
      <div class="confirm-actions">
        <button class="btn" onclick="UI.closeModal(); UI.render();">关闭</button>
      </div>
    `;

    UI.showModal(html);
  },

  debugNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.floor(num) : fallback;
  },

  debugSetStat(path, value) {
    const num = this.debugNumber(value);
    if (path === 'hp.current') GameState.hp.current = Math.max(0, Math.min(num, GameState.hp.max));
    if (path === 'hp.max') {
      GameState.hp.max = Math.max(0, num);
      GameState.hp.current = Math.min(GameState.hp.current, GameState.hp.max);
    }
    if (path === 'determination') GameState.determination = Math.max(0, num);
    if (path === 'doubt.current') GameState.doubt.current = Math.max(0, Math.min(num, GameState.doubt.max));
    if (path === 'doubt.max') {
      GameState.doubt.max = Math.max(1, num);
      GameState.doubt.current = Math.min(GameState.doubt.current, GameState.doubt.max);
    }
    if (path === 'currentDay') GameState.currentDay = Math.max(1, Math.min(15, num));
    UI.render();
  },

  debugSetMaterial(mat, value) {
    GameState.materials[mat] = Math.max(0, Math.min(GAME_DATA.materialLimit || 4, this.debugNumber(value)));
    UI.render();
  },

  debugSetHut(index, intact) {
    GameState.huts[index] = Boolean(intact);
    UI.render();
  },

  debugSetRegion(region, key, value) {
    GameState.regions[region][key] = Boolean(value);
    UI.render();
  },

  debugSetTracking(region, index, value) {
    GameState.regions[region].tracking[index] = Boolean(value);
    UI.render();
  },

  debugSetBeastDefeated(region, value) {
    GameState.beastsDefeated[region] = Boolean(value);
    UI.render();
  },

  debugSetEquipment(key, value) {
    GameState.equipment[key] = value || null;
    UI.render();
  },

  debugFillTower(towerKey, faultCount = 0) {
    const tower = GameState.towers[towerKey];
    const activeIndices = BuildUI.getActiveIndices(towerKey);
    tower.grid = GameState.createTowerGrid(towerKey);
    activeIndices.forEach((index, i) => {
      tower.grid[index] = i < faultCount ? 'X' : 1;
    });
    tower.destroyed = false;
  },

  debugSetTowerComplete(towerKey, complete) {
    const tower = GameState.towers[towerKey];
    if (!tower) return;
    if (complete) {
      this.debugFillTower(towerKey, BuildUI.countFaults(towerKey, tower.grid));
      tower.complete = true;
      tower.destroyed = false;
    } else {
      tower.complete = false;
      tower.hawkTotem = false;
      tower.destroyed = false;
      tower.grid = GameState.createTowerGrid(towerKey);
    }
    UI.render();
    this.showDebug();
  },

  debugSetTowerHawk(towerKey, enabled) {
    const tower = GameState.towers[towerKey];
    if (!tower) return;
    if (enabled && !tower.complete) {
      this.debugFillTower(towerKey, BuildUI.countFaults(towerKey, tower.grid));
      tower.complete = true;
    }
    tower.hawkTotem = Boolean(enabled);
    if (enabled) tower.destroyed = false;
    UI.render();
    this.showDebug();
  },

  debugSetTowerDestroyed(towerKey, destroyed) {
    const tower = GameState.towers[towerKey];
    if (!tower) return;
    tower.destroyed = Boolean(destroyed);
    if (tower.destroyed) {
      tower.complete = false;
      tower.hawkTotem = false;
      tower.grid = GameState.createTowerGrid(towerKey);
    }
    UI.render();
    this.showDebug();
  },

  debugSetTowerFaults(towerKey, value) {
    const tower = GameState.towers[towerKey];
    if (!tower) return;
    const activeCount = BuildUI.getActiveIndices(towerKey).length;
    const faultCount = Math.max(0, Math.min(activeCount, this.debugNumber(value)));
    this.debugFillTower(towerKey, faultCount);
    tower.complete = true;
    tower.destroyed = false;
    UI.render();
    this.showDebug();
  },

  // === Help ===
  showHelp() {
    const html = `
      <div class="modal-title">游戏规则</div>
      <div style="font-size:13px; line-height:1.6; max-height:60vh; overflow-y:auto;">
        <h3 style="margin:12px 0 8px;">目标</h3>
        <p>在14天内击败三只恐怖巨兽，赢得村民信任。</p>
        <p>材料库存每种最多保存4个，获得材料时若没有空格，超出的材料会被弃置。</p>

        <h3 style="margin:12px 0 8px;">每日行动（选一）</h3>
        <ul style="padding-left:20px;">
          <li><b>搜索</b> - 每区有6个搜索格；每天最多3次搜索，恶劣天气下2次</li>
          <li><b>建造</b> - 花1普通材料开始，掷2骰并按邻接规则填塔格</li>
          <li><b>锻造</b> - 花对应稀有材料开始，完成该装备的1个精炼格后结算装备</li>
          <li><b>休息</b> - 恢复2HP，消耗一天，怀疑+1</li>
        </ul>
        <p>合成物品不是每日行动；可在任意时间合成，但不能在战斗中合成。</p>

        <h3 style="margin:12px 0 8px;">搜索规则</h3>
        <p>选区域和空搜索格 → 掷2骰并填入6个空位 → 重复到该格填满 → 计算上方3位数减下方3位数。结果100~555或-1~-555为遭遇；11~99为追踪+1普通材料；1~10为找到巢穴，并选择1稀有或2普通材料；0为找到巢穴，并在首次发现巢穴时提供立即伏击机会。</p>
        <p>只消耗1次搜索后，可花第2次搜索移动到另一区域，并在那里进行第3次搜索或挑战已发现巢穴的恐怖巨兽；任一区域有恶劣天气时不能快速搜索，厚外套可取消此限制。</p>
        <p>恐怖巨兽战入口有三种：搜索结果本身触发巢穴发现时，可立即进入该区域恐怖巨兽战斗且不额外消耗搜索；巢穴已发现后，可花费1次搜索主动挑战；或使用强力诱饵强行遭遇。搜索结果0触发巢穴发现时，立即挑战可获得伏击加成。</p>

        <h3 style="margin:12px 0 8px;">建造规则</h3>
        <p>花1个普通材料开始 → 掷2骰 → 按邻接规则填入该塔形状中的空格。数字只能放在：空邻格 或 有相同数字的邻格旁。无法放置=故障(X)，自己选择并花费1个普通材料修补，并可在任意空格选择 X 的位置；若没有普通材料可修补，建造失败并消耗一天。全填满=完成。</p>

        <h3 style="margin:12px 0 8px;">锻造规则</h3>
        <p>每件装备需要指定稀有材料。每件装备只使用自己的1个精炼格；精炼格有3列，每列用上方个位数减下方个位数。若某列结果为负数，受到1点伤害并清空该列重做；三列非负结果相加为精炼值，可追加同类稀有材料每个-1。精炼值0=精工，1-3=标准，4+=失败。</p>

        <h3 style="margin:12px 0 8px;">长老审批</h3>
        <p>获得方式有两种：每击败1只恐怖巨兽，获得1位尚未审批长老的奖励；三座防御塔全部建成时，也可选择1位尚未审批长老获得奖励。</p>
        <p>三位长老奖励分别为：埃皮霍罗斯恢复2HP；西波罗斯获得2决心点；尼坎德罗斯恢复1个已使用的初始物品或曾打造过的合成物品。</p>

        <h3 style="margin:12px 0 8px;">合成物品</h3>
        <p>每个合成物品需要1个普通材料和1个怪物材料；同一物品当前最多拥有1个。物品用掉或毁坏后可再次合成；血饵和强力诱饵在搜索前使用，火焰盒在战斗中使用；蟹甲合成后自动装备，受到伤害时吸收最多2点，吸收2次后碎裂；复活药在HP归零时触发，鹰图腾安装到完成的塔上。</p>

        <h3 style="margin:12px 0 8px;">战斗规则</h3>
        <p>恐怖巨兽战入口：搜索结果触发巢穴发现时，可立即进入该区域恐怖巨兽战斗且不额外消耗搜索；巢穴已发现后，可花费1次搜索主动挑战；或合成强力诱饵后消耗它，无需发现巢穴也能以1次搜索挑战。搜索结果0触发巢穴发现并立即挑战时，获得伏击加成。</p>
        <p>掷2骰 → 你的攻击范围内每个骰子对怪物造成1伤害；同一轮中，怪物攻击范围内每个骰子也会对你造成1伤害，因此本轮即使击杀怪物，怪物本轮命中仍会结算。基础暴击只有双6：额外1伤害并+1决心；精工分解矛可让攻击范围内两个相同数暴击。</p>
        <p>伏击加成：你的攻击范围+1，并忽略怪物前两次战斗掷骰造成的伤害。狡猾巨兽会让你前2轮无法造成伤害，但伏击加成会取消此效果。</p>
        <p>恐怖巨兽不掉落材料。击败后，该区域巨兽标记为已击败，获得+1决心和一个长老审批；当天按“击败恐怖巨兽”结算，不增加怀疑。</p>

        <h3 style="margin:12px 0 8px;">时间轨道</h3>
        <p>时间轨道共14格，按规则书顺序：第1、4、7、10、13天为事件日（E）；第3、6、9、12天为巨兽袭击日（!）；第14天是骷髅终点。</p>
        <p>划掉E日时，为4个事件各掷1骰：1-2海尔比尔德峰，3-4海岸洞穴，5-6裂痕之地；事件持续到下个事件日。每有一个区域同时有恶劣天气和疯狂，就触发一次正常的恐怖巨兽袭击：像!日一样先掷骰决定袭击来自哪个未击败巨兽区域。</p>

        <h3 style="margin:12px 0 8px;">恐怖巨兽袭击村庄</h3>
        <p>划掉!日或触发恶劣天气+疯狂时结算袭击。先掷1骰确定袭击区域（已击败巨兽的区域重掷），再掷1骰按该区域接近方向表确定东/南/西南方向，不能用决心修改。若该方向有完成的塔，塔吸收攻击并按塔损伤表结算；鹰图腾塔受到0伤害。若没有塔，摧毁1间村民小屋。袭击结束后，实际袭击区域获得1个追踪圈。</p>
        <p>塔只阻挡对应方向：东方塔挡东（E），南方塔挡南（S），西南塔挡西南（SW）。只有已完成的塔可以阻挡；未完成或被摧毁的塔不阻挡。完成塔挡下攻击后，不毁小屋；若没有鹰图腾，则掷1骰加该塔已有X数量，按塔损伤表自动加入X或摧毁塔。</p>
        <table style="width:100%; border-collapse:collapse; margin:8px 0 12px; font-size:12px;">
          <thead>
            <tr>
              <th style="text-align:left; border-bottom:1px solid var(--border); padding:4px;">塔损伤总值</th>
              <th style="text-align:left; border-bottom:1px solid var(--border); padding:4px;">结果</th>
            </tr>
          </thead>
          <tbody>
            <tr><td style="padding:4px;">1</td><td style="padding:4px;">无伤害</td></tr>
            <tr><td style="padding:4px;">2</td><td style="padding:4px;">1点伤害：在塔建造格加入1个X</td></tr>
            <tr><td style="padding:4px;">3-5</td><td style="padding:4px;">2点伤害：在塔建造格加入2个X</td></tr>
            <tr><td style="padding:4px;">6+</td><td style="padding:4px;">塔被摧毁，清空整座塔</td></tr>
          </tbody>
        </table>
        <p>村庄有9间小屋。小屋被毁时，立即按当前已毁小屋数x2增加怀疑；例如第一间+2，第二间+4。已毁小屋还会计入每日默认怀疑。</p>

        <h3 style="margin:12px 0 8px;">怀疑</h3>
        <p>怀疑是一天最后处理的事项，在事件和袭击之后。每天结束时，只有三种例外：休息时怀疑+1；完成造塔时不加怀疑；击败恐怖巨兽时不加怀疑。除此之外，怀疑+1+被摧毁的小屋数。小屋被毁时，按当前已毁小屋数x2立即增加怀疑。</p>

        <h3 style="margin:12px 0 8px;">决心点</h3>
        <p>掷骰后可花费决心点 ±1 调整单个骰子，不能低于1或高于6。搜索、建造、锻造、战斗和逃跑掷骰后，骰子旁会出现 + / - 按钮；每点一次消耗1决心。不能修改事件骰、巨兽袭击区域骰、来袭方向骰和塔损伤骰。</p>
        <p>若一次战斗掷骰使用过决心点并形成暴击，仍造成暴击额外伤害，但不能获得暴击奖励的1决心。获得方式：找到巢穴、暴击、完美建造、精工锻造、HP降到1、获得西波罗斯审批。</p>

        <h3 style="margin:12px 0 8px;">初始物品</h3>
        <p>幸运符在掷骰后显示在骰子旁，可重掷全部骰子，同一次掷骰最多重掷3次，必须接受最终结果。平衡之刃和光学扰乱器在战斗界面点击“使用物品”使用：前者立即造成1点伤害，后者立即逃离战斗。</p>

        <h3 style="margin:12px 0 8px;">调试模式</h3>
        <p>点击“调试”可修改 HP、决心、怀疑、天数、小屋、材料、追踪、巢穴、巨兽击败状态和装备等级，便于测试任意流程。</p>
      </div>
      <div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">关闭</button></div>
    `;
    UI.showModal(html);
  },

  // === Save/Load ===
  saveGame() {
    GameState.save(0);
    GameLog.add('游戏已保存。');
    UI.showModal(`
      <div class="modal-title">保存成功</div>
      <p style="text-align:center;">游戏进度已保存到本地存储。</p>
      <div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal()">确定</button></div>
    `);
  },

  loadGame() {
    if (GameState.load(0)) {
      GameLog.add('游戏已加载。');
      UI.render();
    } else {
      UI.showModal(`
        <div class="modal-title">加载失败</div>
        <p style="text-align:center;">没有找到保存的游戏。</p>
        <div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal()">确定</button></div>
      `);
    }
  },

  // === Check Game End ===
  checkGameEnd() {
    if (GameState.phase === 'game_over') {
      this.showGameOver();
      return true;
    }
    if (GameState.checkWinCondition()) {
      GameState.phase = 'game_over';
      this.showGameOver();
      return true;
    }
    if (GameState.currentDay > 14) {
      GameState.phase = 'game_over';
      this.showGameOver();
      return true;
    }
    return false;
  },

  // === Called after any day advancement to handle events ===
  onDayAdvanced() {
    // Get the day that was just crossed out
    const crossedDay = GameState.daysCrossed[GameState.daysCrossed.length - 1];
    if (!crossedDay) {
      this.checkGameEnd();
      return;
    }

    const dayData = GAME_DATA.timeTrack[crossedDay - 1];
    if (dayData && dayData.event) {
      // Process events (E or ! day)
      setTimeout(() => {
        Events.processDayEnd(crossedDay);
      }, 300);
    } else {
      this.finishDayAndCheck();
    }
  },

  finishDayAndCheck() {
    if (GameState.pendingDayAction) {
      GameState.calculateEndOfDayDoubt(GameState.pendingDayAction);
      GameState.pendingDayAction = null;
      UI.render();
    }
    this.checkGameEnd();
  },

  showGameOver() {
    const score = GameState.calculateScore();
    const won = GameState.checkWinCondition();

    let endingText = '';
    if (GameState.hp.current <= 0) {
      endingText = '你的力量耗尽，倒在了地上。最后那一击的冲击反而不是你注意的焦点——而是解脱感。多年来第一次，你背上的紧张消退了，温暖的宁静在世界变黑时涌上心头。';
    } else if (GameState.doubt.current >= GameState.doubt.max) {
      endingText = '人群聚集在村广场。你认出了最激烈的批评者的面孔。在石雨中你被赶出了村庄，投入了无情的荒野。';
    } else if (GameState.currentDay > 14) {
      endingText = '士兵和马匹的声音充斥着空气，烈星军团在村墙外集结。长老们认为你违背了诺言。他们将你赶出了村庄，投入了烈星军团的怀抱。';
    } else if (won) {
      endingText = '微风带来了远处铜号的声音，烈星军团开始了最后的进军。你已经证明了自己的价值。村庄长老们互相点头，西波罗斯带你进入一间小屋，关上了厚重的门帘。';
    }

    const html = `
      <div class="modal-title">游戏结束</div>
      <div class="gameover-panel">
        <div class="gameover-result ${won ? 'win' : 'lose'}">${won ? '胜利！' : '失败...'}</div>
        <div class="gameover-text">${endingText}</div>
        <div class="score-breakdown">
          <div class="panel-title" style="text-align:center;">计分</div>
          ${this.renderScoreBreakdown()}
          <div class="score-row score-total"><span>总分</span><span>${score}</span></div>
        </div>
        <div class="confirm-actions">
          <button class="btn primary" onclick="UI.closeModal(); Game.newGame();">新游戏</button>
        </div>
      </div>
    `;
    UI.showModal(html);
  },

  renderScoreBreakdown() {
    const rows = Scoring.getBreakdown({ includeZero: true });
    let currentSection = '';
    let html = '';
    for (const row of rows) {
      if (row.section !== currentSection) {
        currentSection = row.section;
        html += `<div style="font-size:12px; font-weight:bold; color:var(--ink-dark); margin-top:8px;">${currentSection}</div>`;
      }
      html += `
        <div class="score-row ${row.bonus ? 'score-bonus' : ''}">
          <span title="${row.detail || ''}">${row.label}</span>
          <span>${row.points > 0 ? '+' : ''}${row.points}</span>
        </div>
      `;
    }
    return html;
  },
};

// === Game Log ===
const GameLog = {
  add(message) {
    GameState.log.push({ time: new Date(), message });
    const el = document.getElementById('game-log');
    if (el) {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      const text = `> ${message}`;
      if (typeof I18n !== 'undefined') I18n.setText(entry, text);
      else entry.textContent = text;
      el.appendChild(entry);
      el.scrollTop = el.scrollHeight;
    }
  },
};

// === Initialize on DOM ready ===
document.addEventListener('DOMContentLoaded', () => {
  Version.render();
  I18n.init();
  const coverScreen = document.getElementById('cover-screen');
  const gameInterface = document.getElementById('game-interface');
  const startButton = document.getElementById('btn-start-game');

  startButton?.addEventListener('click', () => {
    coverScreen.remove();
    gameInterface.hidden = false;
    document.body.classList.remove('cover-active');
    window.scrollTo({ top: 0, behavior: 'auto' });
  });

  Game.init();
});
