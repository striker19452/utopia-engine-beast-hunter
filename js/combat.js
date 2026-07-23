// ============================================
// Utopia Engine: Beast Hunter - Combat UI
// ============================================

const CombatUI = {
  startCombat(region, beastType, specificBeast, options = {}) {
    const regionData = GAME_DATA.regions[region];
    let beast;

    if (beastType === 'terrible') {
      beast = regionData.terribleBeast;
    } else {
      beast = specificBeast;
    }

    let beastHp = beast.hp || 1;

    // Madness event: +2 HP to all beasts in this region
    if (GameState.activeEvents[region].includes('Madness')) {
      beastHp += 2;
    }

    let nature = null;
    if (beastType === 'terrible') {
      // Use persisted nature if already determined
      if (GameState.beastNature[region]) {
        nature = GameState.beastNature[region];
      } else {
        // Roll for nature (first time only)
        const natureRoll = Dice.roll(1)[0];
        nature = beast.nature[natureRoll];
        GameState.beastNature[region] = nature;
      }
    }

    GameState.startCombat(region, beastType, { ...beast, hp: beastHp });
    const wounds = this.getSavedWounds(region, beastType, beast);
    if (wounds > 0) {
      GameState.combat.maxHp = beastHp;
      GameState.combat.beastHp = Math.max(1, beastHp - wounds);
    }
    GameState.combat.ambushBonus = Boolean(options.ambushBonus);
    GameState.combat.roundCount = 0;
    if (nature) {
      GameState.combat.nature = nature;
    }

    this.renderCombat();
  },

  renderCombat() {
    const combat = GameState.combat;
    if (!combat) return;

    const beast = combat.beast;
    const regionData = GAME_DATA.regions[combat.region];
    const threatLabel = combat.beastType === 'terrible' ? '恐怖巨兽' : '遭遇怪物';
    const portraitHtml = beast.image
      ? `<figure class="beast-portrait">
          <img src="${beast.image}" alt="${beast.nameZh}，${beast.name}" draggable="false">
          <figcaption>${threatLabel}</figcaption>
        </figure>`
      : '';

    let hpCells = '';
    for (let i = 0; i < combat.maxHp; i++) {
      hpCells += `<div class="beast-hp-cell ${i < combat.beastHp ? 'filled' : 'empty'}">${i < combat.beastHp ? '♥' : ''}</div>`;
    }

    let natureText = '';
    if (combat.nature) {
      const natureDesc = {
        'Cowed': '温顺 - 每轮只要你造成伤害，巨兽攻击范围上限-1',
        'Cruel': '残忍 - 掷出1时造成重伤',
        'Cunning': '狡猾 - 前2轮你无法造成伤害；伏击加成可取消',
      };
      natureText = `<div class="combat-trait danger">
        特性: <b>${combat.nature}</b> - ${natureDesc[combat.nature] || ''}
      </div>`;
    }

    const ambushText = combat.ambushBonus
      ? '<div class="combat-trait info">伏击加成：你的攻击范围+1，并忽略前两次战斗掷骰造成的伤害。</div>'
      : '';

    let logHtml = combat.log.map(entry => `<div class="log-entry">${entry}</div>`).join('');

    const html = `
      <div class="modal-title">⚔ 战斗 - ${regionData.nameZh}</div>
      <div class="combat-panel">
        <div class="combat-encounter ${combat.region}">
          ${portraitHtml}
          <div class="beast-info">
            <div class="beast-name">${beast.nameZh} <span>${beast.name}</span></div>
            <div class="beast-hp-bar" aria-label="${beast.nameZh} 生命值 ${combat.beastHp}/${combat.maxHp}">${hpCells}</div>
            <div class="beast-statline">
              怪物攻击: ${beast.attackRange[0]}-${beast.attackRange[1]}
              <span aria-hidden="true">|</span> 你的攻击: ${this.formatRange(beast.playerAttackRange || beast.playerRange || [5, 6])}
            </div>
            ${natureText}
            ${ambushText}
          </div>
        </div>

        ${this.renderCombatModifiers(combat)}
        ${this.renderCombatReference(combat)}

        <div class="combat-log" id="combat-log">${logHtml || '<div class="log-entry">战斗开始！</div>'}</div>

        <div class="dice-area" id="combat-dice">
          <button class="btn primary" onclick="CombatUI.rollCombatDice()">🎲 掷骰子</button>
          <button class="btn" onclick="CombatUI.useItem()">使用物品</button>
          <button class="btn" onclick="CombatUI.flee()">逃离</button>
        </div>
      </div>
    `;

    UI.showModal(html);
    UI.scrollToLatest('#combat-log');
    UI.keepModalCurrent('#combat-dice');

    if (combat.nature === 'Cunning' && !combat.ambushBonus && combat.log.length === 0) {
      combat.log.push('<span class="log-info">⚠ 狡猾的巨兽让你前2轮无法造成伤害！</span>');
      this.renderCombat();
    }
  },

  renderCombatReference(combat) {
    const enemyLabel = this.enemyLabel(combat);
    const critText = GameState.equipment.disintegrator_lance === 'mastercraft'
      ? '暴击：掷出攻击范围内两个相同数，额外+1伤害并+1决心。'
      : '暴击：基础只有双6，额外+1伤害并+1决心。';
    const dpCritText = '如果本次战斗掷骰使用决心点才达成暴击，仍有额外伤害，但不获得暴击奖励的决心。';
    const ambushText = combat.ambushBonus
      ? '<li>伏击加成：你的攻击范围+1，并忽略前两次战斗掷骰造成的伤害。</li>'
      : '';
    const cunningText = combat.nature === 'Cunning' && !combat.ambushBonus
      ? '<li>狡猾：前2轮你无法造成伤害；伏击加成会取消此效果。</li>'
      : '';
    const terribleText = combat.beastType === 'terrible'
      ? '<li>恐怖巨兽：击败后该区域巨兽不再袭击村庄，获得+1决心和一个长老审批；当天不增加怀疑。</li>'
      : '';

    return `
      <details class="combat-reference" open>
        <summary>战斗速查</summary>
        <ul>
          <li>掷2骰；每个落在你的攻击范围内的骰子，对${enemyLabel}造成1点伤害。</li>
          <li>同一轮中，每个落在${enemyLabel}攻击范围内的骰子也会对你造成1点伤害；即使本轮击杀${enemyLabel}，本轮命中仍会结算。</li>
          <li>${critText}</li>
          <li>${dpCritText}</li>
          <li>逃离：掷2骰，至少一个骰子为5或6则成功；失败时按${enemyLabel}攻击范围结算伤害，逃离前造成的伤害会保留到下次遭遇。</li>
          ${ambushText}
          ${cunningText}
          ${terribleText}
        </ul>
      </details>
    `;
  },

  getCombatModifierInfo(combat, options = {}) {
    const beast = combat.beast;
    const nextRound = options.nextRound ?? ((combat.roundCount || 0) + 1);
    const basePlayerRange = [...(beast.playerAttackRange || beast.playerRange || [5, 6])];
    const baseBeastRange = [...beast.attackRange];
    const playerRange = [...basePlayerRange];
    const beastRange = [...baseBeastRange];
    const rangeNotes = [];
    const ruleNotes = [];

    if (GameState.equipment.silver_plate) {
      const before = this.formatRange(beastRange);
      beastRange[1] = Math.max(beastRange[0], beastRange[1] - 1);
      const after = this.formatRange(beastRange);
      rangeNotes.push(before === after ? `银甲：怪物攻击已是最低 ${after}` : `银甲：怪物攻击 ${before} → ${after}`);
      if (GameState.equipment.silver_plate === 'mastercraft') {
        ruleNotes.push('银甲精工：每次攻击最多受到1点伤害');
      }
    }

    if (GameState.equipment.disintegrator_lance) {
      const before = this.formatRange(playerRange);
      playerRange[0] = Math.max(1, playerRange[0] - 1);
      const after = this.formatRange(playerRange);
      rangeNotes.push(before === after ? `分解矛：你的攻击已是最大范围 ${after}` : `分解矛：你的攻击 ${before} → ${after}`);
      if (GameState.equipment.disintegrator_lance === 'mastercraft') {
        ruleNotes.push('分解矛精工：攻击范围内两个相同数算暴击');
      }
    }

    if (GameState.activeEvents[combat.region].includes('Sudden Clarity')) {
      const before = this.formatRange(playerRange);
      playerRange[0] = Math.max(1, playerRange[0] - 1);
      const after = this.formatRange(playerRange);
      rangeNotes.push(before === after ? `突然清醒：你的攻击已是最大范围 ${after}` : `突然清醒：你的攻击 ${before} → ${after}`);
    }

    if (combat.ambushBonus) {
      const before = this.formatRange(playerRange);
      playerRange[0] = Math.max(1, playerRange[0] - 1);
      const after = this.formatRange(playerRange);
      rangeNotes.push(before === after ? `伏击：你的攻击已是最大范围 ${after}` : `伏击：你的攻击 ${before} → ${after}`);
      ruleNotes.push(nextRound <= 2 ? `伏击防护：第${nextRound}轮忽略怪物掷骰伤害` : '伏击防护已用完');
    }

    if (combat.nature === 'Cowed') {
      ruleNotes.push('温顺：你造成伤害后，巨兽攻击范围上限再-1');
    } else if (combat.nature === 'Cruel') {
      ruleNotes.push('残忍：巨兽攻击掷出1时造成重伤');
    } else if (combat.nature === 'Cunning') {
      if (combat.ambushBonus) {
        ruleNotes.push('狡猾：已被伏击加成取消');
      } else if (nextRound <= 2) {
        ruleNotes.push(`狡猾：第${nextRound}轮你的伤害会被取消`);
      } else {
        ruleNotes.push('狡猾：前2轮效果已结束');
      }
    }

    const crabPlateUses = Number(GameState.craftedItems.crab_plate) || 0;
    if (crabPlateUses > 0) {
      ruleNotes.push(`蟹甲：受到伤害时自动吸收最多2点（剩余${crabPlateUses}次）`);
    }

    return {
      basePlayerRange,
      baseBeastRange,
      playerRange,
      beastRange,
      rangeNotes,
      ruleNotes,
    };
  },

  renderCombatModifiers(combat) {
    const info = this.getCombatModifierInfo(combat);
    const rangeChanged = this.formatRange(info.basePlayerRange) !== this.formatRange(info.playerRange)
      || this.formatRange(info.baseBeastRange) !== this.formatRange(info.beastRange);
    const notes = [...info.rangeNotes, ...info.ruleNotes];

    return `
      <div class="combat-reference" style="margin-bottom:8px;">
        <div style="font-weight:bold; color:var(--ink-dark); margin-bottom:4px;">当前战斗修正</div>
        <div style="font-size:12px; line-height:1.5;">
          你的攻击：${this.formatRange(info.playerRange)}
          <span style="color:var(--ink-light);">（基础 ${this.formatRange(info.basePlayerRange)}）</span><br>
          怪物攻击：${this.formatRange(info.beastRange)}
          <span style="color:var(--ink-light);">（基础 ${this.formatRange(info.baseBeastRange)}）</span>
          ${!rangeChanged && notes.length === 0 ? '<br><span style="color:var(--ink-faint);">暂无额外修正。</span>' : ''}
        </div>
        ${notes.length ? `<ul style="margin:6px 0 0; padding-left:18px; font-size:12px; line-height:1.45;">${notes.map(note => `<li>${note}</li>`).join('')}</ul>` : ''}
      </div>
    `;
  },

  rollCombatDice() {
    const combat = GameState.combat;
    if (!combat) return;

    const results = Dice.roll(2);
    combat.pendingRoll = results;
    combat.originalPendingRoll = [...results];
    combat.pendingRollType = 'combat';
    combat.usedDeterminationThisRoll = false;
    combat.luckRerollsThisRoll = 0;

    const diceArea = document.getElementById('combat-dice');
    diceArea.innerHTML = results.map((r, i) => `
      <div class="die rolling" style="animation-delay: ${i * 0.1}s">${r}</div>
    `).join('');
    UI.keepModalCurrent('#combat-dice');

    setTimeout(() => {
      this.renderPendingCombatRoll();
    }, 600);
  },

  modifyPendingDie(index, modifier) {
    const combat = GameState.combat;
    if (!combat || !combat.pendingRoll) return;
    if (DeterminationUI.modifyRoll(combat.pendingRoll, index, modifier)) {
      combat.usedDeterminationThisRoll = true;
      if (combat.pendingRollType === 'flee') {
        this.renderPendingFleeRoll();
      } else {
        this.renderPendingCombatRoll();
      }
    }
  },

  rerollPendingWithLuckCharm() {
    const combat = GameState.combat;
    if (!combat || !combat.pendingRoll) return;
    if (GameState.toolbelt.luck_charm && !combat.luckRerollsThisRoll) return;
    if ((combat.luckRerollsThisRoll || 0) >= 3) return;

    GameState.toolbelt.luck_charm = true;
    combat.luckRerollsThisRoll = (combat.luckRerollsThisRoll || 0) + 1;
    combat.pendingRoll = Dice.roll(combat.pendingRoll.length);
    combat.originalPendingRoll = [...combat.pendingRoll];
    combat.usedDeterminationThisRoll = false;
    if (combat.pendingRollType === 'flee') {
      this.renderPendingFleeRoll();
    } else {
      this.renderPendingCombatRoll();
    }
    UI.renderTopBar();
  },

  renderPendingCombatRoll() {
    const combat = GameState.combat;
    if (!combat || !combat.pendingRoll) return;
    const diceArea = document.getElementById('combat-dice');
    if (!diceArea) return;
    diceArea.innerHTML = `
      ${DeterminationUI.render(
        combat.pendingRoll,
        'CombatUI.modifyPendingDie',
        combat.usedDeterminationThisRoll,
        'CombatUI.rerollPendingWithLuckCharm',
        combat.luckRerollsThisRoll || 0,
      )}
      <button class="btn primary" onclick="CombatUI.resolveCombatRoll()">结算战斗骰</button>
    `;
    UI.keepModalCurrent('#combat-dice');
  },

  resolveCombatRoll() {
    const combat = GameState.combat;
    if (!combat || !combat.pendingRoll || combat.pendingRollType !== 'combat') return;

    const results = [...combat.pendingRoll];
    const originalResults = combat.originalPendingRoll ? [...combat.originalPendingRoll] : [...results];
    const usedDetermination = Boolean(combat.usedDeterminationThisRoll);
    combat.pendingRoll = null;
    combat.originalPendingRoll = null;
    combat.pendingRollType = null;
    combat.usedDeterminationThisRoll = false;
    combat.luckRerollsThisRoll = 0;
    const beast = combat.beast;
    const enemyLabel = this.enemyLabel(combat);
    const diceArea = document.getElementById('combat-dice');

      let playerDamage = 0;
      let beastDamage = 0;
      let logEntry = '';

      combat.roundCount = (combat.roundCount || 0) + 1;
      const modifierInfo = this.getCombatModifierInfo(combat, { nextRound: combat.roundCount });
      const playerAtkRange = modifierInfo.playerRange;
      const beastAtkRange = modifierInfo.beastRange;
      const modifierNotes = [...modifierInfo.rangeNotes, ...modifierInfo.ruleNotes];
      if (modifierNotes.length) {
        combat.log.push(`<span class="log-info">本轮修正：你的攻击 ${this.formatRange(playerAtkRange)}；${enemyLabel}攻击 ${this.formatRange(beastAtkRange)}。${modifierNotes.join('；')}</span>`);
      }

      // Check each die
      for (const die of results) {
        // Player attack
        if (die >= playerAtkRange[0] && die <= playerAtkRange[1]) {
          playerDamage++;
        }
        // Beast attack (ignore damage during first 2 rounds of ambush bonus)
        if (die >= beastAtkRange[0] && die <= beastAtkRange[1]) {
          if (!combat.ambushBonus || combat.roundCount > 2) {
            beastDamage++;
            // Cruel nature: 1 = grievous damage
            if (combat.nature === 'Cruel' && die === 1) {
              combat.log.push('<span class="log-damage">💀 残忍的巨兽造成了重伤！永久-1 HP上限！</span>');
              GameState.takeGrievousDamage(1);
            }
          }
        }
      }

      const mastercraftCrit = GameState.equipment.disintegrator_lance === 'mastercraft'
        && Dice.isDoubles(results)
        && results[0] >= playerAtkRange[0]
        && results[0] <= playerAtkRange[1];
      const baseCrit = results[0] === 6 && results[1] === 6;
      const originalMastercraftCrit = GameState.equipment.disintegrator_lance === 'mastercraft'
        && Dice.isDoubles(originalResults)
        && originalResults[0] >= playerAtkRange[0]
        && originalResults[0] <= playerAtkRange[1];
      const originalBaseCrit = originalResults[0] === 6 && originalResults[1] === 6;
      const originalWasCrit = originalBaseCrit || originalMastercraftCrit;
      const isCrit = baseCrit || mastercraftCrit;
      const cunningCancelsDamage = combat.nature === 'Cunning' && !combat.ambushBonus && combat.roundCount <= 2 && (playerDamage > 0 || isCrit);

      if (cunningCancelsDamage) {
        combat.log.push('<span class="log-info">狡猾特性生效，本轮你的伤害被取消。</span>');
        playerDamage = 0;
      } else if (isCrit) {
        playerDamage += 1;
        if (!usedDetermination || originalWasCrit) {
          GameState.addDetermination(1);
          combat.log.push(`<span class="log-info">★ 暴击！${baseCrit ? '双6' : '攻击范围内两个相同数'}！+1 伤害 +1 决心点！</span>`);
        } else {
          combat.log.push(`<span class="log-info">★ 暴击！${baseCrit ? '双6' : '攻击范围内两个相同数'}！+1 伤害；本次掷骰使用过决心，不获得决心点。</span>`);
        }
      }

      // Apply Cowed nature: reduce beast attack range when player deals damage
      if (combat.nature === 'Cowed' && playerDamage > 0) {
        combat.beast.attackRange[1] = Math.max(combat.beast.attackRange[0], combat.beast.attackRange[1] - 1);
        combat.log.push('<span class="log-info">巨兽被震慑，攻击范围缩小！</span>');
      }

      // Silver Plate mastercraft: max 1 damage per attack
      if (GameState.equipment.silver_plate === 'mastercraft' && beastDamage > 1) {
        beastDamage = 1;
      }

      // Crab Plate: automatically absorb up to 2 damage, then lose one use.
      beastDamage = this.applyCrabPlate(beastDamage, combat).damage;

      // Apply damage
      if (playerDamage > 0) {
        combat.beastHp -= playerDamage;
        combat.log.push(`<span class="log-info">你造成了 ${playerDamage} 点伤害！</span>`);
      }
      if (beastDamage > 0) {
        GameState.takeDamage(beastDamage);
        if (GameState.revivingDoseUsed) {
          combat.log.push(`<span class="log-damage">${enemyLabel}对你造成了 ${beastDamage} 点伤害！</span>`);
          combat.log.push(`<span class="log-heal">💊 复活药生效！恢复到 3 HP！</span>`);
        } else {
          combat.log.push(`<span class="log-damage">${enemyLabel}对你造成了 ${beastDamage} 点伤害！(HP: ${GameState.hp.current}/${GameState.hp.max})</span>`);
        }
      }

      logEntry = `掷出 ${results.join(', ')} → 你造成 ${playerDamage} 伤害, ${enemyLabel}造成 ${beastDamage} 伤害`;
      combat.log.push(logEntry);

      // Check combat end
      if (combat.beastHp <= 0) {
        this.victory();
      } else if (GameState.hp.current <= 0) {
        this.defeat();
      } else {
        // Reset dice display
        diceArea.innerHTML = `
          <button class="btn primary" onclick="CombatUI.rollCombatDice()">🎲 掷骰子</button>
          <button class="btn" onclick="CombatUI.useItem()">使用物品</button>
          <button class="btn" onclick="CombatUI.flee()">逃离</button>
        `;
        this.renderCombat();
      }
  },

  useItem() {
    const combat = GameState.combat;
    if (!combat) return;

    let html = `<div class="modal-title">使用物品</div><div style="display:flex; flex-direction:column; gap:8px;">`;

    // Balance Blade
    if (!GameState.toolbelt.balance_blade) {
      html += `<button class="btn" onclick="CombatUI.activateItem('balance_blade')">平衡之刃 - 立即造成1点伤害</button>`;
    }

    // Optic Disruptor (escape)
    if (!GameState.toolbelt.optic_disruptor) {
      html += `<button class="btn" onclick="CombatUI.activateItem('optic_disruptor')">光学扰乱器 - 逃离战斗</button>`;
    }

    // Firebox
    if (GameState.craftedItems.firebox !== null && GameState.craftedItems.firebox > 0) {
      html += `<button class="btn" onclick="CombatUI.activateItem('firebox')">火焰盒 - 立即造成2点伤害</button>`;
    }

    html += `</div><div class="confirm-actions"><button class="btn" onclick="CombatUI.renderCombat()">返回</button></div>`;
    UI.showModal(html);
  },

  formatRange(range) {
    return range[0] === range[1] ? `${range[0]}` : `${range[0]}-${range[1]}`;
  },

  enemyLabel(combat = GameState.combat) {
    return combat && combat.beastType === 'terrible' ? '巨兽' : '怪物';
  },

  applyCrabPlate(damage, combat = GameState.combat) {
    const uses = Number(GameState.craftedItems.crab_plate) || 0;
    if (damage <= 0 || uses <= 0) {
      return { damage, absorbed: 0, usesRemaining: uses, shattered: false };
    }

    const absorbed = Math.min(damage, 2);
    const usesRemaining = uses - 1;
    const shattered = usesRemaining <= 0;
    GameState.craftedItems.crab_plate = shattered ? null : usesRemaining;

    if (combat?.log) {
      const message = shattered
        ? `蟹甲自动吸收了 ${absorbed} 点伤害，随后碎裂！`
        : `蟹甲自动吸收了 ${absorbed} 点伤害（剩余${usesRemaining}次）。`;
      combat.log.push(`<span class="log-info">${message}</span>`);
    }

    return {
      damage: damage - absorbed,
      absorbed,
      usesRemaining,
      shattered,
    };
  },

  activateItem(itemKey) {
    const combat = GameState.combat;
    if (!combat) return;

    switch (itemKey) {
      case 'balance_blade':
        GameState.toolbelt.balance_blade = true;
        combat.beastHp -= 1;
        combat.log.push('<span class="log-info">使用平衡之刃，造成1点伤害！</span>');
        if (combat.beastHp <= 0) {
          this.victory();
          return;
        }
        break;

      case 'optic_disruptor':
        GameState.toolbelt.optic_disruptor = true;
        combat.log.push('<span class="log-info">使用光学扰乱器，逃离了战斗！</span>');
        this.saveCombatWounds(combat);
        const wasFromSearch = GameState.search !== null;
        GameState.combat = null;
        UI.closeModal();
        if (wasFromSearch) {
          SearchUI.showPostCombatOptions();
        } else {
          GameState.phase = 'idle';
          UI.render();
        }
        return;

      case 'firebox':
        GameState.craftedItems.firebox--;
        if (GameState.craftedItems.firebox <= 0) GameState.craftedItems.firebox = null;
        combat.beastHp -= 2;
        combat.log.push('<span class="log-info">使用火焰盒，造成2点伤害！</span>');
        if (combat.beastHp <= 0) {
          this.victory();
          return;
        }
        break;

    }

    this.renderCombat();
  },

  flee() {
    const combat = GameState.combat;
    if (!combat) return;

    // Roll both dice for escape attempt
    const results = Dice.roll(2);
    combat.pendingRoll = results;
    combat.pendingRollType = 'flee';
    combat.usedDeterminationThisRoll = false;
    combat.luckRerollsThisRoll = 0;

    const diceArea = document.getElementById('combat-dice');
    diceArea.innerHTML = results.map((r, i) => `
      <div class="die rolling" style="animation-delay: ${i * 0.1}s">${r}</div>
    `).join('');
    UI.keepModalCurrent('#combat-dice');

    setTimeout(() => {
      this.renderPendingFleeRoll();
    }, 600);
  },

  renderPendingFleeRoll() {
    const combat = GameState.combat;
    if (!combat || !combat.pendingRoll) return;
    const diceArea = document.getElementById('combat-dice');
    if (!diceArea) return;
    diceArea.innerHTML = `
      ${DeterminationUI.render(
        combat.pendingRoll,
        'CombatUI.modifyPendingDie',
        combat.usedDeterminationThisRoll,
        'CombatUI.rerollPendingWithLuckCharm',
        combat.luckRerollsThisRoll || 0,
      )}
      <button class="btn primary" onclick="CombatUI.resolveFleeRoll()">结算逃跑骰</button>
    `;
    UI.keepModalCurrent('#combat-dice');
  },

  resolveFleeRoll() {
    const combat = GameState.combat;
    if (!combat || !combat.pendingRoll || combat.pendingRollType !== 'flee') return;

    const results = [...combat.pendingRoll];
    combat.pendingRoll = null;
    combat.pendingRollType = null;
    combat.usedDeterminationThisRoll = false;
    combat.luckRerollsThisRoll = 0;
    const enemyLabel = this.enemyLabel(combat);
    const escaped = results.some(d => d >= 5);

    if (escaped) {
      // Escape successful
      combat.log.push(`<span class="log-info">掷出 ${results.join(', ')}，成功逃离！</span>`);
      this.saveCombatWounds(combat);
      const wasFromSearch = GameState.search !== null;
      GameState.combat = null;
      UI.closeModal();

      if (wasFromSearch) {
        SearchUI.showPostCombatOptions();
      } else {
        GameState.phase = 'idle';
        UI.render();
      }
    } else {
      // Escape failed - beast attacks as normal
      combat.log.push(`<span class="log-damage">掷出 ${results.join(', ')}，逃跑失败！</span>`);

      // Check if beast hits
      const beast = combat.beast;
      let beastAtkRange = [...beast.attackRange];
      if (GameState.equipment.silver_plate) {
        beastAtkRange[1] = Math.max(beastAtkRange[0], beastAtkRange[1] - 1);
      }

      let beastDamage = 0;
      for (const die of results) {
        if (die >= beastAtkRange[0] && die <= beastAtkRange[1]) {
          beastDamage++;
        }
      }

      beastDamage = this.applyCrabPlate(beastDamage, combat).damage;

      if (beastDamage > 0) {
        GameState.takeDamage(beastDamage);
        combat.log.push(`<span class="log-damage">${enemyLabel}对你造成了 ${beastDamage} 点伤害！(HP: ${GameState.hp.current}/${GameState.hp.max})</span>`);
      } else {
        combat.log.push(`<span class="log-info">${enemyLabel}未命中。</span>`);
      }

      // Check if player died
      if (GameState.hp.current <= 0) {
        this.defeat();
        return;
      }

      // Show options: continue escaping or resume combat
      const diceArea = document.getElementById('combat-dice');
      diceArea.innerHTML = `
        <button class="btn primary" onclick="CombatUI.rollCombatDice()">继续战斗</button>
        <button class="btn" onclick="CombatUI.flee()">再次尝试逃跑</button>
      `;
      this.renderCombat();
    }
  },

  victory() {
    const combat = GameState.combat;
    const beast = combat.beast;
    const region = combat.region;
    const wasFromSearch = GameState.search !== null;

    GameState.combat = null;
    GameState.phase = 'idle';

    // Only common beasts drop material. Terrible Beasts grant determination
    // and an elder's approval, but no material.
    let materialGained = 0;
    const grantsMaterial = combat.beastType !== 'terrible' && Boolean(beast.material);
    if (grantsMaterial) {
      materialGained = GameState.addMaterial(beast.material, 1);
    }

    let needsElderSelection = false;

    // If terrible beast, mark defeated and advance day with kill_beast action
    if (combat.beastType === 'terrible') {
      GameState.beastsDefeated[region] = true;
      GameState.beastWounds[region] = 0;
      GameState.addDetermination(1);

      // Check elder approval
      const approvedElders = Object.values(GameState.elders).filter(v => v).length;
      needsElderSelection = approvedElders < 3;

      // Advance day with kill_beast action (0 doubt)
      GameState.advanceDay('kill_beast');
      // Clear search state since day advanced
      GameState.search = null;
    } else {
      delete GameState.commonBeastWounds[this.commonWoundKey(combat.region, beast)];
    }

    const materialName = grantsMaterial ? GAME_DATA.materialNames[beast.material] : '';

    // Determine what to do after victory
    let afterAction;
    if (wasFromSearch && combat.beastType !== 'terrible') {
      afterAction = 'UI.closeModal(); SearchUI.showPostCombatOptions();';
    } else if (needsElderSelection) {
      afterAction = "UI.closeModal(); BuildUI.showElderSelection('beast');";
    } else {
      afterAction = 'UI.closeModal(); UI.render(); Game.onDayAdvanced();';
    }

    UI.showModal(`
      <div class="modal-title">⚔ 胜利！</div>
      <div style="text-align:center; margin:16px 0;">
        <div style="font-size:18px; font-weight:bold; color:var(--gold);">你击败了 ${beast.nameZh}！</div>
        ${materialName ? `<div style="margin-top:8px;">${materialGained > 0 ? `获得了 ${materialName}` : `${materialName} 库存已满，掉落被弃置`}</div>` : ''}
        ${combat.beastType === 'terrible' ? '<div style="margin-top:8px; color:var(--green);">+1 决心点 | 获得长老审批！</div>' : ''}
      </div>
      <div class="confirm-actions">
        <button class="btn primary" onclick="${afterAction}">确定</button>
      </div>
    `);
  },

  getSavedWounds(region, beastType, beast) {
    if (beastType === 'terrible') return GameState.beastWounds[region] || 0;
    return GameState.commonBeastWounds[this.commonWoundKey(region, beast)] || 0;
  },

  saveCombatWounds(combat) {
    if (!combat) return;
    const wounds = Math.max(0, combat.maxHp - combat.beastHp);
    if (combat.beastType === 'terrible') {
      GameState.beastWounds[combat.region] = Math.max(GameState.beastWounds[combat.region] || 0, wounds);
      return;
    }
    const key = this.commonWoundKey(combat.region, combat.beast);
    GameState.commonBeastWounds[key] = Math.max(GameState.commonBeastWounds[key] || 0, wounds);
  },

  commonWoundKey(region, beast) {
    return `${region}:${beast.name || beast.nameZh}`;
  },

  defeat() {
    GameState.combat = null;
    GameState.search = null; // Clear search state on defeat
    GameState.phase = 'game_over';
    UI.showModal(`
      <div class="modal-title">💀 你倒下了...</div>
      <div class="gameover-panel">
        <div class="gameover-result lose">游戏结束</div>
        <div class="gameover-text">你的力量耗尽，倒在了荒野之中。</div>
        <div class="confirm-actions">
          <button class="btn primary" onclick="UI.closeModal(); Game.showGameOver();">查看结果</button>
        </div>
      </div>
    `);
  },
};
