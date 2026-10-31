// The artisan's table reads the same recipes and inventory as every other entry.
const CraftUI = {
  selectedRecipe: null,
  key(recipe) { return recipe.name.toLowerCase().replace(/ /g, '_'); },
  recipe(key) { return GAME_DATA.craftingRecipes.find(recipe => this.key(recipe) === key); },
  allowed() {
    return GameState.phase !== 'combat' && !GameState.combat &&
      GameState.phase !== 'game_over' && !GameState.pendingDayAction;
  },
  canCraft(key) {
    const recipe = this.recipe(key);
    return Boolean(recipe && this.allowed() && GameState.craftedItems[key] === null &&
      Object.entries(recipe.requires).every(([material, amount]) => GameState.hasMaterial(material, amount)));
  },
  art(key) { return typeof LoadoutUI === 'undefined' ? '' : LoadoutUI.art({ key }); },
  status(key) {
    if (GameState.craftedItems[key] !== null) return '已持有';
    if (this.canCraft(key)) return GameState.craftedItemHistory[key] ? '可再造' : '可合成';
    return '材料不足';
  },
  open(key = this.selectedRecipe) {
    if (!GameState.canStartDayAction()) return;
    this.render(this.recipe(key) ? key : this.key(GAME_DATA.craftingRecipes[0]));
  },
  selectRecipe(key) {
    if (!this.recipe(key) || !this.allowed()) return;
    this.render(key);
    this.focusRecipe(key);
  },
  focusRecipe(key) {
    const button = document.querySelector(`[data-craft-recipe="${key}"]`);
    button?.focus({ preventScroll: true });
    const list = button?.parentElement;
    if (list && list.scrollWidth > list.clientWidth) {
      if (button.offsetLeft < list.scrollLeft) list.scrollLeft = button.offsetLeft;
      else if (button.offsetLeft + button.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollLeft = button.offsetLeft + button.offsetWidth - list.clientWidth;
      }
    }
  },
  materialSlot(material, amount) {
    const stock = GameState.materials[material] || 0;
    const common = ['stone', 'cord', 'tar'].includes(material);
    return `<div class="craft-ingredient ${stock < amount ? 'is-missing' : ''}" data-craft-material="${material}">
      <small>${common ? '普通材料' : '怪物材料'}</small>
      <strong>${GAME_DATA.materialNames[material]}</strong>
      <span class="craft-stock"><b>${stock}</b><span aria-hidden="true"> / </span>${amount}</span>
    </div>`;
  },
  render(key, completed = false) {
    const recipe = this.recipe(key);
    if (!recipe) return;
    this.selectedRecipe = key;
    const owned = GameState.craftedItems[key] !== null;
    const repeat = Boolean(GameState.craftedItemHistory[key]);
    const materials = Object.entries(recipe.requires).sort(([a], [b]) =>
      Number(['stone', 'cord', 'tar'].includes(b)) - Number(['stone', 'cord', 'tar'].includes(a)));
    const choices = GAME_DATA.craftingRecipes.map(item => {
      const itemKey = this.key(item);
      return `<button class="craft-recipe ${itemKey === key ? 'is-selected' : ''}" type="button"
        data-craft-recipe="${itemKey}" aria-pressed="${itemKey === key}"
        onclick="CraftUI.selectRecipe('${itemKey}')">${this.art(itemKey)}
        <span><strong>${item.nameZh}</strong><small>${this.status(itemKey)}</small></span></button>`;
    }).join('');
    UI.showModal(`
      <div class="modal-title">工匠合成台</div>
      <div class="craft-panel">
        <nav class="craft-recipes" aria-label="合成配方">${choices}</nav>
        <section class="craft-main" aria-labelledby="craft-recipe-name">
          <header class="craft-summary" aria-live="polite">
            <div><h2 id="craft-recipe-name">${recipe.nameZh}</h2>
              <span class="craft-result-status ${completed ? 'is-success' : ''}">${completed ? '✓ 合成成功！' : owned ? '已持有' : repeat ? '已用，可再造' : '合成配方'}</span></div>
            <p>${recipe.effect}</p><span class="craft-count-guide">库存 / 所需</span>
          </header>
          <div class="craft-workbench" data-craft-stage="${completed ? 'complete' : 'recipe'}">
            <picture class="craft-workbench-art"><source media="(max-width: 560px)" srcset="assets/atlas/craft-workbench-mobile.webp">
              <img src="assets/atlas/craft-workbench.webp" alt="" decoding="async"></picture>
            <div class="craft-workspace">
              <div class="craft-formula" role="group" aria-label="合成材料与成品">
                ${this.materialSlot(...materials[0])}<span class="craft-operator" aria-hidden="true">＋</span>
                ${this.materialSlot(...materials[1])}<span class="craft-arrow" aria-hidden="true"><span>→</span></span>
                <div class="craft-product ${owned ? 'is-owned' : ''}">${this.art(key)}<span>${owned ? '已持有' : '成品'}</span></div>
              </div>
              <button type="button" class="btn primary craft-stamp" data-craft-action="${key}"
                ${this.canCraft(key) ? '' : 'disabled'} onclick="CraftUI.craft('${key}')">${owned ? '已持有' : this.canCraft(key) ? repeat ? '再造' : '合成' : '材料不足'}</button>
            </div>
          </div>
        </section>
      </div>
      <div class="confirm-actions"><span class="craft-day-note">合成不消耗一天</span><button class="btn" onclick="UI.closeModal()">${completed ? '确定' : '取消'}</button></div>
    `);
    if (completed) this.focusRecipe(key);
  },
  craft(itemKey) {
    // Preflight every ingredient before removing any: a stale button is harmless.
    if (!this.canCraft(itemKey)) return;
    const recipe = this.recipe(itemKey);
    for (const [material, amount] of Object.entries(recipe.requires)) GameState.removeMaterial(material, amount);
    GameState.craftedItems[itemKey] = itemKey === 'crab_plate' ? 2 : itemKey === 'heavy_coat' ? true : 1;
    GameState.craftedItemHistory[itemKey] = true;
    GameLog.add(itemKey === 'crab_plate' ? '合成了蟹甲并自动装备！' : `合成了 ${recipe.nameZh}！`);
    UI.render();
    this.render(itemKey, true);
  },
};
