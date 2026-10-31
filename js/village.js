// The village is a scene backed by the original state, tower grids and actions.
const VillageUI = {
  selection: 'hall',
  towerNames: { west: '西南塔', south: '南方塔', east: '东方塔' },
  towerSites: { west: [16, 61], south: [60, 83], east: [88, 54] },
  hutSites: [[34,48],[45,48],[57,49],[68,54],[29,62],[42,64],[56,63],[70,66],[46,74]],

  mount(page, { towers, huts, elders, towerNote }) {
    page.classList.add('village-scene-page');
    page.innerHTML = `<div class="village-experience">
      <section class="village-scene" aria-label="村庄场景">
        <header class="village-scene-heading"><div><small>THE VILLAGE / YOUR REFUGE</small><h2>藏身之地</h2><p>这里的每一盏灯，都值得你守住。</p></div>
          <div class="village-pan-controls"><button type="button" data-village-pan="-1" aria-label="向左查看村庄">‹</button><button type="button" data-village-pan="1" aria-label="向右查看村庄">›</button></div>
        </header>
        <div class="village-pan" tabindex="0" role="region" aria-label="村庄场景，可左右滑动">
          <div class="village-world">
            <img class="village-scene-art" src="assets/atlas/village-base.webp" alt="松林与木栅环绕的山谷村庄，曲径连接议事厅、营地和工坊">
            <div class="village-art-fallback">场景暂不可用，建筑操作仍可使用。</div>
            ${Object.entries(this.towerSites).map(([key, [x,y]]) => `<button type="button" class="village-building village-tower" data-village-select="tower:${key}" style="--site-x:${x}%;--site-y:${y}%;">
              <span class="village-sprite village-tower-sprite" aria-hidden="true"></span><span class="village-tower-health" aria-hidden="true">${Array.from({length: 6}, () => '<span class="village-tower-health-cell"></span>').join('')}</span><span class="village-building-label"><strong>${this.towerNames[key]}</strong><small></small></span><span class="village-totem-mark" aria-hidden="true">${AtlasUI.icon('spark')}</span>
            </button>`).join('')}
            ${this.hutSites.map(([x,y], index) => `<button type="button" class="village-building village-hut" data-village-select="hut:${index}" style="--site-x:${x}%;--site-y:${y}%;">
              <span class="village-sprite village-hut-sprite" aria-hidden="true"></span><span class="village-hut-number">${index + 1}</span>
            </button>`).join('')}
            <button type="button" class="village-building village-landmark village-hall" data-village-select="hall" aria-label="长老议事厅" style="--site-x:54%;--site-y:32%;"><span class="village-landmark-target"></span><span class="village-building-label"><strong>长老议事厅</strong><small data-village-approvals></small></span></button>
            <button type="button" class="village-building village-landmark village-smithy" data-village-select="smithy" aria-label="工匠作坊" style="--site-x:76%;--site-y:41%;"><span class="village-landmark-target"></span><span class="village-building-label"><strong>工匠作坊</strong><small>锻造 / 合成</small></span></button>
            <button type="button" class="village-building village-landmark village-camp" data-village-select="camp" aria-label="猎人营地" style="--site-x:30%;--site-y:34%;"><span class="village-landmark-target"></span><span class="village-building-label"><strong>猎人营地</strong><small>休息 / 恢复</small></span></button>
          </div>
        </div>
        <footer class="village-scene-ledger"><span><i>村民小屋</i><b data-village-count="huts"></b></span><span><i>防御塔</i><b data-village-count="towers"></b></span><span><i>长老审批</i><b data-village-count="elders"></b></span></footer>
      </section>
      <aside class="village-dossier" id="village-detail" aria-label="村庄建筑详情">
        <div class="village-dossier-label"><span>村庄档案</span><small data-village-file></small></div>
        <header class="village-detail-heading"><h2 data-village-title></h2><p data-village-description></p></header>
        <div data-village-pane="tower"><div class="village-towers-host"></div><div class="village-build-action"></div><details class="village-rules"><summary>防线规则</summary></details></div>
        <div data-village-pane="hall"></div>
        <div data-village-pane="hut"><div class="village-hut-status" role="status"></div></div>
        <div data-village-pane="smithy"><div class="village-service-note">把带回的材料，变成下一次归来的底气。</div><button type="button" class="btn primary" data-village-action="forge">锻造装备</button><button type="button" class="btn" data-village-action="craft">合成道具</button><button type="button" class="village-stores-link" data-atlas-page="stores">查看材料与配方 →</button></div>
        <div data-village-pane="camp"><div class="village-rest-value"><small>当前生命</small><strong data-village-hp></strong></div><p class="village-service-note">休息恢复2HP，消耗一天，怀疑+1。</p><button type="button" class="btn primary" data-village-action="rest">在营地休息</button></div>
      </aside>
      <nav class="village-places" aria-label="村庄地点"><span>前往</span>${[['tower:west','西南塔'],['tower:south','南方塔'],['tower:east','东方塔'],['hall','议事厅'],['smithy','工坊'],['camp','营地'],['hut:0','村民小屋']].map(([key,label]) => `<button type="button" data-village-select="${key}">${label}</button>`).join('')}</nav>
    </div>`;
    page.querySelector('.village-towers-host').append(towers);
    page.querySelector('.village-rules').append(towerNote);
    page.querySelector('[data-village-pane="hall"]').append(elders);
    page.querySelector('[data-village-pane="hut"]').append(huts);
    page.querySelector('.village-pan').addEventListener('scroll', () => {
      cancelAnimationFrame(this.labelFrame);
      this.labelFrame = requestAnimationFrame(() => this.updateLabels());
    }, { passive: true });
    page.addEventListener('click', event => {
      const choice = event.target.closest('[data-village-select]');
      if (choice) this.select(choice.dataset.villageSelect, true);
      const pan = event.target.closest('[data-village-pan]');
      if (pan) page.querySelector('.village-pan').scrollBy({ left: Number(pan.dataset.villagePan) * page.querySelector('.village-pan').clientWidth * .6, behavior: this.scrollBehavior() });
      const hut = event.target.closest('#huts-grid .hut-cell');
      if (hut) this.select(`hut:${hut.dataset.hutIndex}`);
      const action = event.target.closest('[data-village-action]');
      if (action) this.act(action.dataset.villageAction);
    });
    page.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('#huts-grid .hut-cell')) { event.preventDefault(); event.target.click(); }
    });
    this.observer = new ResizeObserver(() => this.updatePan());
    this.observer.observe(page.querySelector('.village-pan'));
  },

  scrollBehavior() { return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'; },

  updatePan() {
    const page = document.getElementById('atlas-village-page');
    if (!page || page.hidden) return;
    const pan = page.querySelector('.village-pan');
    const overflows = pan.scrollWidth > pan.clientWidth + 1;
    page.querySelector('.village-pan-controls').hidden = !overflows;
    if (overflows && !this.panInitialized) pan.scrollLeft = pan.scrollWidth * .54 - pan.clientWidth / 2;
    this.panInitialized = overflows;
    this.updateLabels();
  },

  updateLabels() {
    const page = document.getElementById('atlas-village-page');
    if (!page || page.hidden) return;
    const bounds = page.querySelector('.village-pan').getBoundingClientRect();
    const heading = page.querySelector('.village-scene-heading > div:first-child').getBoundingClientRect();
    page.querySelectorAll('.village-building-label').forEach(label => {
      const rect = label.getBoundingClientRect();
      const clipped = rect.left < bounds.left + 4 || rect.right > bounds.right - 4;
      const underHeading = rect.left < heading.right && rect.right > heading.left && rect.top < heading.bottom && rect.bottom > heading.top;
      label.style.visibility = clipped || underHeading ? 'hidden' : 'visible';
    });
  },

  select(key, reveal = false) {
    if (!['hall','smithy','camp', ...Object.keys(this.towerNames).map(key => `tower:${key}`), ...this.hutSites.map((_,i) => `hut:${i}`)].includes(key)) return;
    this.selection = key;
    this.render();
    const page = document.getElementById('atlas-village-page');
    const target = page.querySelector(`.village-building[data-village-select="${key}"]`);
    const pan = page.querySelector('.village-pan');
    if (target && pan.scrollWidth > pan.clientWidth) pan.scrollTo({ left: target.offsetLeft - pan.clientWidth / 2, behavior: this.scrollBehavior() });
    if (reveal && matchMedia('(max-width: 1050px)').matches) page.querySelector('.village-dossier').scrollIntoView({ block: 'nearest', behavior: this.scrollBehavior() });
    AtlasUI.text(document.getElementById('atlas-announcer'), page.querySelector('[data-village-title]').textContent);
  },

  render() {
    const page = document.getElementById('atlas-village-page');
    if (!page?.querySelector('.village-experience')) return;
    const [kind, key] = this.selection.split(':');
    const selectedPane = kind === 'tower' ? 'tower' : kind === 'hut' ? 'hut' : kind;
    page.querySelectorAll('[data-village-pane]').forEach(pane => { pane.hidden = pane.dataset.villagePane !== selectedPane; });
    page.querySelectorAll('[data-village-select]').forEach(button => {
      const hutGroup = kind === 'hut' && button.dataset.villageSelect === 'hut:0' && button.closest('.village-places');
      button.setAttribute('aria-pressed', String(button.dataset.villageSelect === this.selection || Boolean(hutGroup)));
    });
    const approvals = Object.values(GameState.elders).filter(Boolean).length;
    const houses = GameState.huts.filter(Boolean).length;
    const standing = Object.values(GameState.towers).filter(tower => tower.complete && !tower.destroyed).length;
    const counts = { huts: `${houses} / ${GameState.huts.length}`, towers: `${standing} / 3`, elders: `${approvals} / 3` };
    page.querySelectorAll('[data-village-count]').forEach(element => { element.textContent = counts[element.dataset.villageCount]; });
    AtlasUI.text(page.querySelector('[data-village-approvals]'), `已获审批 ${approvals}/3`);
    page.querySelectorAll('.village-hut').forEach((button, index) => {
      const intact = GameState.huts[index];
      button.dataset.state = intact ? 'intact' : 'destroyed';
      const label = `小屋 ${index + 1} · ${intact ? '完好' : '已摧毁'}`;
      button.setAttribute('aria-label', label); button.setAttribute('data-i18n-aria-label', label);
      button.title = label; button.setAttribute('data-i18n-title', label);
    });
    Object.keys(this.towerNames).forEach(towerKey => {
      const tower = GameState.towers[towerKey], button = page.querySelector(`.village-tower[data-village-select="tower:${towerKey}"]`);
      const faults = BuildUI.countFaults(towerKey, tower.grid);
      const status = tower.destroyed ? '已摧毁' : tower.hawkTotem ? '图腾防护' : tower.complete ? '已建成' : '待建造';
      button.dataset.state = tower.destroyed ? 'destroyed' : tower.complete ? 'complete' : 'unfinished';
      button.classList.toggle('has-totem', Boolean(tower.hawkTotem));
      button.classList.toggle('has-faults', faults > 0);
      AtlasUI.text(button.querySelector('small'), faults && tower.complete ? `${status} · ${faults} X` : status);
      // Six display cells summarize the original X damage; no separate HP state.
      const health = tower.destroyed ? 0 : tower.complete ? Math.max(0, 6 - faults) : null;
      const lost = health === null ? 0 : 6 - health;
      button.querySelectorAll('.village-tower-health-cell').forEach((cell, index) => {
        cell.classList.toggle('remaining', health !== null && index >= lost);
        cell.classList.toggle('lost', health !== null && index < lost);
      });
      const label = `${this.towerNames[towerKey]} · ${status}${health === null ? '' : ` · HP ${health}/6`}`;
      button.setAttribute('aria-label', label); button.setAttribute('data-i18n-aria-label', label);
      const panel = document.getElementById(`tower-${towerKey}-grid`).closest('.tower-panel');
      panel.hidden = kind !== 'tower' || key !== towerKey;
      panel.querySelectorAll('button').forEach(action => { action.disabled = !GameState.canStartDayAction(); });
    });
    const titles = { hall: '长老议事厅', smithy: '工匠作坊', camp: '猎人营地', hut: `小屋 ${Number(key) + 1}`, tower: this.towerNames[key] };
    const descriptions = { hall: '信任需要行动来换取。', smithy: '让下一次出发，多一分胜算。', camp: '收起武器，喘息片刻。', hut: '这些屋檐之下，是你要守住的人。', tower: '守住这条来路，巨兽就无法踏入村庄。' };
    AtlasUI.text(page.querySelector('[data-village-title]'), titles[kind]);
    AtlasUI.text(page.querySelector('[data-village-description]'), descriptions[kind]);
    page.querySelector('[data-village-file]').textContent = kind === 'tower' ? `DEFENCE / ${key.toUpperCase()}` : `VILLAGE / ${kind.toUpperCase()}`;
    if (kind === 'tower') this.renderBuildAction(page, key);
    page.querySelectorAll('#huts-grid .hut-cell').forEach((hut, index) => {
      hut.dataset.hutIndex = index; hut.setAttribute('role','button'); hut.tabIndex = 0;
      hut.setAttribute('aria-pressed', String(kind === 'hut' && Number(key) === index));
    });
    if (kind === 'hut') AtlasUI.text(page.querySelector('.village-hut-status'), GameState.huts[Number(key)] ? '小屋完好' : '小屋已被巨兽摧毁');
    page.querySelector('[data-village-hp]').textContent = `${GameState.hp.current} / ${GameState.hp.max}`;
    page.querySelectorAll('[data-village-action]').forEach(button => {
      if (button.dataset.villageAction !== 'build') button.disabled = !GameState.canStartDayAction();
    });
    I18n.apply(page);
    this.updatePan();
  },

  renderBuildAction(page, key) {
    const tower = GameState.towers[key];
    const hasMaterial = GAME_DATA.materials.common.some(material => GameState.materials[material] > 0);
    const host = page.querySelector('.village-build-action');
    // Preserve keyboard focus when a render refreshes the page's live values.
    if (!host.children.length) host.innerHTML = '<button type="button" class="btn primary" data-village-action="build"></button><p class="village-build-cost"></p>';
    const button = host.querySelector('button');
    button.disabled = tower.complete || !GameState.canStartDayAction() || !hasMaterial;
    AtlasUI.text(button, tower.complete ? '防线已建成' : tower.destroyed ? '重建这座塔' : '建造这座塔');
    AtlasUI.text(host.querySelector('p'), tower.complete ? '只有对应方向的完工防御塔能够阻挡袭击。' : hasMaterial ? '消耗1普通材料与一天。' : '需要1个普通材料：石头、绳索或焦油。');
  },

  act(action) {
    if (!GameState.canStartDayAction()) return;
    if (action === 'build') {
      const [kind, key] = this.selection.split(':');
      if (kind === 'tower' && !GameState.towers[key].complete && GAME_DATA.materials.common.some(material => GameState.materials[material] > 0)) BuildUI.selectMaterial(key);
    }
    if (action === 'forge') Game.showForgeDialog();
    if (action === 'craft') Game.showCraftDialog();
    if (action === 'rest') UI.showRestDialog();
  },
};
