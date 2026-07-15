// ============================================
// Utopia Engine: Beast Hunter - Forge UI
// ============================================

const ForgeUI = {
  start(equipmentKey) {
    const eq = this.getEquipment(equipmentKey);
    if (!eq || GameState.phase !== 'idle') return;
    if (!GameState.removeMaterial(eq.requires, 1)) return;

    GameState.forge = {
      equipment: equipmentKey,
      eqNameZh: eq.nameZh,
      requiredMaterial: eq.requires,
      box: this.createBox(),
      refinedValue: null,
      pendingRoll: null,
      originalPendingRoll: null,
      selectedDieIndex: null,
      rollPlacementStarted: false,
      usedDeterminationThisRoll: false,
      luckRerollsThisRoll: 0,
      log: [],
    };
    GameState.phase = 'forging';

    GameLog.add(`开始锻造 ${eq.nameZh}，消耗了 ${GAME_DATA.materialNames[eq.requires]}。`);
    this.renderForge();
  },

  createBox() {
    return {
      top: [null, null, null],
      bottom: [null, null, null],
      results: [null, null, null],
      complete: false,
    };
  },

  getEquipment(equipmentKey = GameState.forge?.equipment) {
    return GAME_DATA.equipment.find(e => e.name.toLowerCase().replace(/ /g, '_') === equipmentKey);
  },

  renderForge() {
    const forge = GameState.forge;
    if (!forge) return;

    const eq = this.getEquipment();
    const instruction = forge.pendingRoll
      ? (forge.selectedDieIndex === null
        ? '选择要放置的骰子。'
        : `放置选中的骰子：${forge.pendingRoll[forge.selectedDieIndex]}`)
      : forge.refinedValue !== null
        ? '精炼格已完成，等待结算。'
        : '掷2骰，将每个骰子放入任意可选空位；可故意造出负数来清空某一列。';
    const logHtml = forge.log.length
      ? `<div class="combat-log" style="max-height:110px; margin-top:12px;">
          ${forge.log.map(entry => `<div class="log-entry">${entry}</div>`).join('')}
        </div>`
      : '';

    UI.showModal(`
      <div class="modal-title">锻造 - ${eq.nameZh}</div>
      <div class="forge-panel">
        <div style="font-size:13px; margin-bottom:8px; line-height:1.55;">
          ${instruction}<br>
          每个骰子都可自由选择任意未结算列的空位，不强制从左到右。每列结果 = 上方个位数 - 下方个位数。若某列结果为负数，受到1点伤害并清空该列重做。<br>
          三列非负结果相加为精炼值；之后可追加同类稀有材料，每个让精炼值-1。
        </div>
        <div class="dice-area" id="forge-dice">${this.renderDiceArea()}</div>
        <div id="forge-placement">${forge.pendingRoll ? this.renderPlacementOptions() : ''}</div>
        ${this.renderRefiningBox()}
        ${logHtml}
        <div style="margin-top:8px; font-size:12px; color:var(--ink-medium);">
          标准: ${eq.standard}<br>
          精工: ${eq.mastercraft}
        </div>
      </div>
      <div class="confirm-actions">
        ${forge.refinedValue === null ? '<button class="btn danger" onclick="ForgeUI.abort()">放弃锻造并消耗一天</button>' : ''}
      </div>
    `);
    UI.scrollToLatest('.forge-panel .combat-log');
    UI.keepModalCurrent(forge.pendingRoll ? '#forge-placement' : '#forge-dice');
  },

  renderDiceArea() {
    const forge = GameState.forge;
    if (!forge) return '';
    if (forge.refinedValue !== null) return '<button class="btn" disabled>锻造等待结算</button>';
    if (!forge.pendingRoll) return '<button class="btn primary" onclick="ForgeUI.rollDice()">🎲 掷骰子</button>';
    if (forge.selectedDieIndex === null && !forge.rollPlacementStarted) {
      return DeterminationUI.render(
        forge.pendingRoll,
        'ForgeUI.modifyPendingDie',
        forge.usedDeterminationThisRoll,
        'ForgeUI.rerollPendingWithLuckCharm',
        forge.luckRerollsThisRoll || 0,
      );
    }
    return this.renderSelectableDice();
  },

  renderRefiningBox() {
    const box = GameState.forge.box;
    const border = box.complete ? 'var(--green)' : 'var(--border)';
    return `
      <div style="display:flex; justify-content:center; margin-top:12px;">
        <div style="border:2px solid ${border}; border-radius:4px; padding:10px; background:${box.complete ? '#edf7ed' : 'transparent'};">
          <div style="font-size:12px; text-align:center; margin-bottom:6px;">精炼格</div>
          ${this.renderBoxRow(box.top)}
          ${this.renderBoxRow(box.bottom)}
          ${this.renderResultRow(box)}
        </div>
      </div>
    `;
  },

  renderBoxRow(values) {
    let html = '<div style="display:flex; gap:3px; margin-bottom:4px;">';
    for (const val of values) {
      html += `<div class="forge-cell ${val !== null ? 'filled' : ''}" style="width:32px; height:32px; font-size:14px; cursor:default;">${val !== null ? val : ''}</div>`;
    }
    html += '</div>';
    return html;
  },

  renderResultRow(box) {
    let html = '<div style="display:flex; gap:3px; margin-top:4px;">';
    for (let i = 0; i < 3; i++) {
      const result = box.results[i];
      html += `
        <div class="forge-cell ${result !== null ? 'filled' : ''}"
             style="width:32px; height:24px; font-size:12px; cursor:default; color:${result === null ? 'var(--ink-faint)' : 'var(--ink-dark)'};">
          ${result === null ? '○' : result}
        </div>
      `;
    }
    html += '</div>';
    return html;
  },

  rollDice() {
    const forge = GameState.forge;
    if (!forge || forge.pendingRoll || forge.refinedValue !== null) return;

    forge.pendingRoll = Dice.roll(2);
    forge.originalPendingRoll = [...forge.pendingRoll];
    forge.selectedDieIndex = null;
    forge.rollPlacementStarted = false;
    forge.usedDeterminationThisRoll = false;
    forge.luckRerollsThisRoll = 0;

    const diceArea = document.getElementById('forge-dice');
    if (diceArea) {
      diceArea.innerHTML = forge.pendingRoll.map((r, i) => `
        <div class="die rolling" style="animation-delay: ${i * 0.1}s">${r}</div>
      `).join('');
      UI.keepModalCurrent('#forge-dice');
    }

    setTimeout(() => this.renderForge(), 600);
  },

  modifyPendingDie(index, modifier) {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll || forge.selectedDieIndex !== null || forge.rollPlacementStarted) return;
    if (DeterminationUI.modifyRoll(forge.pendingRoll, index, modifier)) {
      forge.usedDeterminationThisRoll = true;
      this.renderForge();
    }
  },

  rerollPendingWithLuckCharm() {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll || forge.selectedDieIndex !== null || forge.rollPlacementStarted) return;
    if (GameState.toolbelt.luck_charm && !forge.luckRerollsThisRoll) return;
    if ((forge.luckRerollsThisRoll || 0) >= 3) return;

    GameState.toolbelt.luck_charm = true;
    forge.luckRerollsThisRoll = (forge.luckRerollsThisRoll || 0) + 1;
    forge.pendingRoll = Dice.roll(2);
    forge.originalPendingRoll = [...forge.pendingRoll];
    forge.usedDeterminationThisRoll = false;
    UI.renderTopBar();
    this.renderForge();
  },

  renderPlacementOptions() {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll) return '';

    if (forge.selectedDieIndex === null) {
      return `
        <div style="margin:12px 0; font-size:13px;">先选择要放置的骰子：</div>
        ${this.renderSelectableDice()}
      `;
    }

    const die = forge.pendingRoll[forge.selectedDieIndex];
    return `
      <div style="margin:12px 0; font-size:13px;">
        将 <b>${die}</b> 放入任意可选空位：
        <button class="btn" style="padding:3px 8px; margin-left:8px;" onclick="ForgeUI.clearSelectedDie()">重选骰子</button>
      </div>
      <div style="display:flex; justify-content:center; margin-bottom:12px;">
        <div style="padding:8px; border:1px solid var(--border); border-radius:4px; background:var(--bg-card);">
          ${this.renderPlacementRow('top', forge.box.top, die, '上方')}
          ${this.renderPlacementRow('bottom', forge.box.bottom, die, '下方')}
        </div>
      </div>
    `;
  },

  renderSelectableDice() {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll) return '';
    return `
      <div class="dice-area" style="margin:8px 0;">
        ${forge.pendingRoll.map((die, index) => `
          <button class="die ${forge.selectedDieIndex === index ? 'selected' : ''}" style="cursor:pointer;" onclick="ForgeUI.selectDie(${index})">
            ${die}
          </button>
        `).join('')}
      </div>
    `;
  },

  selectDie(index) {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll) return;
    if (index < 0 || index >= forge.pendingRoll.length) return;
    forge.selectedDieIndex = index;
    this.renderForge();
  },

  clearSelectedDie() {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll) return;
    forge.selectedDieIndex = null;
    this.renderForge();
  },

  renderPlacementRow(row, values, die, label) {
    let html = `<div style="display:flex; align-items:center; gap:4px; margin-bottom:4px;"><span style="width:30px; font-size:11px; color:var(--ink-medium);">${label}</span>`;
    for (let col = 0; col < values.length; col++) {
      const columnClosed = GameState.forge.box.results[col] !== null;
      if (values[col] === null && !columnClosed) {
        html += `<button class="btn" style="padding:4px 8px;" onclick="ForgeUI.placeDie('${row}', ${col})">${die}</button>`;
      } else {
        html += `<button class="btn" style="padding:4px 8px;" disabled>${values[col] !== null ? values[col] : columnClosed ? '✓' : ''}</button>`;
      }
    }
    html += '</div>';
    return html;
  },

  placeDie(row, col) {
    const forge = GameState.forge;
    if (!forge || !forge.pendingRoll || forge.refinedValue !== null || forge.selectedDieIndex === null) return;

    const targetRow = row === 'top' ? forge.box.top : forge.box.bottom;
    if (forge.box.results[col] !== null) return;
    if (targetRow[col] !== null) return;

    const placedDieIndex = forge.selectedDieIndex;
    targetRow[col] = forge.pendingRoll[placedDieIndex];
    forge.rollPlacementStarted = true;
    const resolved = this.resolveColumnIfFilled(col);
    if (resolved === 'dead') return;
    forge.pendingRoll.splice(placedDieIndex, 1);
    forge.selectedDieIndex = null;

    if (forge.pendingRoll.length > 0) {
      this.renderForge();
      return;
    }

    const rollText = forge.originalPendingRoll ? forge.originalPendingRoll.join(', ') : '本次掷骰';
    forge.pendingRoll = null;
    forge.originalPendingRoll = null;
    forge.selectedDieIndex = null;
    forge.rollPlacementStarted = false;
    forge.usedDeterminationThisRoll = false;
    forge.luckRerollsThisRoll = 0;
    forge.log.unshift(`掷出 ${rollText}，完成放置。`);

    this.resolveForgeIfComplete();
  },

  resolveColumnIfFilled(col) {
    const forge = GameState.forge;
    if (!forge || forge.box.results[col] !== null) return 'unchanged';
    const top = forge.box.top[col];
    const bottom = forge.box.bottom[col];
    if (top === null || bottom === null) return 'unchanged';

    const result = top - bottom;
    if (result < 0) {
      GameState.takeDamage(1);
      forge.box.top[col] = null;
      forge.box.bottom[col] = null;
      forge.log.unshift(`<span class="log-damage">第 ${col + 1} 列结果 ${top}-${bottom}=${result}，受到1点伤害并清空该列。</span>`);
      GameLog.add(`锻造第 ${col + 1} 列结果为负数，受到1点伤害并重置该列。`);
      if (GameState.hp.current <= 0) {
        GameState.forge = null;
        GameState.phase = 'game_over';
        UI.closeModal();
        Game.showGameOver();
        return 'dead';
      }
      return 'negative';
    }

    forge.box.results[col] = result;
    forge.log.unshift(`<span class="log-info">第 ${col + 1} 列完成：${top}-${bottom}=${result}。</span>`);
    return 'positive';
  },

  resolveForgeIfComplete() {
    const forge = GameState.forge;
    if (!forge || !forge.box.results.every(v => v !== null)) {
      this.renderForge();
      return;
    }

    forge.box.complete = true;
    forge.refinedValue = forge.box.results.reduce((sum, result) => sum + result, 0);
    forge.log.unshift(`<span class="log-info">三个结果相加：${forge.box.results.join(' + ')} = ${forge.refinedValue}。</span>`);
    this.showRefinementResult();
  },

  showRefinementResult() {
    const forge = GameState.forge;
    if (!forge || forge.refinedValue === null) return;

    const eq = this.getEquipment();
    const availableMaterial = GameState.materials[eq.requires] || 0;
    const maxSpend = Math.min(availableMaterial, forge.refinedValue);
    let spendButtons = '';

    for (let i = 0; i <= maxSpend; i++) {
      const finalValue = forge.refinedValue - i;
      const label = i === 0
        ? `不追加材料（最终 ${finalValue}：${this.resultLabel(finalValue)}）`
        : `花费 ${i} ${GAME_DATA.materialNames[eq.requires]}（最终 ${finalValue}：${this.resultLabel(finalValue)}）`;
      spendButtons += `
        <button class="btn ${finalValue <= 3 ? 'primary' : ''}" onclick="ForgeUI.complete(${i})">
          ${label}
        </button>
      `;
    }

    UI.showModal(`
      <div class="modal-title">锻造结算 - ${forge.eqNameZh}</div>
      <div class="forge-panel">
        ${this.renderRefiningBox()}
        <div style="text-align:center; margin:16px 0 12px;">
          <div style="font-size:18px; font-weight:bold;">精炼值: ${forge.refinedValue}</div>
          <div style="font-size:12px; color:var(--ink-medium); margin-top:4px;">
            可额外花费同类型稀有材料，每花费 1 个让精炼值 -1。
          </div>
          <div style="font-size:12px; color:var(--ink-medium); margin-top:4px;">
            当前可用 ${GAME_DATA.materialNames[eq.requires]}: ${availableMaterial}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:8px;">${spendButtons}</div>
      </div>
    `);
  },

  resultLabel(value) {
    if (value === 0) return '精工';
    if (value >= 1 && value <= 3) return '标准';
    return '失败';
  },

  complete(extraMaterialSpent = 0) {
    const forge = GameState.forge;
    if (!forge || forge.refinedValue === null) return;

    const eq = this.getEquipment();
    const spend = Math.max(0, Math.min(extraMaterialSpent, GameState.materials[eq.requires] || 0, forge.refinedValue));
    for (let i = 0; i < spend; i++) GameState.removeMaterial(eq.requires, 1);

    const finalValue = forge.refinedValue - spend;
    const eqName = forge.eqNameZh;
    let resultText = '锻造失败。';
    let resultColor = 'var(--red)';

    if (finalValue === 0) {
      GameState.equipment[forge.equipment] = 'mastercraft';
      GameState.addDetermination(1);
      GameLog.add(`精工锻造了 ${eqName}！+1 决心点`);
      resultText = '精工锻造成功！';
      resultColor = 'var(--gold)';
    } else if (finalValue >= 1 && finalValue <= 3) {
      GameState.equipment[forge.equipment] = 'standard';
      GameLog.add(`标准锻造了 ${eqName}！`);
      resultText = '标准锻造成功！';
      resultColor = 'var(--green)';
    } else {
      GameLog.add(`锻造 ${eqName} 失败，精炼值过高。`);
    }

    if (spend > 0) {
      GameLog.add(`追加消耗 ${spend} 个 ${GAME_DATA.materialNames[eq.requires]}，精炼值降至 ${finalValue}。`);
    }

    GameState.advanceDay('forge');
    GameState.forge = null;
    GameState.phase = 'idle';

    UI.showModal(`
      <div class="modal-title">锻造完成</div>
      <div style="text-align:center; margin:16px 0;">
        <div style="font-size:18px; font-weight:bold; color:${resultColor};">${resultText}</div>
        <div style="margin-top:8px;">最终精炼值: ${finalValue}</div>
        ${spend > 0 ? `<div style="margin-top:4px;">额外消耗 ${spend} ${GAME_DATA.materialNames[eq.requires]}</div>` : ''}
      </div>
      <div class="confirm-actions">
        <button class="btn primary" onclick="UI.closeModal(); UI.render(); Game.onDayAdvanced();">确定</button>
      </div>
    `);
  },

  abort() {
    const forge = GameState.forge;
    const eqName = forge?.eqNameZh || '装备';
    GameState.forge = null;
    GameState.phase = 'idle';
    GameState.advanceDay('forge');
    GameLog.add(`放弃锻造 ${eqName}，已投入的材料损失。`);
    UI.showModal(`
      <div class="modal-title">放弃锻造</div>
      <div style="text-align:center; margin:16px 0;">
        你放弃了这次锻造，已投入的材料损失，并消耗一天。
      </div>
      <div class="confirm-actions">
        <button class="btn primary" onclick="UI.closeModal(); UI.render(); Game.onDayAdvanced();">确定</button>
      </div>
    `);
  },
};
