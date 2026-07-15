// ============================================
// Utopia Engine: Beast Hunter - Craft UI
// ============================================

const CraftUI = {
  craft(itemKey) {
    const recipe = GAME_DATA.craftingRecipes.find(r => r.name.toLowerCase().replace(/ /g, '_') === itemKey);
    if (!recipe) return;

    // You can rebuild spent/destroyed crafted items, but never hold two copies.
    if (GameState.craftedItems[itemKey] !== null) return;

    // Check and consume materials
    for (const [mat, amt] of Object.entries(recipe.requires)) {
      if (!GameState.removeMaterial(mat, amt)) {
        GameLog.add(`材料不足，无法合成 ${recipe.nameZh}。`);
        return;
      }
    }

    // Set crafted item
    switch (itemKey) {
      case 'crab_plate':
        GameState.craftedItems[itemKey] = 2; // 2 uses
        break;
      case 'heavy_coat':
        GameState.craftedItems[itemKey] = true; // unlimited
        break;
      default:
        GameState.craftedItems[itemKey] = 1; // single use
        break;
    }
    GameState.craftedItemHistory[itemKey] = true;

    GameLog.add(`合成了 ${recipe.nameZh}！`);
    UI.render();

    UI.showModal(`
      <div class="modal-title">✓ 合成成功！</div>
      <div style="text-align:center; margin:16px 0;">
        <div style="font-size:18px; font-weight:bold; color:var(--green);">${recipe.nameZh}</div>
        <div style="margin-top:8px; font-size:13px; color:var(--ink-medium);">${recipe.effect}</div>
      </div>
      <div class="confirm-actions"><button class="btn primary" onclick="UI.closeModal()">确定</button></div>
    `);
  },
};
