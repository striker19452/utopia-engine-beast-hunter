// C · The Cartographer Table. Presentation adapter for the existing game.
// Rule calculations, state transitions, save data and tutorial ownership stay in
// their original modules. Every generated panel shares the same sheet contract.
const AtlasUI = {
  region: 'halebeard', page: 'map', context: null, modalSession: null, referencesOpen: {},
  storesView: 'relations', supplySelection: null, supplyHover: null,
  keys: ['halebeard', 'coastal', 'scar'],
  pageTitles: { map: '猎场地图', village: '藏身之地', stores: '行囊与工坊', journal: '猎人手记' },
  icons: {
    map: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
    village: '<path d="m2 11 5-5 5 5M3 10v11h8V10M14 7l4-5 4 5M15 7v14h6V7M6 21v-6h2v6"/>',
    stores: '<path d="m8 3-2 5 3 3-5 6c-2 4 2 5 8 5s10-1 8-5l-5-6 3-3-2-5-4 2-4-2ZM8 10h8"/>',
    journal: '<path d="M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2V4ZM12 6v15"/>',
    mountain: '<path d="m2 21 7-17 6 12 3-7 4 12H2ZM6 12l3 2 3-2"/>',
    coast: '<path d="M2 7c4-4 6 4 10 0s6 4 10 0M2 13c4-4 6 4 10 0s6 4 10 0M2 19c4-4 6 4 10 0s6 4 10 0"/>',
    scar: '<path d="M13 2c4 6 7 8 7 14a8 8 0 0 1-16 0c0-4 3-7 5-9-1 6 3 6 3 6s4-4 1-11Z"/>',
    arrow: '<path d="M3 12h18M14 5l7 7-7 7"/>',
    heart: '<path d="m12 21-9-10C-2 4 7 1 12 7c5-6 14-3 9 4L12 21Z"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    spark: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.1M16 8h.1M12 12h.1M8 16h.1M16 16h.1"/>',
  },
  icon(name) { return `<svg class="atlas-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${this.icons[name] || this.icons.map}</svg>`; },
  text(el, value) { if (el) I18n.setText(el, String(value)); },
  init() {
    document.body.classList.add('atlas-ui');
    this.mount();
    this.installContexts();
    const render = UI.render;
    UI.render = (...args) => { const result = render.apply(UI, args); this.render(); return result; };
    const topBar = UI.renderTopBar;
    UI.renderTopBar = (...args) => { const result = topBar.apply(UI, args); this.renderHud(); return result; };
    const showModal = UI.showModal;
    UI.showModal = (html, options = {}) => {
      const overlay = document.getElementById('modal-overlay');
      if (!overlay.classList.contains('active') && !Tutorial.active && !this.modalSession) {
        this.modalSession = { focus: document.activeElement, inert: document.getElementById('game-interface').inert };
      }
      showModal.call(UI, html);
      if (!Tutorial.active) document.getElementById('game-interface').inert = true;
      this.decorateSheet(options.scene || this.context || 'notice');
      if (!Tutorial.active) {
        const target = document.querySelector('#modal-content [autofocus], #modal-content button:not(:disabled), #modal-content summary, #modal-content input');
        target?.focus({ preventScroll: true });
      }
    };
    const closeModal = UI.closeModal;
    UI.closeModal = () => {
      closeModal.call(UI);
      if (!Tutorial.active && this.modalSession) {
        document.getElementById('game-interface').inert = this.modalSession.inert;
        if (this.modalSession.focus?.isConnected) this.modalSession.focus.focus({ preventScroll: true });
        this.modalSession = null;
      }
    };
    // Translate first, then normalize ornamental glyphs and legacy inline styles.
    const translateNode = I18n.translateNode;
    I18n.translateNode = node => {
      translateNode.call(I18n, node);
      if (node.nodeType === Node.TEXT_NODE && !['SCRIPT', 'STYLE'].includes(node.parentElement?.tagName)) {
        node.nodeValue = node.nodeValue.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '');
      }
    };
    const apply = I18n.apply;
    I18n.apply = (root = document.documentElement) => { apply.call(I18n, root); this.polish(root); };
    const content = document.getElementById('modal-content');
    new MutationObserver(() => this.polish(content)).observe(content, { subtree: true, childList: true });
    const keepCurrent = UI.keepModalCurrent;
    UI.keepModalCurrent = (selector, options) => {
      if (content.querySelector('.atlas-roll-main')) {
        this.polish(content);
        content.scrollTop = 0;
        return;
      }
      keepCurrent.call(UI, selector, options);
    };
    document.addEventListener('keydown', event => this.onKey(event));
    document.addEventListener('click', event => {
      const region = event.target.closest('[data-atlas-region]');
      if (region) this.selectRegion(region.dataset.atlasRegion, true);
      const page = event.target.closest('[data-atlas-page]');
      if (page) this.setPage(page.dataset.atlasPage);
      const start = event.target.closest('#atlas-start-search');
      if (start && GameState.canStartDayAction()) Game.startSearch(this.region);
    });
    document.addEventListener('error', event => {
      const img = event.target;
      if (img instanceof HTMLImageElement) { img.classList.add('atlas-image-failed'); img.parentElement.classList.add('atlas-art-missing'); }
    }, true);
    this.render(); I18n.apply();
  },
  mount() {
    const game = document.getElementById('game-interface');
    const main = game.querySelector('.main-layout');
    const regions = game.querySelector('.regions-row');
    const towers = game.querySelector('.towers-row');
    const towerNote = game.querySelector('.tower-rule-note');
    const elders = game.querySelector('.elders-panel');
    const huts = game.querySelector('.village-panel');
    const materials = game.querySelector('.materials-panel');
    const crafted = game.querySelector('.crafted-panel');
    const actionBar = game.querySelector('.action-bar');
    const log = game.querySelector('.status-bar');
    const time = document.getElementById('time-track');
    const top = game.querySelector('.top-bar');
    const header = document.createElement('header'); header.className = 'atlas-header';
    header.innerHTML = `<div class="atlas-brand">${this.icon('map')}<div><small>UTOPIA ENGINE</small><h1>${this.pageTitles.map}</h1></div><span>怪兽猎人</span></div><div class="atlas-time"></div><div class="atlas-header-note"><span>十四天之约</span><strong id="atlas-deadline"></strong></div>`;
    header.querySelector('.atlas-time').append(time);
    const workspace = document.createElement('div'); workspace.className = 'atlas-workspace';
    workspace.innerHTML = `<nav class="atlas-nav" aria-label="主要界面">${[['map','猎场'],['village','村庄'],['stores','行囊'],['journal','手记']].map(([p,label]) => `<button type="button" data-atlas-page="${p}">${this.icon(p)}<span>${label}</span></button>`).join('')}</nav>
      <section class="atlas-map" id="atlas-map-panel" aria-label="猎场地图"><img class="atlas-map-art" src="assets/atlas/hunting-map.webp" alt="雪峰、海岸与裂痕之地围绕山谷村庄的手绘地图"><div class="atlas-map-fallback">地图暂不可用，仍可选择猎场</div><div class="atlas-map-heading"><small>SOUTHERN VALLEY</small><h2>南境谷地</h2><p>循迹而行，守住你的藏身之地。</p></div>
      <svg class="atlas-routes" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true"><path d="M827 697C747 666 810 564 715 481S530 393 538 285M827 697C684 699 592 605 409 591M827 697C908 584 1105 629 1146 418"/><path id="atlas-active-route"/></svg>
      ${this.keys.map((k,i) => `<button type="button" class="atlas-pin pin-${k}" data-atlas-region="${k}">${this.icon(['mountain','coast','scar'][i])}<span><strong>${GAME_DATA.regions[k].nameZh}</strong><small id="atlas-pin-${k}"></small></span></button>`).join('')}
      <button type="button" class="atlas-village-pin" data-atlas-page="village">${this.icon('village')}<strong>藏身的村庄</strong><span id="atlas-village-summary"></span></button><div class="atlas-map-legend"><span>虚线 · 追踪路线</span><span>三处猎场，一纸生死之约。</span></div></section>
      <aside class="atlas-dossier" id="atlas-dossier"><div class="atlas-dossier-label"><span>当前猎场</span><small id="atlas-file-number"></small></div><figure class="atlas-dossier-beast"><img id="atlas-beast-art" alt=""><figcaption><span>恐怖巨兽</span><strong id="atlas-beast-name"></strong><small id="atlas-beast-life"></small></figcaption></figure><div id="atlas-regions-host"></div><button type="button" class="btn primary atlas-search-action" id="atlas-start-search">${this.icon('dice')}<span>掷骰搜索</span>${this.icon('arrow')}</button></aside>
      <section class="atlas-page" id="atlas-village-page" hidden><header class="atlas-page-title"><small>THE VILLAGE</small><h2>村庄的三道防线</h2><p>完成防线，守住庇护你的村庄。</p></header><div class="atlas-village-grid"></div></section>
      <section class="atlas-page" id="atlas-stores-page" hidden><header class="atlas-page-title"><p>每种材料最多携带四份。</p></header></section>
      <section class="atlas-page" id="atlas-journal-page" hidden><header class="atlas-page-title"><small>THE HUNTER'S JOURNAL</small><h2>一路行来</h2><p>每一天，都有代价。</p></header></section>`;
    workspace.querySelector('#atlas-regions-host').append(regions);
    // Keep the original event nodes so the game renderer and translations stay
    // in sync, while giving events the full dossier width on small screens.
    const currentEvents = document.createElement('section');
    currentEvents.id = 'atlas-current-events'; currentEvents.className = 'atlas-current-events';
    currentEvents.tabIndex = -1;
    currentEvents.setAttribute('aria-labelledby', 'atlas-event-title atlas-event-region');
    currentEvents.innerHTML = '<div class="atlas-event-heading"><h2 id="atlas-event-title">地区事件</h2><span id="atlas-event-region"></span></div>';
    for (const key of this.keys) {
      const events = regions.querySelector(`#${key}-events`);
      events.dataset.atlasRegionEvents = key;
      currentEvents.append(events);
    }
    workspace.querySelector('.atlas-dossier-beast').before(currentEvents);
    VillageUI.mount(workspace.querySelector('#atlas-village-page'), { towers, huts, elders, towerNote });
    const stores = workspace.querySelector('#atlas-stores-page');
    const tools = document.createElement('div'); tools.className = 'atlas-supply-tools';
    tools.innerHTML = `<div class="supply-view-switch" role="group" aria-label="行囊显示方式"><button type="button" data-stores-view="relations">配方连线</button><button type="button" data-stores-view="ledger">库存清单</button></div><div class="supply-wire-legend"><span>实线 · 材料足够</span><span>虚线 · 材料不足</span></div>`;
    const note = document.createElement('div'); note.className = 'atlas-supply-note';
    note.innerHTML = `<div role="status" aria-live="polite"><strong></strong><div class="supply-note-parts"></div></div><button type="button" class="supply-reset" data-supply-reset>显示全部连线</button>`;
    const supplies = document.createElement('div'); supplies.className = 'atlas-supply-workspace';
    supplies.innerHTML = `<svg class="atlas-supply-wires" aria-hidden="true"></svg><div class="supply-products"></div>`;
    supplies.prepend(materials);
    supplies.querySelector('.supply-products').append(crafted);
    const equipment = document.createElement('section'); equipment.className = 'supply-equipment-panel';
    equipment.innerHTML = '<div class="panel-title">锻造装备</div><div class="supply-equipment-grid"></div>';
    supplies.querySelector('.supply-products').append(equipment);
    stores.append(tools, note, supplies);
    stores.addEventListener('click', event => {
      const view = event.target.closest('button[data-stores-view]');
      if (view) { this.storesView = view.dataset.storesView; this.supplyHover = null; this.renderSupply(); return; }
      if (event.target.closest('[data-supply-reset]')) { this.supplySelection = this.supplyHover = null; this.applySupplySelection(); return; }
      const choice = this.supplyChoice(event.target);
      if (!choice || (event.target.closest('button') && !event.target.closest('[data-supply-target], [data-supply-source]'))) return;
      this.supplySelection = this.supplySelection?.kind === choice.kind && this.supplySelection.key === choice.key ? null : choice;
      this.supplyHover = null; this.applySupplySelection();
    });
    stores.addEventListener('pointerover', event => {
      const choice = this.supplyChoice(event.target);
      if (!choice || event.pointerType === 'touch') return;
      this.supplyHover = choice; this.applySupplySelection();
    });
    stores.addEventListener('pointerout', event => {
      if (this.supplyChoice(event.relatedTarget)) return;
      this.supplyHover = null; this.applySupplySelection();
    });
    stores.addEventListener('focusin', event => {
      this.supplyHover = this.supplyChoice(event.target); this.applySupplySelection();
    });
    stores.addEventListener('focusout', event => {
      if (this.supplyChoice(event.relatedTarget)) return;
      this.supplyHover = null; this.applySupplySelection();
    });
    this.supplyObserver = new ResizeObserver(() => this.scheduleSupplyWires());
    this.supplyObserver.observe(supplies);
    document.fonts?.ready.then(() => this.scheduleSupplyWires());
    workspace.querySelector('#atlas-journal-page').append(log);
    game.prepend(header); main.replaceWith(workspace); game.append(top, actionBar);
    LoadoutUI.mount(game);
    actionBar.setAttribute('aria-label', '游戏操作');
    top.querySelector('.stat-label').textContent = '生命';
    for (const k of this.keys) game.querySelector(`.region-panel.${k}`).dataset.atlasRegionPanel = k;
    const announcer = document.createElement('div'); announcer.id = 'atlas-announcer'; announcer.className = 'atlas-sr-only'; announcer.setAttribute('role','status'); game.append(announcer);
  },
  setPage(page) {
    if (!['map','village','stores','journal'].includes(page)) return;
    this.page = page;
    this.text(document.querySelector('.atlas-brand h1'), this.pageTitles[page]);
    document.querySelector('.atlas-brand > .atlas-icon').outerHTML = this.icon(page);
    const onMap = page === 'map';
    document.getElementById('atlas-map-panel').hidden = !onMap;
    document.getElementById('atlas-dossier').hidden = !onMap;
    for (const p of ['village','stores','journal']) document.getElementById(`atlas-${p}-page`).hidden = p !== page;
    document.querySelector('.atlas-workspace').dataset.page = page;
    document.querySelectorAll('[data-atlas-page]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.atlasPage === page)));
    if (page === 'stores') this.scheduleSupplyWires();
    if (page === 'village') VillageUI.updatePan();
  },
  selectRegion(region, focus = false) {
    if (!this.keys.includes(region)) return;
    this.region = region; this.setPage('map'); this.renderRegion();
    if (focus) {
      if (window.matchMedia('(max-width: 1000px)').matches) {
        const events = document.getElementById('atlas-current-events');
        events.focus({preventScroll:true});
        events.scrollIntoView({block:'start', behavior:'auto'});
      } else document.querySelector(`.atlas-pin[data-atlas-region="${region}"]`)?.focus({preventScroll:true});
    }
    this.text(document.getElementById('atlas-announcer'), GAME_DATA.regions[region].nameZh);
  },
  render() {
    if (!document.getElementById('atlas-map-panel')) return;
    if (GameState.combat) this.region = GameState.combat.region;
    else if (GameState.search) this.region = GameState.search.region;
    this.renderHud(); this.renderRegion(); this.setPage(this.page);
    this.renderSupply();
    VillageUI.render();
    this.polish(document.getElementById('game-interface'));
  },
  renderHud() {
    if (!document.getElementById('atlas-deadline')) return;
    const day = GAME_DATA.timeTrack[GameState.getDisplayDay() - 1];
    this.text(document.getElementById('atlas-deadline'), GameState.phase === 'game_over' ? '旅程已经结束' : day?.skull ? '只剩一天。' : day?.event === '!' ? '今夜巨兽来袭' : day?.event === 'E' ? '今日有地区事件' : '军团仍在南下');
    document.body.classList.toggle('atlas-critical', GameState.hp.current <= 3 || GameState.doubt.current >= 15 || GameState.currentDay >= 13);
    const meta = document.querySelector('.atlas-sheet-meta');
    if (meta) this.fillSheetMeta(meta);
    this.polish(document.querySelector('.top-bar'));
    LoadoutUI.render();
  },
  supplyRecipes() {
    return [
      ...GAME_DATA.craftingRecipes.map(recipe => ({ ...recipe, key: recipe.name.toLowerCase().replace(/ /g, '_'), kind: 'craft' })),
      ...GAME_DATA.equipment.map(recipe => ({ ...recipe, key: recipe.name.toLowerCase().replace(/ /g, '_'), kind: 'forge', requires: { [recipe.requires]: 1 } })),
    ];
  },
  supplyIngredients(requires) {
    return `<div class="supply-recipe-inputs">${Object.entries(requires).map(([material, amount]) => `<button type="button" class="supply-ingredient ${GameState.hasMaterial(material, amount) ? 'has-stock' : ''}" data-supply-source="${material}" aria-pressed="false"><span>${GAME_DATA.materialNames[material]}</span><small>${GameState.materials[material]} / ${amount}</small><span class="supply-port" aria-hidden="true"></span></button>`).join('')}</div>`;
  },
  supplyChoice(element) {
    if (!(element instanceof Element)) return null;
    const source = element.closest('[data-supply-source]');
    if (source) return { kind: 'material', key: source.dataset.supplySource };
    const product = element.closest('[data-supply-target], [data-supply-recipe]');
    return product ? { kind: 'recipe', key: product.dataset.supplyTarget || product.dataset.supplyRecipe } : null;
  },
  renderSupply() {
    const stores = document.getElementById('atlas-stores-page');
    if (!stores) return;
    stores.dataset.storesView = this.storesView;
    stores.querySelectorAll('[data-stores-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.storesView === this.storesView)));
    const equipment = stores.querySelector('.supply-equipment-grid');
    equipment.innerHTML = this.supplyRecipes().filter(recipe => recipe.kind === 'forge').map(recipe => {
      const material = Object.keys(recipe.requires)[0];
      const level = GameState.equipment[recipe.key];
      const canForge = GameState.canStartDayAction() && GameState.hasMaterial(material) && level !== 'mastercraft';
      return `<div class="crafted-item supply-equipment ${level ? 'owned' : ''}" data-supply-recipe="${recipe.key}">${this.supplyIngredients(recipe.requires)}<div class="supply-output"><span class="supply-port" aria-hidden="true"></span><div class="crafted-item-name"><button type="button" class="supply-target-button" data-supply-target="${recipe.key}" aria-pressed="false">${recipe.nameZh}</button><span class="item-status ${level ? 'available' : 'used'}">${level === 'mastercraft' ? '精工' : level === 'standard' ? '标准' : '未锻造'}</span></div><div class="crafted-item-effect">${recipe.standard}</div><div class="crafted-item-req">需要: ${GAME_DATA.materialNames[material]}x1</div><div class="crafted-item-actions"><button class="btn ${canForge ? 'primary' : ''}" ${canForge ? '' : 'disabled'} onclick="ForgeUI.start('${recipe.key}')">锻造</button><small class="supply-forge-cost">消耗一天</small></div></div></div>`;
    }).join('');
    I18n.apply(equipment);
    this.applySupplySelection(); this.scheduleSupplyWires();
  },
  applySupplySelection() {
    const stores = document.getElementById('atlas-stores-page');
    if (!stores) return;
    const active = this.supplyHover || this.supplySelection;
    const recipes = this.supplyRecipes();
    const related = active ? recipes.filter(recipe => active.kind === 'recipe' ? recipe.key === active.key : Object.hasOwn(recipe.requires, active.key)) : recipes;
    const targets = new Set(related.map(recipe => recipe.key));
    const materials = new Set(related.flatMap(recipe => Object.keys(recipe.requires)));
    stores.classList.toggle('supply-has-selection', Boolean(active));
    for (const node of stores.querySelectorAll('[data-supply-source]')) {
      const selected = active?.kind === 'material' && active.key === node.dataset.supplySource;
      node.classList.toggle('is-related', materials.has(node.dataset.supplySource));
      node.classList.toggle('is-selected', selected);
      node.setAttribute('aria-pressed', String(this.supplySelection?.kind === 'material' && this.supplySelection.key === node.dataset.supplySource));
    }
    for (const node of stores.querySelectorAll('[data-supply-recipe]')) node.classList.toggle('is-related', targets.has(node.dataset.supplyRecipe));
    for (const node of stores.querySelectorAll('[data-supply-target]')) {
      const selected = active?.kind === 'recipe' && active.key === node.dataset.supplyTarget;
      node.closest('[data-supply-recipe]').classList.toggle('is-selected', selected);
      node.setAttribute('aria-pressed', String(this.supplySelection?.kind === 'recipe' && this.supplySelection.key === node.dataset.supplyTarget));
    }
    for (const wire of stores.querySelectorAll('.supply-wire')) wire.classList.toggle('is-related', targets.has(wire.dataset.recipe));
    const note = stores.querySelector('.atlas-supply-note');
    // Pointer previews only recolour links. Changing this text before mouseup
    // would move a compact grid underneath the button being clicked.
    const pinned = this.supplySelection;
    const noteRecipes = pinned ? recipes.filter(recipe => pinned.kind === 'recipe' ? recipe.key === pinned.key : Object.hasOwn(recipe.requires, pinned.key)) : [];
    const parts = note.querySelector('.supply-note-parts');
    parts.replaceChildren();
    const add = (text, className = '') => {
      const part = document.createElement('span'); part.className = className; this.text(part, text); parts.append(part);
    };
    if (!pinned) {
      this.text(note.querySelector('strong'), '材料流向，尽在一页');
      add('点选材料或道具，沿连线查看配方。');
      add('材料数字：库存 / 所需', 'supply-mobile-guide');
    } else if (pinned.kind === 'material') {
      this.text(note.querySelector('strong'), GAME_DATA.materialNames[pinned.key]);
      add('库存'); add(String(GameState.materials[pinned.key])); add('→');
      noteRecipes.forEach(recipe => add(recipe.nameZh, 'supply-note-name'));
    } else {
      const recipe = noteRecipes[0];
      this.text(note.querySelector('strong'), recipe.nameZh);
      add('库存 / 所需');
      Object.entries(recipe.requires).forEach(([material, amount]) => {
        add(`${GAME_DATA.materialNames[material]} ${GameState.materials[material]} / ${amount}`, GameState.hasMaterial(material, amount) ? 'supply-enough' : 'supply-short');
      });
    }
    const reset = note.querySelector('.supply-reset'); reset.disabled = !pinned;
  },
  scheduleSupplyWires() {
    if (this.supplyFrame) return;
    this.supplyFrame = requestAnimationFrame(() => { this.supplyFrame = null; this.drawSupplyWires(); });
  },
  drawSupplyWires() {
    const stores = document.getElementById('atlas-stores-page');
    if (!stores || stores.hidden || this.storesView !== 'relations') return;
    const board = stores.querySelector('.atlas-supply-workspace');
    const svg = board.querySelector('.atlas-supply-wires');
    let bounds = board.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    svg.setAttribute('width', bounds.width); svg.setAttribute('height', bounds.height);
    // A responsive height change can clamp the current scroll position.
    // Measure the settled board after updating the SVG's viewport.
    bounds = board.getBoundingClientRect();
    const paths = [];
    for (const recipe of this.supplyRecipes()) {
      const card = board.querySelector(`[data-supply-recipe="${recipe.key}"]`);
      const target = card?.querySelector('.supply-output > .supply-port');
      if (!target) continue;
      const end = target.getBoundingClientRect();
      for (const [material, amount] of Object.entries(recipe.requires)) {
        const source = card.querySelector(`[data-supply-source="${material}"] .supply-port`);
        if (!source) continue;
        const start = source.getBoundingClientRect();
        const x1 = start.left + start.width / 2 - bounds.left, y1 = start.top + start.height / 2 - bounds.top;
        const x2 = end.left + end.width / 2 - bounds.left, y2 = end.top + end.height / 2 - bounds.top;
        const bend = Math.max(8, (x2 - x1) * .48);
        paths.push(`<path class="supply-wire ${GameState.hasMaterial(material, amount) ? 'has-stock' : ''}" data-material="${material}" data-recipe="${recipe.key}" d="M${x1},${y1} C${x1 + bend},${y1} ${x2 - bend},${y2} ${x2},${y2}"/>`);
      }
    }
    svg.innerHTML = paths.join('');
    this.applySupplySelection();
  },
  renderRegion() {
    const key = this.region, region = GAME_DATA.regions[key], rs = GameState.regions[key];
    document.body.dataset.region = key;
    document.querySelectorAll('[data-atlas-region-panel]').forEach(el => el.hidden = el.dataset.atlasRegionPanel !== key);
    document.querySelectorAll('[data-atlas-region-events]').forEach(el => el.hidden = el.dataset.atlasRegionEvents !== key);
    this.text(document.getElementById('atlas-event-region'), region.nameZh);
    for (const k of this.keys) {
      const status = GameState.beastsDefeated[k] ? '恐怖巨兽已击败' : GameState.regions[k].lairFound ? '巢穴已发现' : `${GameState.regions[k].tracking.filter(Boolean).length} / 3`;
      this.text(document.getElementById(`atlas-pin-${k}`), status);
      document.querySelector(`.atlas-pin[data-atlas-region="${k}"]`).setAttribute('aria-pressed', String(k === key));
    }
    const route = {halebeard:'M827 697C747 666 810 564 715 481S530 393 538 285',coastal:'M827 697C684 699 592 605 409 591',scar:'M827 697C908 584 1105 629 1146 418'};
    document.getElementById('atlas-active-route').setAttribute('d', route[key]);
    this.text(document.getElementById('atlas-file-number'), `FILE ${['I','II','III'][this.keys.indexOf(key)]}`);
    const art = document.getElementById('atlas-beast-art');
    if (art.getAttribute('src') !== region.terribleBeast.image) { art.classList.remove('atlas-image-failed'); art.parentElement.classList.remove('atlas-art-missing'); art.src = region.terribleBeast.image; }
    art.alt = region.terribleBeast.nameZh; art.setAttribute('data-i18n-alt', region.terribleBeast.nameZh);
    this.text(document.getElementById('atlas-beast-name'), region.terribleBeast.nameZh);
    const hp = Math.max(0, region.terribleBeast.hp - (GameState.beastWounds[key] || 0));
    this.text(document.getElementById('atlas-beast-life'), GameState.beastsDefeated[key] ? '恐怖巨兽已击败' : `HP ${hp} / ${region.terribleBeast.hp}`);
    const btn = document.getElementById('atlas-start-search');
    btn.disabled = !GameState.canStartDayAction() || rs.searchBoxes.every(b => b.complete);
    const houses = GameState.huts.filter(Boolean).length;
    const towers = Object.values(GameState.towers).filter(t => t.complete && !t.destroyed).length;
    this.text(document.getElementById('atlas-village-summary'), `${towers} / 3  ·  ${houses} / ${GameState.huts.length}`);
  },
  installContexts() {
    const groups = [
      [Game, {'showSearchDialog':'search-select','confirmTerribleBeastHunt':'hunt-bait','showPotentBaitDialog':'hunt-bait','showBloodLureDialog':'hunt-bait','showBloodLureBeasts':'hunt-bait','showBuildDialog':'build-repair','showForgeDialog':'forge','showCraftDialog':'craft','showInventory':'inventory','showDebug':'debug','showHelp':'help-journal','saveGame':'save-load-reset','loadGame':'save-load-reset','showGameOver':'endings'}],
      [UI, {'showRestDialog':'rest-day-end','showNewGameDialog':'save-load-reset','attachHawkTotem':'elder-recharge'}],
      [SearchUI, {'start':'search-place','showIntermediateResult':'search-result','showFinalResults':'search-result','showSearchActionOptions':'search-result','showPostCombatOptions':'search-result'}],
      [CombatUI, {'renderCombat':'combat','useItem':'combat-items-flee','victory':'combat-outcome','defeat':'combat-outcome'}],
      [BuildUI, {'selectMaterial':'build-repair','renderBuild':'build-repair','handleFault':'build-repair','showRepairMaterialSelection':'build-repair','showElderSelection':'elder-recharge','selectElder':'elder-recharge','showRechargeUI':'elder-recharge'}],
      [ForgeUI, {'renderForge':'forge','showRefinementResult':'forge','complete':'forge','abort':'forge'}],
      [CraftUI, {'open':'craft','selectRecipe':'craft','craft':'craft'}],
      [Events, {'showEventResults':'events','processNextBeastAttack':'attacks','showBeastAttackResult':'attacks'}],
      [Tutorial, {'showWelcome':'tutorial','complete':'tutorial'}],
    ];
    for (const [object, methods] of groups) for (const [name, scene] of Object.entries(methods)) {
      const original = object[name];
      object[name] = (...args) => { const previous = this.context; this.context = scene; try { return original.apply(object, args); } finally { this.context = previous; } };
    }
  },
  fillSheetMeta(el) {
    const compactEnglish = (el.closest('.atlas-roll-sheet') || el.parentElement?.querySelector('#debug-console, .forge-workbench, .craft-panel')) && I18n.language === 'en';
    const labels = compactEnglish ? ['Day', 'HP', 'Doubt', 'DP'] : ['天数', '生命', '怀疑', '决心'];
    const pairs = [[labels[0],`${GameState.getDisplayDay()}/14`],[labels[1],`${GameState.hp.current}/${GameState.hp.max}`],[labels[2],`${GameState.doubt.current}/${GameState.doubt.max}`],[labels[3],GameState.determination]];
    if (!el.children.length) el.innerHTML = pairs.map(() => '<span><i></i><b></b></span>').join('');
    pairs.forEach(([label,value],i) => { this.text(el.children[i].querySelector('i'),label); this.text(el.children[i].querySelector('b'),value); });
  },
  decorateSheet(scene) {
    const content = document.getElementById('modal-content');
    content.classList.remove('atlas-roll-sheet', 'atlas-help-sheet', 'atlas-combat-sheet');
    content.classList.add('atlas-sheet'); content.dataset.scene = scene;
    content.setAttribute('role','dialog'); content.setAttribute('aria-modal','true');
    const title = content.querySelector('.modal-title');
    if (title) { title.id = 'atlas-sheet-title'; content.setAttribute('aria-labelledby', title.id); }
    const meta = document.createElement('div'); meta.className = 'atlas-sheet-meta'; this.fillSheetMeta(meta); content.prepend(meta);
    for (const reference of content.querySelectorAll('details.search-reference, details.combat-reference')) {
      const key = reference.classList.contains('search-reference') ? 'search' : 'combat';
      reference.open = Boolean(this.referencesOpen[key]);
      reference.addEventListener('toggle', () => { this.referencesOpen[key] = reference.open; });
    }
    this.prepareRollSheet(content);
    this.fillSheetMeta(meta);
    if (content.querySelector('.help-rules')) content.classList.add('atlas-help-sheet');
    I18n.apply(content);
  },
  prepareRollSheet(content) {
    const panel = content.querySelector('.search-panel, .build-panel, .forge-panel, .combat-panel');
    if (!panel) return;
    const kind = ['search', 'build', 'forge', 'combat'].find(key => panel.classList.contains(`${key}-panel`));
    if (!panel.querySelector(`#${kind}-dice`)) return;
    content.classList.add('atlas-roll-sheet');
    content.dataset.rollKind = kind;
    // Illustrated search and forge scenes already contain their live work area.
    if (panel.querySelector('.atlas-roll-main')) return;
    if (kind === 'build') content.dataset.tower = GameState.build.tower;
    const info = document.createElement('details'); info.className = 'atlas-roll-info';
    info.innerHTML = '<summary>规则与记录</summary><div class="atlas-roll-info-body"></div>';
    const body = info.lastElementChild;
    const main = document.createElement('div'); main.className = 'atlas-roll-main';
    const children = [...panel.children];
    for (const child of children) {
      const active = child.matches(`#${kind}-dice, #${kind}-placement, .tower-grid`) ||
        (kind === 'forge' && child.querySelector('.forge-cell'));
      (active ? main : body).append(child);
    }
    panel.append(info, main);
    if (kind === 'combat') {
      content.classList.add('atlas-combat-sheet');
      const encounter = body.querySelector('.combat-encounter');
      const modifiers = body.querySelector('.combat-modifiers');
      const actions = document.createElement('div'); actions.className = 'atlas-combat-actions';
      actions.append(modifiers, main);
      panel.prepend(encounter, actions);
    }
  },
  compactRoll(content) {
    if (!content.classList.contains('atlas-roll-sheet')) return;
    for (const note of content.querySelectorAll('.dp-roll-note:not(.atlas-roll-note)')) {
      note.classList.add('atlas-roll-note');
      content.querySelectorAll('.atlas-roll-note').forEach(previous => { if (previous !== note) previous.remove(); });
      content.querySelector('.atlas-roll-info-body').prepend(note);
    }
    const hint = content.querySelector('#mentor-hint');
    const infoBody = content.querySelector('.atlas-roll-info-body');
    if (hint && infoBody && hint.parentElement !== infoBody) infoBody.prepend(hint);
    const tutorial = content.querySelector('#tutorial-note');
    if (tutorial) {
      const context = tutorial.querySelector('.mentor-context');
      if (context && context.parentElement === tutorial) {
        const details = document.createElement('details'); details.className = 'atlas-tutorial-context';
        const summary = document.createElement('summary'); this.text(summary, '为什么这样做？');
        context.before(details); details.append(summary, context);
      }
    }
    const main = content.querySelector('.atlas-roll-main');
    const kind = content.dataset.rollKind;
    const pending = kind === 'search' ? GameState.search?.pendingRoll : kind === 'build' ? GameState.build?.pendingRoll : kind === 'forge' ? GameState.forge?.pendingRoll : GameState.combat?.pendingRoll;
    main.classList.toggle('atlas-has-roll', Boolean(pending));
    if (kind === 'search' && GameState.search) {
      let progress = main.querySelector('.atlas-roll-progress');
      if (!progress) { progress = document.createElement('div'); progress.className = 'atlas-roll-progress'; (main.querySelector('.search-workspace') || main).prepend(progress); }
      const search = GameState.search;
      const value = `搜索 ${search.boxesCompleted + 1}/${search.maxSearches} · 掷骰 ${search.rollCount + 1}/3`;
      if (progress.dataset.value !== value) { progress.dataset.value = value; this.text(progress, value); }
    }
    if (kind === 'build' || kind === 'forge') {
      const placement = main.querySelector(`#${kind}-placement`);
      if (!placement) return;
      const choices = [...placement.querySelectorAll(`button[onclick^="${kind === 'build' ? 'BuildUI' : 'ForgeUI'}.selectDie("]`)];
      const dice = [...main.querySelectorAll(`#${kind}-dice .die`)];
      const duplicate = choices.length > 0 && choices.length === dice.length;
      placement.classList.toggle('atlas-duplicate-choices', duplicate);
      if (duplicate) choices.forEach((choice, index) => {
        const die = dice[index];
        die.setAttribute('role', 'button'); die.tabIndex = choice.disabled ? -1 : 0;
        die.setAttribute('aria-disabled', String(choice.disabled));
        if (die.tagName === 'BUTTON') die.disabled = choice.disabled;
        if (choice.disabled) die.removeAttribute('onclick'); else die.setAttribute('onclick', choice.getAttribute('onclick'));
        die.classList.add('atlas-selectable-die');
        die.title = I18n.translateString('选择要放置的骰子。');
      });
    }
  },
  polish(root) {
    if (!root?.querySelectorAll) return;
    for (const el of root.querySelectorAll('[style]')) {
      const size = parseFloat(el.style.fontSize);
      if (size && size < 12) el.style.fontSize = '12px';
      if (el.style.backgroundColor === 'rgb(237, 247, 237)') el.style.backgroundColor = 'var(--atlas-paper-raised)';
      if (el.style.borderRadius) el.style.borderRadius = 'var(--atlas-radius)';
    }
    for (const el of root.querySelectorAll('.tower-cell[onclick], .die[onclick]')) {
      if (!el.getAttribute('onclick')?.trim()) continue;
      el.setAttribute('role','button'); el.tabIndex = el.classList.contains('disabled') ? -1 : 0;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (['SCRIPT','STYLE','SVG'].includes(node.parentElement?.tagName)) continue;
      const clean = node.nodeValue.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '');
      if (clean !== node.nodeValue) node.nodeValue = clean;
    }
    if (root.id === 'modal-content') { this.compactRoll(root); LoadoutUI.decorateModal(root); }
  },
  onKey(event) {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.material-item[role="button"]')) { event.preventDefault(); event.target.click(); return; }
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.tower-cell[role="button"], .die[role="button"]')) { event.preventDefault(); event.target.click(); return; }
    if (Tutorial.active || event.defaultPrevented || !document.getElementById('modal-overlay').classList.contains('active')) return;
    const content = document.getElementById('modal-content');
    if (event.key === 'Escape') {
      const debugClose = content.querySelector('[data-debug-close]');
      if (debugClose) { event.preventDefault(); debugClose.click(); return; }
      // Only dismiss through a cancellation the rule UI actually offers.
      const cancel = content.querySelector('button[onclick="UI.closeModal()"]');
      if (cancel && GameState.phase === 'idle' && !GameState.pendingDayAction) { event.preventDefault(); cancel.click(); }
    }
    if (event.key !== 'Tab') return;
    const controls = [...content.querySelectorAll('button:not(:disabled), input, select, summary, a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
    if (!controls.length) return;
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && (document.activeElement === first || !content.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || !content.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
  },
};
document.addEventListener('DOMContentLoaded', () => AtlasUI.init());
