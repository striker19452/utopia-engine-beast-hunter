// Practice uses the real game operations, but never the player's save slot.
const Tutorial = {
  storageKey: 'uebh_onboarding_v1',
  active: false,
  generation: 0,
  stage: 'ready',
  selectedDie: false,
  encounterPending: false,
  preferences: { version: 1, welcomed: false, completed: false, hints: true, seen: [] },
  lessons: {
    goal: ['游戏目标', '在14天内击败三只恐怖巨兽。生命降到0、怀疑达到18，或时间轨道走到终点，都会失败。普通怪物不是最终目标。'],
    explore: ['为什么要探索', '探索能获得材料、追踪巨兽并发现巢穴。普通材料用于建塔，稀有材料用于锻造装备，怪物材料可与普通材料合成物品。'],
    time: ['时间轨道', '每天选择一项行动：搜索、建造、锻造或休息。一次搜索日通常最多搜索3次。E代表事件，!代表巨兽袭击，骷髅代表期限终点。合成不消耗一天。'],
    doubt: ['村民的怀疑', '怀疑达到18就会被赶出村庄。多数行动每天增加1加已毁小屋数；完成塔楼或击败恐怖巨兽当天不增加怀疑，休息固定增加1。'],
    determination: ['决心的作用', '决心能在掷骰后花1点把一颗骰子调整±1，点数不能超出1到6。发现巢穴、暴击、完美建造等可获得决心；事件和袭击骰不能调整。'],
    build: ['建造防御塔', '先花1个普通材料，再把骰子放入塔格；上下左右的邻接决定能否放置。无法放置需要额外材料修补，建造会消耗一天。'],
    forge: ['锻造装备', '花费对应稀有材料，尽量让每列上方减下方接近0。负数会使你受伤并重填；完成锻造会消耗一天。'],
    craft: ['合成物品', '选一件材料足够的物品即可合成，不消耗一天。每件需要1个普通材料和1个怪物材料，战斗中不能合成。'],
    beast: ['挑战恐怖巨兽', '巨兽比普通怪物更危险，先查看攻击范围与特性。挑战占用一次搜索；逃离后已造成的伤害仍会保留。'],
    attack: ['村庄遭到袭击', '只有来袭方向已完成的塔能保护小屋。小屋被毁会立即增加怀疑，也会提高以后多数行动的每日怀疑。'],
  },

  capture() {
    return structuredClone(Object.fromEntries(Object.entries(GameState).filter(([, value]) => typeof value !== 'function')));
  },
  restore(snapshot) {
    for (const [key, value] of Object.entries(GameState)) {
      if (typeof value !== 'function') delete GameState[key];
    }
    Object.assign(GameState, structuredClone(snapshot));
  },
  persist() {
    try { localStorage.setItem(this.storageKey, JSON.stringify(this.preferences)); } catch (_) { /* Memory-only guidance still works. */ }
  },
  dismissInvitation() {
    this.preferences.welcomed = true;
    this.persist();
    this.renderInvitation();
  },
  renderInvitation() {
    const el = document.getElementById('onboarding-invitation');
    if (!el) return;
    el.hidden = this.active || this.preferences.welcomed || this.preferences.completed;
    if (!el.hidden) el.innerHTML = `<strong>第一次来到村庄？一起练习一次搜索</strong><p>长老会陪你完成约5分钟的小冒险。练习不会影响正式进度。</p><div class="mentor-actions"><button class="btn primary" onclick="Tutorial.start()">开始练习</button><button class="btn" onclick="Tutorial.dismissInvitation()">直接游玩</button></div>`;
  },
  start() {
    if (this.active || GameState.phase !== 'idle' || GameState.pendingDayAction) return;
    this.original = this.capture();
    this.originalFocus = document.activeElement;
    this.originalInert = document.getElementById('game-interface').inert;
    document.getElementById('game-interface').inert = true;
    const modal = document.getElementById('modal-content');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '新手引导');
    this.generation++;
    this.active = true;
    this.stage = 'ready';
    this.checkpoint = null;
    this.selectedDie = false;
    this.encounterPending = false;
    this.dismissInvitation();
    GameState.reset();
    this.renderLog();
    UI.closeModal();
    UI.render();
    this.showWelcome();
  },
  showWelcome() {
    UI.showModal(`<div class="modal-title">长老的第一堂课</div><p>这里使用固定的练习骰子；正式游戏中，骰子是随机的。</p><div class="confirm-actions"><button class="btn primary" onclick="Game.showSearchDialog()">搜索荒野</button></div>`);
  },
  exit(newGame = false) {
    if (!this.active) return;
    this.generation++;
    this.active = false;
    this.clearPointer();
    this.restore(this.original);
    document.getElementById('game-interface').inert = this.originalInert;
    const modal = document.getElementById('modal-content');
    ['role', 'aria-modal', 'aria-label', 'data-i18n-aria-label'].forEach(attr => modal.removeAttribute(attr));
    this.original = null;
    this.checkpoint = null;
    UI.closeModal();
    UI.render();
    if (newGame) Game.newGame();
    this.renderLog();
    if (this.originalFocus?.isConnected && !this.originalFocus.closest('#modal-content')) this.originalFocus.focus();
    else document.getElementById('btn-help')?.focus();
  },
  replay() {
    this.exit();
    this.start();
  },
  retry() {
    if (!this.active || !this.checkpoint || !['search', 'combat'].includes(this.stage)) return;
    this.generation++;
    const checkpoint = this.checkpoint;
    this.restore(checkpoint.state);
    this.renderLog();
    this.stage = checkpoint.stage;
    this.selectedDie = false;
    UI.render();
    if (this.stage === 'search') SearchUI.start('halebeard');
    else CombatUI.renderCombat();
  },
  selectDie(index) {
    const search = GameState.search;
    if (!this.active || this.stage !== 'search' || !search?.pendingRoll || index !== search.pendingDieIndex) return;
    this.selectedDie = true;
    this.render();
    document.querySelector('#search-placement button:not(:disabled)')?.focus();
  },
  practiceRoll(context) {
    if (!this.active) return null;
    if (context === 'search') {
      const search = GameState.search;
      return [...(search.boxesCompleted === 0 ? [[4, 4], [3, 1], [2, 1]] : [[6, 4], [3, 3], [2, 2]])[search.rollCount]];
    }
    if (context === 'combat') return (GameState.combat.roundCount || 0) === 0 ? [5, 1] : [4, 2];
    if (context === 'events') return [1, 1, 3, 5];
    return null;
  },
  allowed(action) {
    if (!this.active) return true;
    const stage = this.stage;
    if (action.includes('Tutorial.')) return true;
    if (stage === 'ready') return action.includes('Game.showSearchDialog');
    if (stage === 'region') return action.includes("Game.startSearch('halebeard')");
    if (stage === 'search') {
      if (action.includes('SearchUI.rollDice')) return !GameState.search.pendingRoll;
      const match = action.match(/SearchUI.placeDie\('(top|bottom)',\s*(\d),\s*(\d)\)/);
      return Boolean(match && this.selectedDie && match[1] === (GameState.search.pendingDieIndex === 0 ? 'top' : 'bottom') && Number(match[2]) === GameState.search.rollCount && Number(match[3]) === GameState.search.pendingDieIndex);
    }
    if (stage === 'result') return action.includes("SearchUI.start('halebeard')");
    if (stage === 'encounter') return !this.encounterPending && action.includes('SearchUI.continueSearch');
    if (stage === 'combat') {
      const combat = GameState.combat;
      if (action.includes('CombatUI.rollCombatDice')) return !combat?.pendingRoll;
      if (action.includes('CombatUI.resolveCombatRoll')) return Boolean(combat?.pendingRoll && (!(combat.roundCount || 0) || combat.usedDeterminationThisRoll));
      return /CombatUI.modifyPendingDie\(0,\s*1\)/.test(action) && combat?.roundCount === 1 && combat.pendingRoll?.[0] === 4;
    }
    if (stage === 'victory') return action.includes('SearchUI.showPostCombatOptions');
    if (stage === 'end') return action.includes('SearchUI.endSearchDay');
    if (stage === 'events') return action.includes('Events.afterEvents');
    return false;
  },
  guidance() {
    switch (this.stage) {
      case 'ready': return ['先找一些材料', '点击“搜索荒野”，我们一起认识骰子。'];
      case 'region': return ['去海尔比尔德峰', '这里能找到石头，石头可以用来建塔。'];
      case 'search': {
        const search = GameState.search;
        if (!search.pendingRoll) return ['掷出两颗练习骰子', '你会掷三次，把六个数字组成上下两个三位数。'];
        const index = search.pendingDieIndex;
        return [this.selectedDie ? (index === 0 ? '放入高亮的上方空位' : '放入高亮的下方空位') : '先点选当前骰子', '放置位置会改变搜索结果。我们先练习一种放法。'];
      }
      case 'result': return ['你找到石头了', '432 − 411 = 21：获得1个石头和1个追踪圈。再搜索一次，看看另一种结果。'];
      case 'encounter': return ['准备应对一只小怪', '632 − 432 = 200：遭遇1级霜地精。进入遭遇，看看骰子怎样决定攻防。'];
      case 'combat': {
        const combat = GameState.combat;
        if (!combat.roundCount) return ['掷骰并结算第一轮', '5或6会命中霜地精，1会让你受伤；同一轮双方的命中一起结算。'];
        if (!combat.pendingRoll) return ['再掷一次，试试改变结果', '你获得1个练习专用决心点，可以把一颗骰子调整1点。'];
        return combat.usedDeterminationThisRoll
          ? ['结算这次命中', '4已变成5，现在它在你的攻击范围内了。']
          : ['点击骰子4旁的“+”', '花费1个决心点把4变成5，就能命中剩下的怪物。'];
      }
      case 'victory': return ['你击败了霜地精', '你获得污血。材料以后可以用来合成物品。'];
      case 'end': return ['主动结束今天的搜索', '今天还剩1次搜索，结束后会失去。接下来先处理事件，再结算怀疑。'];
      case 'day': return ['看看一天带来的变化', '今天是事件日，先处理事件，再增加怀疑。'];
      case 'events': return ['确认今天的事件', '这些练习结果会影响之后的区域；确认后才结算今天的怀疑。'];
      case 'complete': return ['你已经会搜索和应对普通怪物了', '进入正式游戏后，长老会在你首次遇到新机制时给出简短提示。'];
      default: return ['', ''];
    }
  },
  milestone() {
    switch (this.stage) {
      case 'ready': return [this.lessons.goal, this.lessons.explore];
      case 'result': return [
        ['为什么要建造塔楼', '巨兽会袭击村庄。只有来袭方向已完成的塔能保护小屋；小屋被毁会立即增加怀疑，并提高以后的每日怀疑。建塔是在为狩猎争取时间。'],
        ['追踪通向最终目标', '一个区域填满3个追踪圈就会发现巢穴，获得1点决心，并能花一次搜索挑战当地恐怖巨兽。'],
      ];
      case 'combat': return GameState.combat.roundCount ? [this.lessons.determination] : [
        ['照顾好自己的生命', '生命降到0会失败。这只霜地精是练习对手，击败它能获得材料；正式目标仍是三只恐怖巨兽。'],
      ];
      case 'end': return [this.lessons.time];
      case 'events': return [this.lessons.doubt];
      case 'complete': return [
        ['今天为什么增加1点怀疑', '你今天进行了搜索，没有完成塔楼或击败恐怖巨兽，小屋也都完好，所以怀疑增加1。达到18就会失败。'],
        ['下一步怎样规划', '继续探索找材料和巢穴，建塔保护村庄，用装备和决心提高胜算，再挑战三只恐怖巨兽。留意时间与怀疑，休息也有代价。'],
      ];
      default: return [];
    }
  },
  render() {
    this.renderInvitation();
    const content = document.getElementById('modal-content');
    if (!content || !this.active || !document.getElementById('modal-overlay').classList.contains('active')) return;
    // Restore only restrictions owned by this controller before applying the new step.
    content.querySelectorAll('[data-tutorial-disabled]').forEach(el => { el.disabled = false; delete el.dataset.tutorialDisabled; });
    content.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target'));
    content.querySelector('#tutorial-note')?.remove();
    const [title, explanation] = this.guidance();
    const note = document.createElement('section');
    note.id = 'tutorial-note';
    note.className = 'mentor-note';
    note.setAttribute('aria-label', '长老的提示');
    const steps = { ready: 1, region: 1, search: 2, result: 2, encounter: 3, combat: 3, victory: 3, end: 4, day: 4, events: 4, complete: 5 };
    note.innerHTML = `<div class="mentor-caption">练习 · ${steps[this.stage]}/5 · 固定骰子</div><strong>${title}</strong><p role="status">${explanation}</p>`;
    const concepts = this.milestone();
    if (concepts.length) note.innerHTML += `<div class="mentor-context">${concepts.map(([heading, text]) => `<h3>${heading}</h3><p>${text}</p>`).join('')}</div>`;
    if (['end', 'events', 'complete'].includes(this.stage)) note.innerHTML += `<dl class="mentor-stats"><div><dt>时间</dt><dd>${GameState.currentDay}/14</dd></div><div><dt>怀疑</dt><dd>${GameState.doubt.current}/${GameState.doubt.max}</dd></div><div><dt>决心</dt><dd>${GameState.determination}</dd></div></dl>`;
    if (this.stage === 'search' && GameState.search.pendingRoll) {
      const index = GameState.search.pendingDieIndex;
      note.innerHTML += `<button class="btn ${this.selectedDie ? '' : 'primary'}" onclick="Tutorial.selectDie(${index})" ${this.selectedDie ? 'disabled' : ''}>点选骰子 ${GameState.search.pendingRoll[index]}</button>`;
    }
    if (this.stage !== 'complete') note.innerHTML += `<div class="mentor-actions">${this.checkpoint && ['search', 'combat'].includes(this.stage) ? '<button class="btn" onclick="Tutorial.retry()">重试这一步</button>' : ''}<button class="btn" onclick="Tutorial.exit()">退出练习，返回原局</button></div>`;
    const target = content.querySelector('#search-placement, #combat-dice');
    if (target) target.before(note); else content.prepend(note);
    content.querySelectorAll('button[onclick]').forEach(el => {
      if (el.closest('#tutorial-note') || el.disabled) return;
      if (!this.allowed(el.getAttribute('onclick'))) { el.disabled = true; el.dataset.tutorialDisabled = 'true'; }
      else el.classList.add('tutorial-target');
    });
    if (this.stage === 'search') {
      content.querySelectorAll('#search-placement button').forEach(el => {
        const match = el.getAttribute('onclick')?.match(/placeDie\('(top|bottom)',\s*(\d)/);
        if (match) {
          const label = `${match[1] === 'top' ? '上方' : '下方'} ${['百位', '十位', '个位'][Number(match[2])]}：${el.textContent}`;
          el.setAttribute('aria-label', label);
          el.setAttribute('data-i18n-aria-label', label);
        }
      });
      I18n.apply(document.getElementById('search-placement'));
    }
    content.querySelectorAll('details[open]').forEach(el => { el.open = false; });
    I18n.apply(note);
    this.schedulePointer();
  },
  currentTarget() {
    const content = document.getElementById('modal-content');
    return content.querySelector('#tutorial-note button.primary:not(:disabled)') || content.querySelector('.tutorial-target:not(:disabled)');
  },
  clearPointer() {
    cancelAnimationFrame(this.pointerFrame);
    this.pointerFrame = null;
    document.getElementById('tutorial-pointer')?.remove();
  },
  schedulePointer() {
    cancelAnimationFrame(this.pointerFrame);
    this.pointerFrame = requestAnimationFrame(() => this.positionPointer());
  },
  positionPointer() {
    this.pointerFrame = null;
    const target = this.active && this.currentTarget();
    const content = document.getElementById('modal-content');
    const overlay = document.getElementById('modal-overlay');
    if (!target || !overlay.classList.contains('active')) { this.clearPointer(); return; }
    const rect = target.getBoundingClientRect();
    const bounds = content.getBoundingClientRect();
    // Do not point at controls outside the currently visible scroll area.
    if (!rect.width || !rect.height || rect.bottom <= bounds.top || rect.top >= bounds.bottom) { this.clearPointer(); return; }
    let pointer = document.getElementById('tutorial-pointer');
    if (!pointer) {
      pointer = document.createElement('div');
      pointer.id = 'tutorial-pointer';
      pointer.setAttribute('aria-hidden', 'true');
      pointer.innerHTML = '<span class="tutorial-hand">👇</span>';
      document.body.appendChild(pointer);
    }
    const below = rect.top - 42 < Math.max(4, bounds.top);
    const x = Math.max(4, Math.min(window.innerWidth - 44, rect.left + rect.width / 2 - 20));
    const y = below ? Math.min(window.innerHeight - 44, rect.bottom - 3) : rect.top - 38;
    pointer.classList.toggle('points-up', below);
    pointer.querySelector('.tutorial-hand').textContent = below ? '👆' : '👇';
    pointer.style.transform = `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  },
  renderLog() {
    const log = document.getElementById('game-log');
    log.querySelectorAll('.log-entry').forEach(el => el.remove());
    for (const entry of GameState.log) {
      const el = document.createElement('div');
      el.className = 'log-entry';
      I18n.setText(el, `> ${entry.message}`);
      log.appendChild(el);
    }
  },
  focusCurrent() {
    if (!this.active) return;
    const content = document.getElementById('modal-content');
    const target = this.currentTarget() || content.querySelector('#tutorial-note button:not(:disabled)');
    target?.focus({ preventScroll: true });
  },
  complete() {
    if (!this.active || this.stage === 'complete') return;
    this.stage = 'complete';
    this.preferences.completed = true;
    this.persist();
    UI.showModal(`<div class="modal-title">第一次小冒险完成</div><div class="practice-summary"><p>石头 +1 · 污血 +1 · 追踪圈 +1</p><p>生命 10 → 9 · 天数 1 → 2 · 怀疑 0 → 1</p><p>事件已处理；练习收获不会带入正式游戏。</p></div><div class="confirm-actions"><button class="btn primary" onclick="Tutorial.exit(true)">开始正式新局</button><button class="btn" onclick="Tutorial.exit()">返回原局</button><button class="btn" onclick="Tutorial.replay()">再练习一次</button></div>`);
  },
  hint(key, force = false) {
    if (this.active || (!force && (!this.preferences.hints || this.preferences.seen.includes(key)))) return;
    const content = document.getElementById('modal-content');
    if (!content || !this.lessons[key]) return;
    content.querySelector('#mentor-hint')?.remove();
    const [title, text] = this.lessons[key];
    const el = document.createElement('section');
    el.id = 'mentor-hint';
    el.className = 'mentor-note';
    el.innerHTML = `<strong>${title}</strong><p>${text}</p><div class="mentor-actions"><button class="btn" onclick="document.getElementById('mentor-hint').remove()">知道了</button><button class="btn" onclick="Tutorial.toggleHints(false); document.getElementById('mentor-hint').remove()">关闭首次提示</button></div>`;
    content.querySelector('.modal-title')?.after(el);
    if (!this.preferences.seen.includes(key)) this.preferences.seen.push(key);
    this.persist();
    I18n.apply(el);
  },
  toggleHints(enabled) {
    this.preferences.hints = enabled;
    this.persist();
  },
  help() {
    const content = document.getElementById('modal-content');
    const el = document.createElement('section');
    el.className = 'mentor-note';
    el.innerHTML = `<strong>新手引导</strong><p>练习只在空闲时开始，不会覆盖正式存档。</p><div class="mentor-actions"><button class="btn primary" onclick="Tutorial.start()" ${GameState.phase !== 'idle' || GameState.pendingDayAction ? 'disabled' : ''}>重玩教学</button><button class="btn" onclick="Tutorial.toggleHints(!Tutorial.preferences.hints); Game.showHelp()">${this.preferences.hints ? '关闭首次提示' : '开启首次提示'}</button></div><details><summary>重看机制提示</summary><div class="mentor-actions">${Object.entries(this.lessons).map(([key, [title]]) => `<button class="btn" onclick="Tutorial.hint('${key}', true)">${title}</button>`).join('')}</div></details>`;
    content.querySelector('.modal-title')?.after(el);
    I18n.apply(el);
  },

  // Small adapters keep the original rules authoritative. All state transitions
  // follow successful game operations, not a generic "next" button.
  install() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.storageKey));
      if (saved?.version === 1) {
        this.preferences = { version: 1, welcomed: saved.welcomed === true, completed: saved.completed === true, hints: saved.hints !== false, seen: Array.isArray(saved.seen) ? saved.seen.filter(key => key in this.lessons) : [] };
      }
    } catch (_) { /* Missing, corrupt, or unavailable storage is harmless. */ }
    const wrap = (object, name, before, after) => {
      const original = object[name];
      object[name] = function (...args) {
        if (before && before(...args) === false) return;
        const result = original.apply(this, args);
        if (after) after(...args);
        Tutorial.render();
        if (['showModal', 'placeDie', 'renderPendingRollPlacement', 'renderPendingCombatRoll', 'modifyPendingDie', 'resolveCombatRoll'].includes(name)) Tutorial.focusCurrent();
        return result;
      };
    };
    wrap(UI, 'showModal');
    wrap(UI, 'render');
    wrap(UI, 'closeModal', () => !this.active || !['encounter', 'day'].includes(this.stage));
    wrap(Game, 'showSearchDialog', () => {
      if (!this.active) return;
      if (this.stage !== 'ready') return false;
      this.stage = 'region';
    });
    wrap(Game, 'startSearch', region => !this.active || (this.stage === 'region' && region === 'halebeard'));
    wrap(SearchUI, 'start', region => {
      if (!this.active) return;
      if (region !== 'halebeard' || !['region', 'search', 'result'].includes(this.stage)) return false;
      this.stage = 'search';
      this.selectedDie = false;
    }, () => { if (this.active) this.checkpoint = { state: this.capture(), stage: 'search' }; });
    wrap(SearchUI, 'rollDice', () => !this.active || (this.stage === 'search' && !GameState.search?.pendingRoll), () => { this.selectedDie = false; });
    wrap(SearchUI, 'placeDie', (row, col, index) => {
      if (!this.active) return;
      if (!this.allowed(`SearchUI.placeDie('${row}', ${col}, ${index})`)) return false;
      this.selectedDie = false;
    });
    wrap(SearchUI, 'renderPendingRollPlacement');
    wrap(SearchUI, 'showIntermediateResult', (_, total) => { if (this.active) this.stage = total === 21 ? 'result' : 'encounter'; });
    wrap(SearchUI, 'continueSearch', () => {
      if (!this.active) return;
      if (!this.allowed('SearchUI.continueSearch')) return false;
      this.encounterPending = true;
    });
    wrap(CombatUI, 'startCombat', () => { if (this.active) { this.stage = 'combat'; this.encounterPending = false; } }, () => { if (this.active) this.checkpoint = { state: this.capture(), stage: 'combat' }; });
    wrap(CombatUI, 'renderCombat');
    wrap(CombatUI, 'renderPendingCombatRoll');
    wrap(CombatUI, 'rollCombatDice', () => !this.active || this.allowed('CombatUI.rollCombatDice'));
    wrap(CombatUI, 'modifyPendingDie', (index, modifier) => !this.active || this.allowed(`CombatUI.modifyPendingDie(${index}, ${modifier})`));
    wrap(CombatUI, 'resolveCombatRoll', () => !this.active || this.allowed('CombatUI.resolveCombatRoll'), () => {
      if (this.active && GameState.combat?.roundCount === 1 && GameState.determination === 0) GameState.addDetermination(1);
    });
    wrap(CombatUI, 'victory', () => { if (!GameState.combat) return false; if (this.active) this.stage = 'victory'; });
    wrap(SearchUI, 'showPostCombatOptions', () => { if (this.active) this.stage = 'end'; });
    wrap(SearchUI, 'endSearchDay', () => { if (!this.active) return; if (this.stage !== 'end') return false; this.stage = 'day'; });
    wrap(Events, 'showEventResults', () => { if (this.active) this.stage = 'events'; });
    wrap(Game, 'finishDayAndCheck', null, () => { if (this.active && this.stage === 'events' && !GameState.pendingDayAction) this.complete(); });
    wrap(Game, 'showHelp', () => !this.active, () => this.help());
    const hints = [[Game, 'showBuildDialog', 'build'], [Game, 'showForgeDialog', 'forge'], [Game, 'showCraftDialog', 'craft'], [CraftUI, 'craft', 'craft'], [Game, 'confirmTerribleBeastHunt', 'beast'], [CombatUI, 'startCombat', 'beast'], [Events, 'showBeastAttackResult', 'attack'], [Events, 'processNextBeastAttack', 'attack']];
    for (const [object, name, key] of hints) {
      let previousContent;
      if (typeof object[name] === 'function') wrap(object, name, () => {
        previousContent = document.getElementById('modal-content').innerHTML;
      }, (...args) => {
        if (key === 'beast' && object === CombatUI && args[1] !== 'terrible') return;
        if (document.getElementById('modal-overlay').classList.contains('active') && document.getElementById('modal-content').innerHTML !== previousContent) this.hint(key);
      });
    }
    // Guard alternate controls and direct save calls throughout practice.
    for (const [object, names] of [[Game, ['newGame', 'saveGame', 'loadGame', 'showBuildDialog', 'showForgeDialog', 'showCraftDialog', 'showInventory', 'showDebug', 'confirmTerribleBeastHunt']], [GameState, ['save', 'load']], [SearchUI, ['modifyPendingDie', 'rerollPendingWithLuckCharm']], [CombatUI, ['useItem', 'flee', 'rerollPendingWithLuckCharm']]]) {
      for (const name of names) wrap(object, name, () => !this.active);
    }
    this.renderInvitation();
    document.getElementById('modal-content').addEventListener('scroll', () => this.schedulePointer(), { passive: true });
    document.getElementById('modal-content').addEventListener('transitionend', () => this.schedulePointer());
    window.addEventListener('resize', () => this.schedulePointer(), { passive: true });
    window.visualViewport?.addEventListener('resize', () => this.schedulePointer(), { passive: true });
    window.visualViewport?.addEventListener('scroll', () => this.schedulePointer(), { passive: true });
    document.addEventListener('keydown', event => {
      if (!this.active) return;
      if (event.key === 'Escape') { event.preventDefault(); this.exit(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...document.querySelectorAll('#modal-content button:not(:disabled), #modal-content summary')].filter(el => el.getClientRects().length);
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !document.getElementById('modal-content').contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !document.getElementById('modal-content').contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    });
  },
};

document.addEventListener('DOMContentLoaded', () => Tutorial.install());
