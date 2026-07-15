// ============================================
// Utopia Engine: Beast Hunter - Events System
// ============================================

const Events = {
  /**
   * Process an event day (E on time track)
   */
  processEventDay() {
    const rolls = Dice.rollEvents(); // 4 dice for 4 events
    const regions = ['halebeard', 'coastal', 'scar'];
    const eventNames = ['Abundance', 'Sudden Clarity', 'Foul Weather', 'Madness'];
    const eventNamesZh = ['丰饶', '突然清醒', '恶劣天气', '疯狂'];

    // Clear previous events
    GameState.activeEvents = { halebeard: [], coastal: [], scar: [] };

    const results = [];
    for (let i = 0; i < 4; i++) {
      const region = Dice.dieToRegion(rolls[i]);
      GameState.activeEvents[region].push(eventNames[i]);
      results.push({
        event: eventNames[i],
        eventZh: eventNamesZh[i],
        region,
        regionZh: GAME_DATA.regions[region].nameZh,
        roll: rolls[i],
      });
    }

    // Check for Foul Weather + Madness on same region = Terrible Beast Attack
    for (const region of regions) {
      const events = GameState.activeEvents[region];
      if (events.includes('Foul Weather') && events.includes('Madness')) {
        if (!this.areAllTerribleBeastsDefeated()) {
          results.push({
            event: 'Terrible Beast Attack',
            eventZh: '巨兽袭击！',
            region,
            regionZh: GAME_DATA.regions[region].nameZh,
            special: true,
          });
        }
      }
    }

    UI.render();
    return results;
  },

  /**
   * Process a Terrible Beast attack on the village
   */
  processBeastAttack(region) {
    const regionData = GAME_DATA.regions[region];
    const trackingUpdate = this.markAttackTracking(region);

    // Determine direction
    const directionRoll = Dice.roll(1)[0];
    const direction = regionData.approach[directionRoll];

    // Check if tower exists in that direction
    const towerKey = this.getTowerKeyForDirection(direction);
    const tower = GameState.towers[towerKey];
    const directionInfo = this.describeAttackDirection(direction, towerKey);

    const towerStanding = this.isTowerStanding(towerKey, tower);

    if (towerStanding && !tower.hawkTotem) {
      // Tower absorbs attack
      // Roll die + number of Xs already in tower
      const xCount = BuildUI.countFaults(towerKey, tower.grid);
      const baseRoll = Dice.roll(1)[0];
      const totalRoll = baseRoll + xCount;
      const damage = this.getTowerDamage(totalRoll);

      if (damage.damage === 'destroy') {
        // Tower destroyed
        tower.complete = false;
        tower.hawkTotem = false;
        tower.destroyed = true;
        tower.grid = GameState.createTowerGrid(towerKey);
        return {
          type: 'tower_destroyed',
          direction,
          directionRoll,
          directionInfo,
          towerKey,
          towerName: directionInfo.towerName,
          towerDamageRoll: baseRoll,
          towerFaults: xCount,
          towerDamageTotal: totalRoll,
          region,
          regionZh: regionData.nameZh,
          beastName: regionData.terribleBeast.nameZh,
          trackingUpdate,
        };
      } else {
        // Add X faults to construction-grid boxes. Completed towers have no empty
        // cells, so damage replaces existing non-X cells rather than looking for
        // blanks.
        const appliedDamage = this.applyTowerDamage(towerKey, tower, damage.damage);
        return {
          type: 'tower_damage',
          direction,
          directionRoll,
          directionInfo,
          towerKey,
          towerName: directionInfo.towerName,
          towerDamageRoll: baseRoll,
          towerFaults: xCount,
          towerDamageTotal: totalRoll,
          damage: appliedDamage,
          region,
          regionZh: regionData.nameZh,
          beastName: regionData.terribleBeast.nameZh,
          trackingUpdate,
        };
      }
    } else if (towerStanding && tower.hawkTotem) {
      // Hawk totem blocks attack
      return {
        type: 'hawk_totem_block',
        direction,
        directionRoll,
        directionInfo,
        towerKey,
        towerName: directionInfo.towerName,
        region,
        regionZh: regionData.nameZh,
        beastName: regionData.terribleBeast.nameZh,
        trackingUpdate,
      };
    } else {
      // No tower, hut destroyed (if any remain)
      const hutIndex = GameState.huts.findIndex(h => h);
      if (hutIndex !== -1) {
        GameState.destroyHut(hutIndex);
      }
      return {
        type: hutIndex !== -1 ? 'hut_destroyed' : 'no_huts',
        direction,
        directionRoll,
        directionInfo,
        towerKey,
        towerName: directionInfo.towerName,
        region,
        regionZh: regionData.nameZh,
        beastName: regionData.terribleBeast.nameZh,
        trackingUpdate,
      };
    }
  },

  describeAttackDirection(direction, towerKey) {
    const directionNames = { E: '东方', S: '南方', SW: '西南' };
    const towerNames = { east: '东方塔', south: '南方塔', west: '西南塔' };
    return {
      directionName: directionNames[direction] || direction,
      towerName: towerNames[towerKey] || '对应防御塔',
    };
  },

  getTowerKeyForDirection(direction) {
    return { E: 'east', S: 'south', SW: 'west' }[direction] || null;
  },

  isTowerStanding(towerKey, tower) {
    if (!tower) return false;
    if (tower.complete) return true;
    if (typeof BuildUI !== 'undefined' && BuildUI.isTowerComplete(towerKey, tower.grid)) {
      tower.complete = true;
      return true;
    }
    return false;
  },

  applyTowerDamage(towerKey, tower, amount) {
    let applied = 0;
    const activeIndices = BuildUI.getActiveIndices(towerKey);
    for (const index of activeIndices) {
      if (applied >= amount) break;
      if (tower.grid[index] !== 'X') {
        tower.grid[index] = 'X';
        applied++;
      }
    }
    return applied;
  },

  markAttackTracking(region) {
    const regionState = GameState.regions[region];
    const emptyIdx = regionState.tracking.indexOf(false);
    const update = { added: false, completed: false, count: regionState.tracking.filter(Boolean).length };

    if (emptyIdx !== -1) {
      regionState.tracking[emptyIdx] = true;
      update.added = true;
      update.count = regionState.tracking.filter(Boolean).length;

      if (regionState.tracking.every(Boolean) && !regionState.lairFound) {
        regionState.lairFound = true;
        GameState.addDetermination(1);
        update.completed = true;
      }
    }

    return update;
  },

  /**
   * Show event results dialog
   */
  showEventResults(results) {
    let html = `
      <div class="modal-title">⚡ 事件日</div>
      <div class="event-results">
    `;

    for (const r of results) {
      const effect = this.getEventEffect(r.event);
      const borderStyle = r.special ? 'border:2px solid var(--red);' : '';
      html += `
        <div class="event-result-item" style="${borderStyle}">
          <div class="event-result-name">${r.eventZh}</div>
          <div class="event-result-region">→ ${r.regionZh}</div>
          ${effect ? `<div class="event-result-effect">${effect}</div>` : ''}
        </div>
      `;
    }

    html += `</div>`;
    html += `<div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal(); Events.afterEvents();">确定</button></div>`;

    UI.showModal(html);
  },

  getEventEffect(eventName) {
    const effects = {
      'Abundance': '搜索到材料时 +1',
      'Sudden Clarity': '该区域你的攻击范围 +1',
      'Foul Weather': '该区域每天只能搜索 2 次',
      'Madness': '该区域所有怪物 +2 HP',
      'Terrible Beast Attack': '巨兽袭击村庄！像!日一样掷骰决定袭击来自哪个未击败巨兽区域。',
    };
    return effects[eventName] || '';
  },

  afterEvents() {
    // Each Foul Weather + Madness match triggers a normal Terrible Beast Attack.
    // The attacking region is rolled separately, just like a ! day.
    let attackCount = 0;
    const regions = ['halebeard', 'coastal', 'scar'];
    for (const region of regions) {
      const events = GameState.activeEvents[region];
      if (events.includes('Foul Weather') && events.includes('Madness') && !this.areAllTerribleBeastsDefeated()) {
        attackCount++;
      }
    }

    if (attackCount > 0) {
      // Process attacks one at a time
      this.processNextBeastAttack(attackCount, 0);
    } else {
      // No beast attacks from events, check game end
      Game.finishDayAndCheck();
    }
  },

  // Store pending attacks for sequential processing
  _pendingAttacks: null,
  _pendingAttackIndex: 0,

  processNextBeastAttack(attackCount, index) {
    if (index >= attackCount) {
      this._pendingAttacks = null;
      Game.finishDayAndCheck();
      return;
    }

    this._pendingAttacks = attackCount;
    this._pendingAttackIndex = index;

    const region = this.determineAttackRegion();
    if (!region) {
      this._pendingAttacks = null;
      Game.finishDayAndCheck();
      return;
    }
    const result = this.processBeastAttack(region);
    const isLast = index + 1 >= attackCount;

    let html = this.buildBeastAttackHtml(result);

    const nextAction = isLast
      ? 'Events._pendingAttacks = null; UI.closeModal(); UI.render(); Game.finishDayAndCheck();'
      : 'UI.closeModal(); Events.processNextBeastAttack(Events._pendingAttacks, Events._pendingAttackIndex + 1);';

    html += `<div class="confirm-actions"><button class="btn primary" onclick="${nextAction}">确定</button></div>`;
    UI.showModal(html);
  },

  buildBeastAttackHtml(result) {
    let html = `<div class="modal-title">🔔 巨兽袭击</div>`;
    const directionName = result.directionInfo?.directionName || result.direction;
    const towerName = result.towerName || result.directionInfo?.towerName || '对应防御塔';
    const directionSummary = `
      <div style="margin:12px 0; padding:8px; border:1px solid var(--border); border-radius:4px; background:var(--bg-card); font-size:13px; line-height:1.5;">
        <b>来袭方向：</b>${directionName}（方向骰 ${result.directionRoll} → ${result.direction}）<br>
        <b>阻挡检查：</b>只检查 ${towerName}；若未完成、被摧毁或不存在，则巨兽进入村庄。
      </div>
    `;

    switch (result.type) {
      case 'hut_destroyed':
        html += `
          <div style="text-align:center; margin:16px 0;">
            <div style="font-size:16px; font-weight:bold; color:var(--red);">
              ${result.beastName} 从 ${result.regionZh} 袭击了村庄！
            </div>
            ${directionSummary}
            <div style="margin-top:12px;">${directionName}没有完成的${towerName}阻挡，一间小屋被摧毁了！</div>
            <div style="margin-top:8px; color:var(--red);">村民怀疑大幅增加！</div>
          </div>
        `;
        break;

      case 'tower_damage':
        html += `
          <div style="text-align:center; margin:16px 0;">
            <div style="font-size:16px; font-weight:bold; color:var(--orange);">
              ${result.beastName} 从 ${result.regionZh} 袭击了村庄！
            </div>
            ${directionSummary}
            <div style="margin-top:12px;">${towerName}吸收了攻击！</div>
            <div style="margin-top:8px;">塔损伤骰 ${result.towerDamageRoll} + 已有X ${result.towerFaults} = ${result.towerDamageTotal}，受到 ${result.damage} 点损坏。</div>
          </div>
        `;
        break;

      case 'tower_destroyed':
        html += `
          <div style="text-align:center; margin:16px 0;">
            <div style="font-size:16px; font-weight:bold; color:var(--red);">
              ${result.beastName} 从 ${result.regionZh} 袭击了村庄！
            </div>
            ${directionSummary}
            <div style="margin-top:12px;">塔损伤骰 ${result.towerDamageRoll} + 已有X ${result.towerFaults} = ${result.towerDamageTotal}，${towerName}被摧毁了！</div>
          </div>
        `;
        break;

      case 'hawk_totem_block':
        html += `
          <div style="text-align:center; margin:16px 0;">
            <div style="font-size:16px; font-weight:bold; color:var(--green);">
              ${result.beastName} 从 ${result.regionZh} 袭击了村庄！
            </div>
            ${directionSummary}
            <div style="margin-top:12px;">鹰图腾驱散了巨兽！${towerName}安然无恙。</div>
          </div>
        `;
        break;

      case 'no_huts':
        html += `
          <div style="text-align:center; margin:16px 0;">
            <div style="font-size:16px; font-weight:bold; color:var(--red);">
              ${result.beastName} 从 ${result.regionZh} 袭击了村庄！
            </div>
            ${directionSummary}
            <div style="margin-top:12px;">村庄已被摧毁殆尽，巨兽肆虐但已无破坏目标。</div>
          </div>
        `;
        break;
    }

    if (result.trackingUpdate && result.trackingUpdate.added) {
      html += `
        <div style="text-align:center; margin:10px 0; color:var(--blue);">
          袭击结束后获得线索：${result.regionZh} 追踪 ${result.trackingUpdate.count}/3。
          ${result.trackingUpdate.completed ? '<br><b style="color:var(--green);">追踪完成，发现巢穴！+1 决心点</b>' : ''}
        </div>
      `;
    }

    return html;
  },

  showBeastAttackResult(result) {
    let html = this.buildBeastAttackHtml(result);
    html += `<div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal(); UI.render(); Game.finishDayAndCheck();">确定</button></div>`;
    UI.showModal(html);
  },

  /**
   * Process end of day - check for events and beast attacks
   */
  processDayEnd(dayNumber) {
    const dayData = GAME_DATA.timeTrack[dayNumber - 1];
    if (!dayData) return;

    if (dayData.event === 'E') {
      // Event day
      const results = this.processEventDay();
      this.showEventResults(results);
      return true;
    } else if (dayData.event === '!') {
      // Terrible Beast Attack day
      const attackRegion = this.determineAttackRegion();
      if (attackRegion) {
        const result = this.processBeastAttack(attackRegion);
        this.showBeastAttackResult(result);
        return true;
      }
    }

    return false;
  },

  determineAttackRegion() {
    const regions = ['halebeard', 'coastal', 'scar'];
    if (this.areAllTerribleBeastsDefeated()) return null;

    // Roll again whenever the die points to a defeated Terrible Beast.
    while (true) {
      const roll = Dice.roll(1)[0];
      const regionIndex = roll <= 2 ? 0 : (roll <= 4 ? 1 : 2);
      const region = regions[regionIndex];
      if (!GameState.beastsDefeated[region]) return region;
    }
  },

  areAllTerribleBeastsDefeated() {
    return Object.values(GameState.beastsDefeated).every(Boolean);
  },

  getTowerDamage(roll) {
    for (const entry of GAME_DATA.towerDamage) {
      if (roll >= entry.min && roll <= entry.max) {
        return { roll, ...entry };
      }
    }
    return { roll, damage: 'destroy', desc: '塔被摧毁' };
  },
};
