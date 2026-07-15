// ============================================
// Utopia Engine: Beast Hunter - Build UI
// ============================================

const BuildUI = {
  getShape(towerKey) {
    return GAME_DATA.towerShapes[towerKey] || ['11111', '11111', '11111', '11111', '11111'];
  },

  getCols(towerKey) {
    return this.getShape(towerKey)[0].length;
  },

  isActiveCell(towerKey, index) {
    const shape = this.getShape(towerKey);
    const cols = shape[0].length;
    const row = Math.floor(index / cols);
    const col = index % cols;
    return shape[row] && shape[row][col] === '1';
  },

  getActiveIndices(towerKey) {
    const shape = this.getShape(towerKey);
    const cols = shape[0].length;
    const indices = [];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < cols; col++) {
        if (shape[row][col] === '1') indices.push(row * cols + col);
      }
    }
    return indices;
  },

  getNeighbors(towerKey, index) {
    const shape = this.getShape(towerKey);
    const rows = shape.length;
    const cols = shape[0].length;
    const row = Math.floor(index / cols);
    const col = index % cols;
    const candidates = [];

    if (row > 0) candidates.push(index - cols);
    if (row < rows - 1) candidates.push(index + cols);
    if (col > 0) candidates.push(index - 1);
    if (col < cols - 1) candidates.push(index + 1);

    return candidates.filter(i => this.isActiveCell(towerKey, i));
  },

  isTowerComplete(towerKey, grid) {
    return this.getActiveIndices(towerKey).every(i => grid[i] !== null);
  },

  firstEmptyCell(towerKey, grid) {
    return this.getActiveIndices(towerKey).find(i => grid[i] === null);
  },

  countFilled(towerKey, grid) {
    return this.getActiveIndices(towerKey).filter(i => grid[i] !== null).length;
  },

  countFaults(towerKey, grid) {
    return this.getActiveIndices(towerKey).filter(i => grid[i] === 'X').length;
  },

  selectMaterial(towerKey) {
    let html = `
      <div class="modal-title">选择材料</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        选择一种普通材料开始建造。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    for (const mat of GAME_DATA.materials.common) {
      const count = GameState.materials[mat];
      html += `
        <button class="btn ${count > 0 ? 'primary' : ''}" ${count > 0 ? '' : 'disabled'}
                onclick="UI.closeModal(); BuildUI.startBuild('${towerKey}', '${mat}');">
          ${GAME_DATA.materialNames[mat]} (${count})
        </button>
      `;
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="UI.closeModal()">取消</button></div>`;
    UI.showModal(html);
  },

  startBuild(towerKey, material) {
    if (GameState.startBuild(towerKey, material)) {
      GameLog.add(`开始建造 ${towerKey}，消耗了 ${GAME_DATA.materialNames[material]}。`);
      this.renderBuild();
    }
  },

  renderBuild() {
    const build = GameState.build;
    if (!build) return;

    const tower = GameState.towers[build.tower];

    const shape = this.getShape(build.tower);
    const cols = this.getCols(build.tower);
    let gridHtml = `<div class="tower-grid tower-grid-shaped" style="--tower-cell-size:28px; grid-template-columns: repeat(${cols}, var(--tower-cell-size)); max-width:max-content; margin:0 auto;">`;
    for (let i = 0; i < tower.grid.length; i++) {
      const isActive = this.isActiveCell(build.tower, i);
      if (!isActive) {
        gridHtml += '<div class="tower-cell inactive"></div>';
        continue;
      }
      const val = tower.grid[i];
      const isEmpty = val === null;
      const isValid = isEmpty && this.canPlaceAt(build.tower, i, tower.grid);

      gridHtml += `<div class="tower-cell ${val !== null ? 'filled' : ''} ${!isEmpty ? '' : (isValid ? '' : 'disabled')}"
                        onclick="${isEmpty && isValid ? `BuildUI.placeCell(${i})` : ''}"
                        style="cursor:${isEmpty && isValid ? 'pointer' : 'default'};">
        ${val !== null ? val : ''}
      </div>`;
    }
    gridHtml += '</div>';

    // Count faults
    const faultCount = this.countFaults(build.tower, tower.grid);
    const hasRepairMaterial = GameState.materials.stone > 0 || GameState.materials.cord > 0 || GameState.materials.tar > 0;

    const html = `
      <div class="modal-title">建造防御塔</div>
      <div class="build-panel">
        <div class="build-instructions">
          掷2个骰子，将数字填入下方网格。<br>
          规则：数字只能放在 <b>空邻格</b> 或 <b>有相同数字的邻格</b> 旁。<br>
          无法放置 = 故障(X)，选择并花费1个普通材料修补。
        </div>
        <div style="margin:8px 0; font-size:12px;">故障: ${faultCount} | 普通材料修补: ${hasRepairMaterial ? '可用' : '不足'}</div>
        <div class="dice-area" id="build-dice">
          <button class="btn primary" onclick="BuildUI.rollDice()">🎲 掷骰子</button>
        </div>
        <div id="build-placement"></div>
        ${gridHtml}
      </div>
      <div class="confirm-actions">
        <button class="btn danger" onclick="BuildUI.abort()">放弃建造</button>
      </div>
    `;

    UI.showModal(html);
  },

  canPlaceAt(towerKey, index, grid) {
    return this.isActiveCell(towerKey, index) && grid[index] === null;
  },

  isValidPlacement(towerKey, index, value, grid) {
    if (!this.isActiveCell(towerKey, index) || grid[index] !== null) return false;

    const adjacentValues = this.getNeighbors(towerKey, index)
      .map(n => grid[n])
      .filter(v => v !== null && v !== 'X');

    // Rule: all adjacent squares are empty, OR at least one adjacent has matching number
    if (adjacentValues.length === 0) return true; // all empty
    return adjacentValues.includes(value); // at least one matching
  },

  rollDice() {
    const build = GameState.build;
    if (!build) return;

    const results = Dice.roll(2);

    const diceArea = document.getElementById('build-dice');
    diceArea.innerHTML = results.map((r, i) => `
      <div class="die rolling" style="animation-delay: ${i * 0.1}s">${r}</div>
    `).join('');
    UI.keepModalCurrent('#build-dice');

    build.pendingRoll = results;
    build.originalPendingRoll = [...results];
    build.selectedDieIndex = null;
    build.rollPlacementStarted = false;
    build.usedDeterminationThisRoll = false;
    build.luckRerollsThisRoll = 0;

    setTimeout(() => {
      this.renderPendingRollOptions();
    }, 600);
  },

  modifyPendingDie(index, modifier) {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return;
    if (build.selectedDieIndex !== null || build.rollPlacementStarted) return;
    if (DeterminationUI.modifyRoll(build.pendingRoll, index, modifier)) {
      build.usedDeterminationThisRoll = true;
      this.renderPendingRollOptions();
    }
  },

  rerollPendingWithLuckCharm() {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return;
    if (build.selectedDieIndex !== null || build.rollPlacementStarted) return;
    if (GameState.toolbelt.luck_charm && !build.luckRerollsThisRoll) return;
    if ((build.luckRerollsThisRoll || 0) >= 3) return;

    GameState.toolbelt.luck_charm = true;
    build.luckRerollsThisRoll = (build.luckRerollsThisRoll || 0) + 1;
    build.pendingRoll = Dice.roll(build.pendingRoll.length);
    build.originalPendingRoll = [...build.pendingRoll];
    build.usedDeterminationThisRoll = false;
    this.renderPendingRollOptions();
    UI.renderTopBar();
  },

  renderPendingRollOptions() {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return;

    const results = build.pendingRoll;
    const diceArea = document.getElementById('build-dice');
    if (diceArea) {
      diceArea.innerHTML = (build.selectedDieIndex === null && !build.rollPlacementStarted)
        ? DeterminationUI.render(
            results,
            'BuildUI.modifyPendingDie',
            build.usedDeterminationThisRoll,
            'BuildUI.rerollPendingWithLuckCharm',
            build.luckRerollsThisRoll || 0,
          )
        : this.renderSelectableDice();
    }

    const tower = GameState.towers[build.tower];
    const emptyIndices = this.getActiveIndices(build.tower).filter(i => tower.grid[i] === null);
    const canPlace = results.map(value => emptyIndices.some(i => this.isValidPlacement(build.tower, i, value, tower.grid)));

    if (!canPlace.some(Boolean)) {
      document.getElementById('build-placement').innerHTML = `
        <div style="margin-top:12px; font-size:13px; color:var(--red);">
          当前剩余骰子 ${results.join(' 和 ')} 无法放置。${build.rollPlacementStarted ? '本轮已开始放置，不能再用幸运符。' : '可用决心调整，或确认故障。'}
        </div>
        <div style="margin-top:8px;">
          <button class="btn danger" onclick="BuildUI.confirmFault()">确认故障</button>
        </div>
      `;
      UI.keepModalCurrent('#build-placement');
      return;
    }

    let placeHtml = '';
    if (build.selectedDieIndex === null) {
      placeHtml += `<div style="margin-top:12px; font-size:13px;">选择要放置的骰子。本轮剩余骰子都必须处理：</div>`;
      placeHtml += `<div style="display:flex; gap:8px; justify-content:center; margin-top:8px;">`;
      results.forEach((value, index) => {
        placeHtml += `<button class="btn ${canPlace[index] ? 'primary' : ''}" ${canPlace[index] ? '' : 'disabled'} onclick="BuildUI.selectDie(${index})">${value}</button>`;
      });
      placeHtml += `</div>`;
    } else {
      const value = results[build.selectedDieIndex];
      placeHtml += `
        <div style="font-size:13px; color:var(--blue); margin-top:12px;">
          点击网格中的有效位置放置 ${value}
          <button class="btn" style="padding:3px 8px; margin-left:8px;" onclick="BuildUI.clearSelectedDie()">重选骰子</button>
        </div>
      `;
      this.highlightBuildPlacements(value);
    }
    document.getElementById('build-placement').innerHTML = placeHtml;
    UI.keepModalCurrent(build.selectedDieIndex === null ? '#build-placement' : '.tower-grid');
  },

  renderSelectableDice() {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return '';
    return build.pendingRoll.map((value, index) => `
      <button class="die ${build.selectedDieIndex === index ? 'selected' : ''}" style="cursor:pointer;" onclick="BuildUI.selectDie(${index})">${value}</button>
    `).join('');
  },

  confirmFault() {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return;
    build.faultDieIndex = build.selectedDieIndex !== null ? build.selectedDieIndex : 0;
    this.handleFault([build.pendingRoll[build.faultDieIndex]]);
  },

  selectDie(index) {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return;
    if (index < 0 || index >= build.pendingRoll.length) return;

    const value = build.pendingRoll[index];
    const tower = GameState.towers[build.tower];
    const emptyIndices = this.getActiveIndices(build.tower).filter(i => tower.grid[i] === null);
    if (!emptyIndices.some(i => this.isValidPlacement(build.tower, i, value, tower.grid))) return;

    build.selectedDieIndex = index;
    this.renderPendingRollOptions();
  },

  clearSelectedDie() {
    const build = GameState.build;
    if (!build || !build.pendingRoll) return;
    build.selectedDieIndex = null;
    this.renderBuild();
    setTimeout(() => this.renderPendingRollOptions(), 0);
  },

  highlightBuildPlacements(value) {
    const build = GameState.build;
    const tower = GameState.towers[build.tower];
    const gridEl = this.getBuildGridElement();
    if (!gridEl) return;

    const cells = gridEl.children;
    for (let i = 0; i < tower.grid.length; i++) {
      if (!this.isActiveCell(build.tower, i)) continue;
      if (tower.grid[i] === null && this.isValidPlacement(build.tower, i, value, tower.grid)) {
        cells[i].style.borderColor = 'var(--blue)';
        cells[i].style.background = '#e8f0ff';
        cells[i].onclick = () => BuildUI.placeCell(i);
      } else if (tower.grid[i] === null) {
        cells[i].style.borderColor = 'var(--red-light)';
        cells[i].style.opacity = '0.5';
        cells[i].onclick = null;
      }
    }
  },

  getBuildGridElement() {
    return document.querySelector('#modal-content .tower-grid');
  },

  placeCell(index) {
    const build = GameState.build;
    if (!build || !build.pendingRoll || build.selectedDieIndex === null) return;

    const tower = GameState.towers[build.tower];
    if (tower.grid[index] !== null) return;

    const value = build.pendingRoll[build.selectedDieIndex];
    if (!this.isValidPlacement(build.tower, index, value, tower.grid)) return;

    tower.grid[index] = value;
    build.pendingRoll.splice(build.selectedDieIndex, 1);
    build.selectedDieIndex = null;
    build.rollPlacementStarted = true;

    // Check if grid is complete
    if (this.isTowerComplete(build.tower, tower.grid)) {
      build.pendingRoll = null;
      build.originalPendingRoll = null;
      build.rollPlacementStarted = false;
      build.usedDeterminationThisRoll = false;
      build.luckRerollsThisRoll = 0;
      tower.complete = true;
      tower.destroyed = false;
      const hasX = this.countFaults(build.tower, tower.grid) > 0;
      if (!hasX) {
        GameState.addDetermination(1);
        GameLog.add('完美建造！+1 决心点');
      }
      GameState.advanceDay('build'); // Building: 0 doubt
      GameState.build = null;
      GameState.phase = 'idle';
      UI.closeModal();
      UI.render();
      GameLog.add(`防御塔建造完成！`);

      // Check if all 3 towers are standing → elder approval
      const allTowersComplete = Object.values(GameState.towers).every(t => t.complete);
      if (allTowersComplete) {
        setTimeout(() => BuildUI.showElderSelection(), 300);
        return;
      }

      Game.onDayAdvanced();
      return;
    }

    if (build.pendingRoll.length > 0) {
      this.renderBuild();
      setTimeout(() => this.renderPendingRollOptions(), 0);
      return;
    }

    build.pendingRoll = null;
    build.originalPendingRoll = null;
    build.rollPlacementStarted = false;
    build.usedDeterminationThisRoll = false;
    build.luckRerollsThisRoll = 0;

    this.renderBuild();
  },

  handleFault(results) {
    const build = GameState.build;
    const hasRepairMaterial = GameState.materials.stone > 0 || GameState.materials.cord > 0 || GameState.materials.tar > 0;

    if (hasRepairMaterial) {
      UI.showModal(`
          <div class="modal-title">⚠ 故障！</div>
          <p style="text-align:center; margin-bottom:16px;">
            ${results.join(' 和 ')} 无法放置在任何位置！<br>
          选择并花费 1 个普通材料修补故障。
          </p>
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${this.renderRepairMaterialButtons()}
        </div>
        <div class="confirm-actions">
          <button class="btn danger" onclick="BuildUI.abort()">放弃建造</button>
        </div>
      `);
    } else {
      // Can't repair, tower collapses
      UI.showModal(`
        <div class="modal-title">💀 塔坍塌！</div>
        <p style="text-align:center; margin-bottom:16px;">
          ${results.join(' 和 ')} 无法放置且没有材料修补！<br>
          建造失败，浪费了一天时间。
        </p>
        <div class="confirm-actions">
          <button class="btn primary" onclick="UI.closeModal(); BuildUI.abort(true);">确定</button>
        </div>
      `);
    }
  },

  showRepairMaterialSelection() {
    const build = GameState.build;
    if (!build) return;

    let html = `
      <div class="modal-title">选择修补材料</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        花费 1 个普通材料修补故障，然后选择任意空格填入 X。
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        ${this.renderRepairMaterialButtons()}
      </div>
      <div class="confirm-actions">
        <button class="btn" onclick="UI.closeModal(); BuildUI.handleFault([GameState.build?.pendingRoll?.[GameState.build?.faultDieIndex ?? 0] ?? '?'])">返回</button>
      </div>
    `;

    UI.showModal(html);
  },

  renderRepairMaterialButtons() {
    return GAME_DATA.materials.common.map(mat => {
      const count = GameState.materials[mat];
      return `
        <button class="btn ${count > 0 ? 'primary' : ''}" ${count > 0 ? '' : 'disabled'}
                onclick="UI.closeModal(); BuildUI.startRepairFault('${mat}');">
          ${GAME_DATA.materialNames[mat]} (${count})
        </button>
      `;
    }).join('');
  },

  startRepairFault(material) {
    const build = GameState.build;
    if (!build) return;
    if (!GameState.removeMaterial(material, 1)) return;

    build.repairingFault = true;
    build.repairMaterial = material;
    build.selectedDieIndex = null;
    GameLog.add(`消耗了 ${GAME_DATA.materialNames[material]} 修补故障，请选择 X 的位置。`);
    this.renderRepairPlacement();
  },

  renderRepairPlacement() {
    const build = GameState.build;
    if (!build || !build.repairingFault) return;

    this.renderBuild();
    const tower = GameState.towers[build.tower];
    const gridEl = this.getBuildGridElement();
    if (gridEl) {
      const cells = gridEl.children;
      for (let i = 0; i < tower.grid.length; i++) {
        if (!this.isActiveCell(build.tower, i)) continue;
        if (tower.grid[i] === null) {
          cells[i].style.borderColor = 'var(--red)';
          cells[i].style.background = '#fbe8e5';
          cells[i].onclick = () => BuildUI.placeRepairFault(i);
        } else {
          cells[i].onclick = null;
        }
      }
    }

    const placementEl = document.getElementById('build-placement');
    if (placementEl) {
      placementEl.innerHTML = '<div style="font-size:13px; color:var(--red);">选择任意空格填入 X 以修补故障。</div>';
    }

    const diceArea = document.getElementById('build-dice');
    if (diceArea) {
      diceArea.innerHTML = '<button class="btn" disabled>正在修补故障</button>';
    }
    UI.keepModalCurrent('#build-placement');
  },

  placeRepairFault(index) {
    const build = GameState.build;
    if (!build || !build.repairingFault) return;
    const tower = GameState.towers[build.tower];
    if (!this.isActiveCell(build.tower, index) || tower.grid[index] !== null) return;

    tower.grid[index] = 'X';
    build.repairingFault = false;
    build.repairMaterial = null;

    if (build.pendingRoll && build.pendingRoll.length > 0) {
      const faultIndex = build.faultDieIndex ?? 0;
      build.pendingRoll.splice(faultIndex, 1);
    }
    build.faultDieIndex = null;
    build.selectedDieIndex = null;
    GameLog.add('已选择故障修补位置。');

    this.afterBuildCellChanged();
  },

  afterBuildCellChanged() {
    const build = GameState.build;
    if (!build) return;
    const tower = GameState.towers[build.tower];

    if (this.isTowerComplete(build.tower, tower.grid)) {
      tower.complete = true;
      tower.destroyed = false;
      GameState.advanceDay('build');
      GameState.build = null;
      GameState.phase = 'idle';
      UI.closeModal();
      UI.render();
      GameLog.add('防御塔建造完成！');

      const allTowersComplete = Object.values(GameState.towers).every(t => t.complete);
      if (allTowersComplete) {
        setTimeout(() => BuildUI.showElderSelection(), 300);
        return;
      }

      Game.onDayAdvanced();
      return;
    }

    if (build.pendingRoll && build.pendingRoll.length > 0) {
      this.renderBuild();
      setTimeout(() => this.renderPendingRollOptions(), 0);
      return;
    }

    build.pendingRoll = null;
    build.originalPendingRoll = null;
    build.rollPlacementStarted = false;
    build.usedDeterminationThisRoll = false;
    build.luckRerollsThisRoll = 0;
    this.renderBuild();
  },

  showElderSelection(source = 'towers') {
    const isBeastReward = source === 'beast';
    const title = isBeastReward ? '⚔ 巨兽已败！' : '🏘 三塔全立！';
    const description = isBeastReward
      ? '你击败了一只恐怖巨兽！村庄长老们改变了对你的看法。'
      : '三座防御塔全部建成！村庄长老们改变了对你的看法。';

    let html = `
      <div class="modal-title">${title}</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        ${description}<br>
        选择一位长老获得奖励：
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    for (const elder of GAME_DATA.elders) {
      const key = elder.name.toLowerCase();
      const approved = GameState.elders[key];
      html += `
        <button class="btn ${approved ? '' : 'primary'}" ${approved ? 'disabled' : ''}
                onclick="UI.closeModal(); BuildUI.selectElder('${key}');">
          ${elder.nameZh} (${elder.name}) - ${elder.reward}
          ${approved ? ' ✓ 已审批' : ''}
        </button>
      `;
    }

    html += `</div>`;
    UI.showModal(html);
  },

  selectElder(elderKey) {
    if (GameState.approveElder(elderKey)) {
      const elder = GAME_DATA.elders.find(e => e.name.toLowerCase() === elderKey);
      GameLog.add(`获得 ${elder.nameZh} 的审批！${elder.reward}`);

      // Special handling for Nikandros (recharge item)
      if (elder.rewardType === 'recharge') {
        this.showRechargeUI();
        return;
      }

      UI.showModal(`
        <div class="modal-title">✓ 获得审批</div>
        <div style="text-align:center; margin:16px 0;">
          <div style="font-size:18px; font-weight:bold; color:var(--gold);">${elder.nameZh}</div>
          <div style="margin-top:8px;">${elder.reward}</div>
        </div>
        <div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal(); Game.onDayAdvanced();">确定</button></div>
      `);
    }
  },

  showRechargeUI() {
    let html = `
      <div class="modal-title">恢复物品</div>
      <p style="text-align:center; margin-bottom:16px; font-size:13px; color:var(--ink-medium);">
        选择一个已使用的物品恢复：
      </p>
      <div style="display:flex; flex-direction:column; gap:8px;">
    `;

    // Check toolbelt items
    for (const item of GAME_DATA.toolbeltItems) {
      const key = item.name.toLowerCase().replace(/ /g, '_');
      if (GameState.toolbelt[key]) {
        html += `
          <button class="btn primary" onclick="UI.closeModal(); BuildUI.rechargeItem('toolbelt', '${key}');">
            ${item.nameZh} (初始物品)
          </button>
        `;
      }
    }

    // Check crafted items (single-use ones that are spent)
    for (const recipe of GAME_DATA.craftingRecipes) {
      const key = recipe.name.toLowerCase().replace(/ /g, '_');
      if (GameState.craftedItems[key] === null && GameState.craftedItemHistory[key] && key !== 'heavy_coat') {
        // Item was crafted and used up
        html += `
          <button class="btn primary" onclick="UI.closeModal(); BuildUI.rechargeItem('crafted', '${key}');">
            ${recipe.nameZh} (合成物品)
          </button>
        `;
      }
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="UI.closeModal(); Game.onDayAdvanced();">跳过</button></div>`;
    UI.showModal(html);
  },

  rechargeItem(type, key) {
    if (type === 'toolbelt') {
      GameState.toolbelt[key] = false; // Mark as unused
      const item = GAME_DATA.toolbeltItems.find(i => i.name.toLowerCase().replace(/ /g, '_') === key);
      GameLog.add(`恢复了 ${item.nameZh}！`);
    } else if (type === 'crafted') {
      if (key === 'crab_plate') {
        GameState.craftedItems[key] = 2; // Restore 2 uses
      } else {
        GameState.craftedItems[key] = 1; // Restore 1 use
      }
      const recipe = GAME_DATA.craftingRecipes.find(r => r.name.toLowerCase().replace(/ /g, '_') === key);
      GameLog.add(`恢复了 ${recipe.nameZh}！`);
    }

    UI.render();
    Game.onDayAdvanced();
  },

  abort(collapsed = false) {
    const build = GameState.build;
    if (!build) return;

    if (collapsed) {
      // Reset the tower grid
      GameState.towers[build.tower].grid = GameState.createTowerGrid(build.tower);
      GameState.advanceDay('default'); // Failed build: default doubt
      GameLog.add('建造失败，浪费了一天。');
    }

    GameState.build = null;
    GameState.phase = 'idle';
    UI.closeModal();
    UI.render();
    if (collapsed) {
      Game.onDayAdvanced();
    } else {
      Game.checkGameEnd();
    }
  },
};
