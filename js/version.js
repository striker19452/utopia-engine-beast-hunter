// ============================================
// Utopia Engine: Beast Hunter - Release metadata
// ============================================

const GAME_VERSION = Object.freeze({
  number: '2.0.0',
  saveSchema: 1,
  released: '2026-10-18',
});

const Version = {
  label() {
    return `v${GAME_VERSION.number}`;
  },

  render(root = document) {
    root.querySelectorAll('[data-game-version]').forEach(element => {
      element.textContent = this.label();
      element.title = `Utopia Engine: Beast Hunter ${this.label()}`;
    });
  },
};
