// Developer controls share the game's paper palette, with a stable editing surface.
const DebugUI = {
  activeSection: 'overview',
  sections: [
    { key: 'overview', name: '核心与村庄', icon: 'heart', description: '调整生命、行程与村庄状态。' },
    { key: 'materials', name: '材料库存', icon: 'stores', description: '按材料种类调整库存，单项最多4个。' },
    { key: 'regions', name: '猎场与巨兽', icon: 'map', description: '设置巢穴、追踪和各地巨兽的击败状态。' },
    { key: 'towers', name: '防御工事', icon: 'village', description: '调整塔的完成状态、损伤和鹰图腾。' },
    { key: 'equipment', name: '装备等级', icon: 'spark', description: '为测试配置标准或精工装备。' },
  ],

  number(kind, key, label, value, min, max) {
    const id = `debug-${kind}-${key.replaceAll('.', '-')}`;
    return `<div class="debug-field">
      <label for="${id}">${label}</label>
      <div class="debug-stepper">
        <button type="button" data-debug-step="-1" data-kind="${kind}" data-key="${key}" aria-label="${label} -1">−</button>
        <input id="${id}" type="number" inputmode="numeric" min="${min}" max="${max}" value="${value}"
          data-debug-control="${kind}" data-key="${key}" data-label="${label}">
        <button type="button" data-debug-step="1" data-kind="${kind}" data-key="${key}" aria-label="${label} +1">+</button>
      </div>
    </div>`;
  },

  toggle(kind, key, label, checked, extraClass = '') {
    return `<label class="debug-toggle ${extraClass}">
      <input type="checkbox" data-debug-control="${kind}" data-key="${key}" data-label="${label}" ${checked ? 'checked' : ''}>
      <span>${label}</span>
    </label>`;
  },

  action(action, label) {
    return `<button type="button" class="btn" data-debug-action="${action}">${label}</button>`;
  },

  overview() {
    return `<div class="debug-quick-actions">
      ${this.action('heal', '恢复满血')}${this.action('doubt', '清零怀疑')}${this.action('determination', '决心 +5')}
    </div>
    <div class="debug-stat-grid">
      <article class="debug-card"><h3>生命与伤势</h3>
        ${this.number('stat', 'hp.current', 'HP 当前', GameState.hp.current, 0, GameState.hp.max)}
        ${this.number('stat', 'hp.max', 'HP 上限', GameState.hp.max, 0, 20)}
      </article>
      <article class="debug-card"><h3>行程与决心</h3>
        ${this.number('stat', 'currentDay', '当前天数', GameState.currentDay, 1, 15)}
        ${this.number('stat', 'determination', '决心', GameState.determination, 0, 99)}
      </article>
      <article class="debug-card"><h3>村民怀疑</h3>
        ${this.number('stat', 'doubt.current', '怀疑', GameState.doubt.current, 0, GameState.doubt.max)}
        ${this.number('stat', 'doubt.max', '怀疑上限', GameState.doubt.max, 1, 99)}
      </article>
    </div>
    <section class="debug-group">
      <div class="debug-group-heading"><h3>村民小屋</h3><span data-debug-summary="huts"></span>${this.action('huts', '修复全部小屋')}</div>
      <div class="debug-huts">${GameState.huts.map((value, index) => this.toggle('hut', index, `小屋${index + 1}完好`, value)).join('')}</div>
    </section>`;
  },

  materials() {
    const groups = [['common', '普通材料'], ['rare', '稀有材料'], ['beast', '怪物材料']];
    return `<div class="debug-quick-actions">${this.action('materials-fill', '全部补满')}${this.action('materials-clear', '全部清空')}</div>
      ${groups.map(([key, name]) => `<section class="debug-group">
        <div class="debug-group-heading"><h3>${name}</h3>${this.action(`materials-${key}`, '补满本组')}</div>
        <div class="debug-material-grid">${GAME_DATA.materials[key].map(material =>
          this.number('material', material, GAME_DATA.materialNames[material], GameState.materials[material], 0, GAME_DATA.materialLimit)
        ).join('')}</div>
      </section>`).join('')}`;
  },

  regions() {
    return `<div class="debug-region-grid">${Object.entries(GAME_DATA.regions).map(([key, region], index) => {
      const state = GameState.regions[key];
      return `<article class="debug-card debug-region-card">
        <div class="debug-card-mark">${AtlasUI.icon(['mountain', 'coast', 'scar'][index])}<span>0${index + 1}</span></div>
        <h3>${region.nameZh}</h3><p class="debug-caption">${region.terribleBeast.nameZh}</p>
        ${this.toggle('lair', key, '巢穴已发现', state.lairFound)}
        <div class="debug-tracking"><span>追踪进度</span><div>${state.tracking.map((value, i) => this.toggle('tracking', `${key}.${i}`, `追踪${i + 1}`, value, 'debug-track-toggle')).join('')}</div></div>
        ${this.toggle('beast', key, '巨兽已击败', GameState.beastsDefeated[key])}
        <p class="debug-card-status" data-debug-summary="region-${key}"></p>
      </article>`;
    }).join('')}</div>`;
  },

  towers() {
    const names = { south: '南方塔', west: '西南塔', east: '东方塔' };
    return `<div class="debug-region-grid">${Object.entries(GameState.towers).map(([key, tower]) => `<article class="debug-card">
      <div class="debug-card-mark">${AtlasUI.icon('village')}<span data-debug-summary="tower-${key}"></span></div>
      <h3>${names[key]}</h3>
      ${this.toggle('tower-complete', key, '已完成 / 可阻挡', tower.complete)}
      ${this.toggle('tower-destroyed', key, '已摧毁标记', tower.destroyed)}
      ${this.toggle('tower-hawk', key, '鹰图腾', tower.hawkTotem)}
      ${this.number('faults', key, '塔内X数量', BuildUI.countFaults(key, tower.grid), 0, BuildUI.getActiveIndices(key).length)}
    </article>`).join('')}</div>
    <p class="debug-section-note">启用鹰图腾会自动完成该塔；摧毁会清空塔格。</p>`;
  },

  equipment() {
    return `<div class="debug-quick-actions">${this.action('equipment-standard', '全部标准')}${this.action('equipment-mastercraft', '全部精工')}${this.action('equipment-clear', '卸下全部')}</div>
      <div class="debug-equipment-list">${GAME_DATA.equipment.map(equipment => {
        const key = equipment.name.toLowerCase().replaceAll(' ', '_');
        return `<article class="debug-card debug-equipment-card">
          <div class="debug-equipment-heading"><h3><label for="debug-equipment-${key}">${equipment.nameZh}</label></h3>
            <select id="debug-equipment-${key}" data-debug-control="equipment" data-key="${key}" data-label="${equipment.nameZh}">
              <option value="">未锻造</option><option value="standard">标准</option><option value="mastercraft">精工</option>
            </select>
          </div>
          <p><b>标准</b><span>${equipment.standard}</span></p><p><b>精工</b><span>${equipment.mastercraft}</span></p>
        </article>`;
      }).join('')}</div>`;
  },

  open() {
    UI.showModal(`<header class="debug-header"><div><span class="debug-eyebrow">FIELD CONTROL / DEV</span><h2 class="modal-title">调试工坊</h2></div><span class="debug-live-label">即时生效</span></header>
      <div id="debug-console" class="debug-console">
        <nav class="debug-nav" aria-label="调试分区">${this.sections.map((section, index) => `<button type="button" data-debug-section="${section.key}" aria-controls="debug-section-${section.key}">
          ${AtlasUI.icon(section.icon)}<span>${section.name}</span><small data-debug-count="${section.key}"></small><i>0${index + 1}</i>
        </button>`).join('')}</nav>
        <div class="debug-workspace">${this.sections.map(section => `<section id="debug-section-${section.key}" class="debug-section" data-debug-panel="${section.key}" aria-labelledby="debug-title-${section.key}" hidden>
          <header class="debug-section-heading"><h2 id="debug-title-${section.key}">${section.name}</h2><p>${section.description}</p></header>${this[section.key]()}
        </section>`).join('')}</div>
      </div>
      <footer class="debug-footer"><span class="debug-feedback" role="status" aria-live="polite">修改即时生效</span><button type="button" class="btn primary" data-debug-close>完成调试</button></footer>`);
    const root = document.getElementById('debug-console');
    root.addEventListener('change', event => {
      const control = event.target.closest('[data-debug-control]');
      if (!control) return;
      this.update(control.dataset.debugControl, control.dataset.key, control.type === 'checkbox' ? control.checked : control.value);
      this.announce(control.dataset.label);
    });
    root.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input[type="number"]')) {
        event.preventDefault();
        event.target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    root.addEventListener('click', event => {
      const section = event.target.closest('[data-debug-section]');
      if (section) this.selectSection(section.dataset.debugSection);
      const step = event.target.closest('[data-debug-step]');
      if (step) {
        const input = document.getElementById(`debug-${step.dataset.kind}-${step.dataset.key.replaceAll('.', '-')}`);
        this.update(step.dataset.kind, step.dataset.key, Number(input.value) + Number(step.dataset.debugStep));
        this.announce(input.dataset.label);
      }
      const action = event.target.closest('[data-debug-action]');
      if (action) { this.quickAction(action.dataset.debugAction); this.announce(action.textContent); }
    });
    document.querySelector('[data-debug-close]').onclick = () => { UI.closeModal(); UI.render(); };
    this.selectSection(this.activeSection);
    this.refresh();
  },

  selectSection(key) {
    if (!this.sections.some(section => section.key === key)) return;
    this.activeSection = key;
    const root = document.getElementById('debug-console');
    root.querySelectorAll('[data-debug-panel]').forEach(panel => { panel.hidden = panel.dataset.debugPanel !== key; });
    root.querySelectorAll('[data-debug-section]').forEach(button => { button.setAttribute('aria-pressed', String(button.dataset.debugSection === key)); });
    root.querySelector('.debug-workspace').scrollTop = 0;
  },

  update(kind, key, value) {
    if (kind === 'stat') Game.debugSetStat(key, value);
    if (kind === 'material') Game.debugSetMaterial(key, value);
    if (kind === 'hut') Game.debugSetHut(Number(key), value);
    if (kind === 'lair') Game.debugSetRegion(key, 'lairFound', value);
    if (kind === 'beast') Game.debugSetBeastDefeated(key, value);
    if (kind === 'equipment') Game.debugSetEquipment(key, value);
    if (kind === 'tracking') { const [region, index] = key.split('.'); Game.debugSetTracking(region, Number(index), value); }
    if (kind === 'tower-complete') Game.debugSetTowerComplete(key, value);
    if (kind === 'tower-destroyed') Game.debugSetTowerDestroyed(key, value);
    if (kind === 'tower-hawk') Game.debugSetTowerHawk(key, value);
    if (kind === 'faults') Game.debugSetTowerFaults(key, value);
  },

  quickAction(action) {
    if (action === 'heal') GameState.hp.current = GameState.hp.max;
    if (action === 'doubt') GameState.doubt.current = 0;
    if (action === 'determination') GameState.determination = Math.min(99, GameState.determination + 5);
    if (action === 'huts') GameState.huts.fill(true);
    if (action.startsWith('materials-')) {
      const group = action.slice('materials-'.length);
      const materials = GAME_DATA.materials[group] || Object.keys(GameState.materials);
      materials.forEach(key => { GameState.materials[key] = group === 'clear' ? 0 : GAME_DATA.materialLimit; });
    }
    if (action.startsWith('equipment-')) {
      const level = action.slice('equipment-'.length);
      Object.keys(GameState.equipment).forEach(key => { GameState.equipment[key] = level === 'clear' ? null : level; });
    }
    Game.debugRender();
  },

  refresh() {
    const root = document.getElementById('debug-console');
    if (!root) return;
    const read = (kind, key) => {
      if (kind === 'stat') return key.split('.').reduce((state, part) => state[part], GameState);
      if (kind === 'material') return GameState.materials[key];
      if (kind === 'hut') return GameState.huts[key];
      if (kind === 'lair') return GameState.regions[key].lairFound;
      if (kind === 'beast') return GameState.beastsDefeated[key];
      if (kind === 'equipment') return GameState.equipment[key] || '';
      if (kind === 'tracking') { const [region, index] = key.split('.'); return GameState.regions[region].tracking[index]; }
      if (kind === 'tower-complete') return GameState.towers[key].complete;
      if (kind === 'tower-destroyed') return GameState.towers[key].destroyed;
      if (kind === 'tower-hawk') return GameState.towers[key].hawkTotem;
      if (kind === 'faults') return BuildUI.countFaults(key, GameState.towers[key].grid);
    };
    root.querySelectorAll('[data-debug-control]').forEach(control => {
      const value = read(control.dataset.debugControl, control.dataset.key);
      if (control.type === 'checkbox') control.checked = Boolean(value);
      else control.value = value;
      if (control.dataset.key === 'hp.current') control.max = GameState.hp.max;
      if (control.dataset.key === 'doubt.current') control.max = GameState.doubt.max;
    });
    root.querySelectorAll('.debug-stepper').forEach(stepper => {
      const input = stepper.querySelector('input');
      stepper.querySelector('[data-debug-step="-1"]').disabled = Number(input.value) <= Number(input.min);
      stepper.querySelector('[data-debug-step="1"]').disabled = Number(input.value) >= Number(input.max);
    });
    const counts = {
      overview: `${GameState.currentDay}/14`,
      materials: `${Object.values(GameState.materials).reduce((sum, value) => sum + value, 0)}/${Object.keys(GameState.materials).length * GAME_DATA.materialLimit}`,
      regions: `${Object.values(GameState.beastsDefeated).filter(Boolean).length}/3`,
      towers: `${Object.values(GameState.towers).filter(tower => tower.complete && !tower.destroyed).length}/3`,
      equipment: `${Object.values(GameState.equipment).filter(Boolean).length}/3`,
    };
    root.querySelectorAll('[data-debug-count]').forEach(element => { element.textContent = counts[element.dataset.debugCount]; });
    root.querySelectorAll('[data-debug-summary]').forEach(element => {
      const key = element.dataset.debugSummary;
      let text;
      if (key === 'huts') text = `${GameState.huts.filter(Boolean).length} / ${GameState.huts.length} · 小屋完好`;
      if (key.startsWith('region-')) text = GameState.beastsDefeated[key.slice(7)] ? '恐怖巨兽已击败' : '恐怖巨兽仍在游荡';
      if (key.startsWith('tower-')) {
        const tower = GameState.towers[key.slice(6)];
        text = tower.destroyed ? '已摧毁' : tower.hawkTotem ? '图腾防护' : tower.complete ? '已完成' : '未完成';
      }
      I18n.setText(element, text);
    });
  },

  announce(label) {
    const feedback = document.querySelector('.debug-feedback');
    if (feedback) I18n.setText(feedback, `已更新：${label}`);
  },
};
