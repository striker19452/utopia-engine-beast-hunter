// A persistent view of the existing inventory. Rule modules own every action.
const LoadoutUI = {
  iconCells: {
    silver_plate: [0,0], dowsing_rod: [1,0], disintegrator_lance: [2,0],
    blood_lure: [0,1], potent_bait: [1,1], heavy_coat: [2,1], firebox: [3,1],
    crab_plate: [0,2], reviving_dose: [1,2], hawk_totem: [2,2],
    luck_charm: [0,3], balance_blade: [1,3], optic_disruptor: [2,3],
  },
  key(item) { return item.name.toLowerCase().replace(/ /g, '_'); },
  items() {
    return [
      ...GAME_DATA.equipment.map(item => ({...item, key: this.key(item), group: 'equipment'})),
      ...GAME_DATA.craftingRecipes.map(item => ({...item, key: this.key(item), group: 'crafted'})),
      ...GAME_DATA.toolbeltItems.map(item => ({...item, key: this.key(item), group: 'tools'})),
    ];
  },
  item(key) { return this.items().find(item => item.key === key); },
  mount(game) {
    const hud = document.createElement('div'); hud.className = 'hunter-status';
    const bar = document.createElement('section'); bar.className = 'hunter-loadout';
    bar.setAttribute('aria-label', '随身装备带');
    bar.innerHTML = [['equipment','装备'],['crafted','合成物品'],['tools','Toolbelt']].map(([group,label]) =>
      `<div class="loadout-group" data-loadout-group="${group}" role="group" aria-label="${label}"><h2>${label}</h2><div class="loadout-slots"></div></div>`).join('');
    const top = game.querySelector('.top-bar');
    top.before(hud); hud.append(top, bar);
    this.bar = bar; this.hud = hud;
    const panel = document.createElement('aside'); panel.className = 'loadout-detail'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-labelledby', 'loadout-detail-title'); document.body.append(panel); this.panel = panel;
    document.addEventListener('click', event => {
      const trigger = event.target.closest('[data-loadout-item]');
      if (trigger) { this.openDetail(trigger.dataset.loadoutItem, trigger); return; }
      if (event.target.closest('[data-loadout-close]')) this.closeDetail();
      const action = event.target.closest('[data-loadout-action]');
      if (action) this.perform(action.dataset.loadoutAction, action.dataset.loadoutKey, action.dataset.loadoutTower);
    });
    document.addEventListener('pointerdown', event => {
      if (!panel.hidden && !panel.contains(event.target) && !event.target.closest('[data-loadout-item]')) this.closeDetail(false);
    });
    document.addEventListener('keydown', event => {
      if (panel.hidden) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.closeDetail(); }
      if (event.key === 'Tab') {
        const controls = [...panel.querySelectorAll('button:not(:disabled)')];
        if (!controls.length) return;
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); }
        event.stopImmediatePropagation();
      }
    }, true);
    window.addEventListener('resize', () => { this.measure(); this.positionDetail(); });
    this.observer = new ResizeObserver(() => this.measure()); this.observer.observe(hud);
    const setLanguage = I18n.setLanguage;
    I18n.setLanguage = language => { setLanguage.call(I18n, language); this.render(); };
    const art = new Image();
    art.onerror = () => document.body.classList.add('loadout-art-missing');
    art.src = 'assets/atlas/loadout-items.webp';
    this.render(); this.measure();
  },
  measure() {
    if (!this.hud) return;
    document.documentElement.style.setProperty('--hunter-status-height', `${Math.ceil(this.hud.getBoundingClientRect().height)}px`);
  },
  art(item, inline = false) {
    const [col,row] = this.iconCells[item.key] || [3,3];
    const mastercraft = GameState.equipment[item.key] === 'mastercraft';
    return `<span class="loadout-art${inline ? ' loadout-inline-art' : ''}${mastercraft ? ' mastercraft-art' : ''}" style="--item-col:${col};--item-row:${row};" aria-hidden="true"></span>`;
  },
  rollContext() {
    if (GameState.combat) return { owner: CombatUI, state: GameState.combat };
    if (GameState.forge) return { owner: ForgeUI, state: GameState.forge };
    if (GameState.build) return { owner: BuildUI, state: GameState.build };
    if (GameState.search) return { owner: SearchUI, state: GameState.search };
    return null;
  },
  canUseLuck() {
    const roll = this.rollContext(), state = roll?.state;
    if (!state?.pendingRoll?.length || GameState.pendingDayAction || GameState.phase === 'game_over') return false;
    if (state.rollPlacementStarted || state.pendingDieIndex === 1 || (state.selectedDieIndex !== undefined && state.selectedDieIndex !== null)) return false;
    const rerolls = state.luckRerollsThisRoll || 0;
    return rerolls < 3 && (!GameState.toolbelt.luck_charm || rerolls > 0);
  },
  state(item) {
    let kind = 'empty', label = '未造', owned = false, uses = null;
    if (item.group === 'equipment') {
      const level = GameState.equipment[item.key]; owned = Boolean(level);
      kind = level || 'empty'; label = level === 'mastercraft' ? '精工' : level ? '标准' : '未锻造';
    } else if (item.group === 'tools') {
      owned = true; kind = GameState.toolbelt[item.key] ? 'spent' : 'owned'; label = kind === 'spent' ? '已使用' : '可用';
    } else {
      const value = GameState.craftedItems[item.key]; owned = value !== null && value !== false && value !== undefined && value !== 0;
      uses = typeof value === 'number' ? value : null;
      kind = owned ? 'owned' : GameState.craftedItemHistory[item.key] ? 'spent' : 'empty';
      label = owned ? (item.key === 'crab_plate' ? `剩余防护 ${uses}/2` : '可用') : kind === 'spent' ? '已用，可再造' : '未造';
      if (item.key === 'hawk_totem' && !owned && Object.values(GameState.towers).some(tower => tower.hawkTotem && tower.complete && !tower.destroyed)) {
        kind = 'installed'; label = '已安装';
      }
    }
    const usable = this.actions(item).some(action => ['use','luck','install'].includes(action.action));
    return {kind, label, owned, uses, usable};
  },
  actions(item) {
    if (GameState.phase === 'game_over' || GameState.pendingDayAction || Tutorial.active) return [];
    const combat = GameState.phase === 'combat' && GameState.combat && GameState.combat.beastHp > 0;
    const canAct = GameState.canStartDayAction();
    if (item.group === 'equipment') return canAct && GameState.equipment[item.key] !== 'mastercraft' && GameState.hasMaterial(item.requires,1) ? [{action:'forge',label:'锻造'}] : [];
    if (item.group === 'tools') {
      if (item.key === 'luck_charm') return this.canUseLuck() ? [{action:'luck',label:'使用幸运符重掷全部骰子'}] : [];
      return combat && !GameState.toolbelt[item.key] ? [{action:'use',label:'使用'}] : [];
    }
    const owned = Boolean(GameState.craftedItems[item.key]);
    if (item.key === 'firebox' && owned && combat) return [{action:'use',label:'使用'}];
    if (['blood_lure','potent_bait'].includes(item.key) && owned && canAct) return [{action:'use',label:'使用'}];
    if (item.key === 'hawk_totem' && owned && canAct) return Object.entries(GameState.towers)
      .filter(([,tower]) => tower.complete && !tower.destroyed && !tower.hawkTotem)
      .map(([tower]) => ({action:'install',tower,label:'安装到'}));
    if (!owned && canAct && Object.entries(item.requires).every(([material,amount]) => GameState.hasMaterial(material,amount))) return [{action:'craft',label:GameState.craftedItemHistory[item.key] ? '再造' : '合成'}];
    return [];
  },
  render() {
    if (!this.bar) return;
    const active = document.activeElement?.closest('[data-loadout-item]')?.dataset.loadoutItem;
    const items = this.items();
    this.bar.querySelectorAll('[data-loadout-group]').forEach(group => {
      group.querySelector('.loadout-slots').innerHTML = items.filter(item => item.group === group.dataset.loadoutGroup).map(item => {
        const state = this.state(item), label = `${item.nameZh} · ${state.label}`;
        const fallback = I18n.language === 'en' ? item.name.split(' ').map(word => word[0]).join('') : item.nameZh;
        return `<button type="button" class="loadout-slot ${state.kind}${state.usable ? ' can-use' : ''}" data-loadout-item="${item.key}" title="${label}" aria-label="${label}" aria-expanded="${!this.panel.hidden && this.selectedKey === item.key}">
          ${this.art(item)}<span class="loadout-fallback" aria-hidden="true">${fallback}</span>
          ${item.key === 'crab_plate' && state.owned ? `<span class="loadout-charge" aria-hidden="true"><i class="${state.uses >= 1 ? 'full' : ''}"></i><i class="${state.uses >= 2 ? 'full' : ''}"></i></span>` : ''}
          ${state.kind === 'mastercraft' ? '' : '<span class="loadout-state-mark" aria-hidden="true"></span>'}
        </button>`;
      }).join('');
    });
    I18n.translateNode(this.bar);
    if (active && !document.querySelector('#modal-overlay.active')) this.bar.querySelector(`[data-loadout-item="${active}"]`)?.focus({preventScroll:true});
    if (!this.panel.hidden) this.renderDetail();
  },
  openDetail(key, trigger) {
    if (!this.item(key)) return;
    if (!this.panel.hidden && this.selectedKey === key) { this.closeDetail(); return; }
    this.selectedKey = key; this.trigger = trigger;
    this.panel.hidden = false; this.renderDetail();
    trigger.setAttribute('aria-expanded','true'); this.panel.querySelector('[data-loadout-close]').focus({preventScroll:true});
  },
  renderDetail() {
    const item = this.item(this.selectedKey); if (!item) return;
    const state = this.state(item), actions = this.actions(item);
    this.panel.innerHTML = `<header class="loadout-detail-heading"><div class="loadout-detail-picture ${state.kind}">${this.art(item)}</div><div><h2 id="loadout-detail-title">${item.nameZh}</h2><span class="loadout-detail-state">${state.label}</span></div><button type="button" class="loadout-detail-close" data-loadout-close aria-label="关闭">×</button></header>
      <div class="loadout-detail-effects">${item.group === 'equipment' ? `<p><b>标准</b><span>${item.standard}</span></p><p><b>精工</b><span>${item.mastercraft}</span></p>` : `<p>${item.effect}</p>`}</div>
      ${item.requires ? `<p class="loadout-detail-recipe">需要: ${Object.entries(typeof item.requires === 'string' ? {[item.requires]:1} : item.requires).map(([material,amount])=>`${GAME_DATA.materialNames[material]} × ${amount}`).join(' + ')}</p>` : ''}
      ${actions.length ? `<div class="loadout-detail-actions">${actions.map(action=>`<button type="button" class="btn primary" data-loadout-action="${action.action}" data-loadout-key="${item.key}" ${action.tower ? `data-loadout-tower="${action.tower}"` : ''}>${action.label}${action.tower ? ` ${VillageUI.towerNames[action.tower]}` : ''}</button>`).join('')}</div>` : ''}`;
    I18n.translateNode(this.panel); this.positionDetail();
  },
  positionDetail() {
    if (this.panel?.hidden) return;
    const trigger = this.trigger?.isConnected ? this.trigger : this.bar.querySelector(`[data-loadout-item="${this.selectedKey}"]`);
    if (!trigger) { this.closeDetail(false); return; }
    const anchor = trigger.getBoundingClientRect(), rect = this.panel.getBoundingClientRect();
    const left = Math.max(12,Math.min(innerWidth-rect.width-12,anchor.left+anchor.width/2-rect.width/2));
    const below = anchor.bottom+8, above = anchor.top-rect.height-8;
    const top = below+rect.height < innerHeight-12 ? below : above >= 12 ? above : Math.max(12,Math.min(innerHeight-rect.height-12,below));
    this.panel.style.left = `${left}px`; this.panel.style.top = `${top}px`;
  },
  closeDetail(restoreFocus = true) {
    if (!this.panel || this.panel.hidden) return;
    this.panel.hidden = true;
    document.querySelectorAll('[data-loadout-item][aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded','false'));
    if (restoreFocus) {
      const trigger = this.trigger?.isConnected ? this.trigger : this.bar.querySelector(`[data-loadout-item="${this.selectedKey}"]`);
      trigger?.focus({preventScroll:true});
    }
    this.selectedKey = null;
  },
  perform(action, key, tower) {
    const item = this.item(key);
    if (!item || !this.actions(item).some(option => option.action === action && option.tower === tower)) { this.renderDetail(); return; }
    const roll = action === 'luck' ? this.rollContext() : null;
    this.closeDetail(false);
    if (action === 'luck') roll.owner.rerollPendingWithLuckCharm();
    if (action === 'use') {
      if (key === 'blood_lure') Game.showBloodLureDialog();
      else if (key === 'potent_bait') Game.showPotentBaitDialog();
      else CombatUI.activateItem(key);
    }
    if (action === 'install') UI.attachHawkTotem(tower);
    if (action === 'craft') CraftUI.craft(key);
    if (action === 'forge') ForgeUI.start(key);
    this.render();
  },
  decorateModal(content) {
    if (!this.bar) return;
    this.render();
    // Put the same art on existing legal actions without adding another dice row.
    content.querySelectorAll('button[onclick*="rerollPendingWithLuckCharm"], button[onclick^="CombatUI.activateItem("]').forEach(button => {
      if (button.querySelector('.loadout-inline-art')) return;
      const handler = button.getAttribute('onclick');
      const key = handler.includes('rerollPendingWithLuckCharm') ? 'luck_charm' : handler.match(/activateItem\('([^']+)'\)/)?.[1];
      const item = this.item(key); if (!item) return;
      if (key === 'luck_charm') {
        const label = '使用幸运符重掷全部骰子';
        button.setAttribute('aria-label',label); button.setAttribute('data-i18n-aria-label',label);
        button.setAttribute('title',label); button.setAttribute('data-i18n-title',label);
        button.innerHTML = `${this.art(item,true)}<span>重掷</span>`;
        I18n.translateNode(button);
      } else button.insertAdjacentHTML('afterbegin',this.art(item,true));
      button.classList.add('loadout-item-action');
    });
    content.querySelectorAll('button[onclick="CombatUI.useItem()"]:not([data-loadout-decorated])').forEach(button => {
      const usable = ['balance_blade','optic_disruptor','firebox'].map(key=>this.item(key)).filter(item=>this.state(item).usable);
      if (!usable.length) return;
      button.dataset.loadoutDecorated = 'true';
      button.setAttribute('aria-label', I18n.translateString('使用物品'));
      button.innerHTML = `<span class="loadout-combat-preview" aria-hidden="true">${usable.map(item=>this.art(item,true)).join('')}</span><span class="atlas-sr-only">使用物品</span>`;
      I18n.translateNode(button);
    });
  },
};
