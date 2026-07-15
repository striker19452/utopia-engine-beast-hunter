// ============================================
// Utopia Engine: Beast Hunter - Game State
// ============================================

const GameState = {
  searchBoxCount: 6,

  // === Player Stats ===
  hp: { current: 10, max: 10 },
  hpOneDeterminationAwarded: false,
  determination: 0,
  doubt: { current: 0, max: 18 },

  // === Time ===
  currentDay: 1, // 1-14, day 14 is the last day
  daysCrossed: [], // array of crossed-out day numbers
  pendingDayAction: null,

  // === Huts ===
  huts: Array(GAME_DATA.hutCount || 9).fill(true), // true = intact

  // === Regions Search Progress ===
  // Search box: 2 rows of 3 squares each
  // Top row: [hundreds, tens, ones] = top 3-digit number
  // Bottom row: [hundreds, tens, ones] = bottom 3-digit number
  // Result = top - bottom
  regions: {
    halebeard: {
      lairFound: false,
      tracking: [false, false, false], // 3 tracking circles
      searchBoxes: [
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
      ],
    },
    coastal: {
      lairFound: false,
      tracking: [false, false, false],
      searchBoxes: [
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
      ],
    },
    scar: {
      lairFound: false,
      tracking: [false, false, false],
      searchBoxes: [
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
        { top: [null, null, null], bottom: [null, null, null], complete: false },
      ],
    },
  },

  // === Towers ===
  towers: {
    south: { grid: Array(28).fill(null), complete: false, hawkTotem: false, destroyed: false },
    west:  { grid: Array(27).fill(null), complete: false, hawkTotem: false, destroyed: false },
    east:  { grid: Array(40).fill(null), complete: false, hawkTotem: false, destroyed: false },
  },

  // === Materials Inventory ===
  materials: {
    stone: 0, cord: 0, tar: 0,
    silver: 0, lodestone: 0, pyrite: 0,
    foul_blood: 0, beast_pelt: 0, oily_meat: 0,
    dragon_smoke: 0, sacred_feathers: 0, nightmare_chitin: 0, troll_ash: 0,
  },

  // === Toolbelt Items (used = true) ===
  toolbelt: {
    luck_charm: false,
    balance_blade: false,
    optic_disruptor: false,
  },

  // === Crafted Items (null = not crafted, number = uses remaining) ===
  craftedItems: {
    blood_lure: null,
    potent_bait: null,
    heavy_coat: null,
    firebox: null,
    crab_plate: null,
    reviving_dose: null,
    hawk_totem: null,
  },

  craftedItemHistory: {
    blood_lure: false,
    potent_bait: false,
    heavy_coat: false,
    firebox: false,
    crab_plate: false,
    reviving_dose: false,
    hawk_totem: false,
  },

  // === Equipment (null = not forged, 'standard' | 'mastercraft') ===
  equipment: {
    silver_plate: null,
    dowsing_rod: null,
    disintegrator_lance: null,
  },

  // === Elders Approval ===
  elders: {
    epiphoros: false,
    sipporos: false,
    nikandros: false,
  },

  // === Terrible Beasts Defeated ===
  beastsDefeated: {
    halebeard: false,
    coastal: false,
    scar: false,
  },

  // === Terrible Beast Nature (determined once, persists) ===
  beastNature: {
    halebeard: null, // 'Cowed', 'Cruel', or 'Cunning'
    coastal: null,
    scar: null,
  },

  // === Persistent Terrible Beast Wounds ===
  beastWounds: {
    halebeard: 0,
    coastal: 0,
    scar: 0,
  },

  commonBeastWounds: {},

  // === Current Events (active effects for this event cycle) ===
  activeEvents: {
    halebeard: [],
    coastal: [],
    scar: [],
  },

  // === Combat State ===
  combat: null,
  // { region, beastType: 'common'|'terrible', beast, beastHp, playerBonusAtk, beastBonusAtk, log: [] }

  // === Forge State ===
  forge: null,
  // { equipment, grid: [null x9], rollCount: 0 }

  // === Search State ===
  search: null,
  // { region, boxIndex, rollCount, rolls: [] }

  // === Build State ===
  build: null,
  // { tower, materialSpent, rollCount }

  // === Game Phase ===
  phase: 'idle', // idle | searching | building | forging | combat | event | game_over

  // === Action Log ===
  log: [],

  // === Scoring ===
  score: null,

  // ==========================================
  // Methods
  // ==========================================

  reset() {
    this.hp = { current: 10, max: 10 };
    this.hpOneDeterminationAwarded = false;
    this.determination = 0;
    this.doubt = { current: 0, max: 18 };
    this.currentDay = 1;
    this.daysCrossed = [];
    this.pendingDayAction = null;
    this.huts = Array(GAME_DATA.hutCount || 9).fill(true);

    for (const key of Object.keys(this.regions)) {
      this.regions[key].lairFound = false;
      this.regions[key].tracking = [false, false, false];
      this.regions[key].searchBoxes = Array.from({ length: this.searchBoxCount }, () => ({
        top: [null, null, null],
        bottom: [null, null, null],
        complete: false,
      }));
    }

    for (const key of Object.keys(this.towers)) {
      this.towers[key] = { grid: this.createTowerGrid(key), complete: false, hawkTotem: false, destroyed: false };
    }

    for (const key of Object.keys(this.materials)) {
      this.materials[key] = 0;
    }

    this.toolbelt = { luck_charm: false, balance_blade: false, optic_disruptor: false };
    this.craftedItems = {
      blood_lure: null, potent_bait: null, heavy_coat: null,
      firebox: null, crab_plate: null, reviving_dose: null, hawk_totem: null,
    };
    this.craftedItemHistory = {
      blood_lure: false, potent_bait: false, heavy_coat: false,
      firebox: false, crab_plate: false, reviving_dose: false, hawk_totem: false,
    };
    this.equipment = { silver_plate: null, dowsing_rod: null, disintegrator_lance: null };
    this.elders = { epiphoros: false, sipporos: false, nikandros: false };
    this.beastsDefeated = { halebeard: false, coastal: false, scar: false };
    this.beastNature = { halebeard: null, coastal: null, scar: null };
    this.beastWounds = { halebeard: 0, coastal: 0, scar: 0 };
    this.commonBeastWounds = {};
    this.activeEvents = { halebeard: [], coastal: [], scar: [] };
    this.combat = null;
    this.forge = null;
    this.search = null;
    this.build = null;
    this.phase = 'idle';
    this.log = [];
    this.score = null;
  },

  createTowerGrid(towerKey) {
    const shape = GAME_DATA.towerShapes[towerKey];
    const rows = shape || ['11111', '11111', '11111', '11111', '11111'];
    return Array(rows.length * rows[0].length).fill(null);
  },

  syncStatusDisplay() {
    if (typeof UI === 'undefined' || !document.getElementById('game-interface')) return;
    UI.renderTopBar();
  },

  // === HP ===
  takeDamage(amount) {
    const actual = Math.min(amount, this.hp.current);
    this.hp.current -= actual;
    this.revivingDoseUsed = false;

    // Check for Reviving Dose
    if (this.hp.current <= 0 && this.craftedItems.reviving_dose) {
      this.craftedItems.reviving_dose = null; // Consume the item
      this.hp.current = 3; // Recover 3 HP
      this.revivingDoseUsed = true;
      this.syncStatusDisplay();
      return actual; // Return damage dealt, but player survives
    }

    if (this.hp.current <= 0) {
      this.phase = 'game_over';
    } else if (this.hp.current === 1 && !this.hpOneDeterminationAwarded) {
      this.addDetermination(1);
      this.hpOneDeterminationAwarded = true;
    }
    this.syncStatusDisplay();
    return actual;
  },

  heal(amount) {
    const actual = Math.min(amount, this.hp.max - this.hp.current);
    this.hp.current += actual;
    this.syncStatusDisplay();
    return actual;
  },

  // === Grievous Damage (permanent HP reduction) ===
  takeGrievousDamage(amount) {
    this.hp.max -= amount;
    this.hp.current = Math.min(this.hp.current, this.hp.max);
    if (this.hp.max <= 0) {
      this.hp.max = 0;
      this.hp.current = 0;
      this.phase = 'game_over';
    }
    this.syncStatusDisplay();
  },

  // === Determination ===
  addDetermination(amount) {
    this.determination += amount;
    this.syncStatusDisplay();
  },

  spendDetermination(amount) {
    if (this.determination >= amount) {
      this.determination -= amount;
      this.syncStatusDisplay();
      return true;
    }
    return false;
  },

  // === Doubt ===
  addDoubt(amount) {
    this.doubt.current += amount;
    if (this.doubt.current >= this.doubt.max) {
      this.doubt.current = this.doubt.max;
      this.phase = 'game_over';
    }
    this.syncStatusDisplay();
  },

  // === Time ===
  // action: 'search' | 'rest' | 'build' | 'forge' | 'kill_beast' | 'default'
  advanceDay(action = 'default') {
    this.daysCrossed.push(this.currentDay);
    const dayData = GAME_DATA.timeTrack[this.currentDay - 1];

    this.pendingDayAction = action;

    // Move to next day
    this.currentDay++;

    if (this.currentDay > 14) {
      this.phase = 'game_over';
    }

    this.syncStatusDisplay();
    return dayData;
  },

  calculateEndOfDayDoubt(action) {
    const destroyedHuts = this.huts.filter(h => !h).length;

    switch (action) {
      case 'rest':
        // Resting: +1 doubt (not affected by destroyed huts)
        this.addDoubt(1);
        break;
      case 'build':
      case 'kill_beast':
        // Completed tower or defeated Terrible Beast: 0 doubt
        break;
      case 'search':
      case 'forge':
      case 'default':
      default:
        // Default: +1 + number of destroyed huts
        this.addDoubt(1 + destroyedHuts);
        break;
    }
  },

  // === Huts ===
  destroyHut(index) {
    if (this.huts[index]) {
      this.huts[index] = false;
      // +2 doubt per destroyed hut (including this one)
      const destroyedHuts = this.huts.filter(h => !h).length;
      this.addDoubt(destroyedHuts * 2);
      return true;
    }
    return false;
  },

  // === Materials ===
  addMaterial(type, amount = 1) {
    if (type in this.materials) {
      const limit = GAME_DATA.materialLimit || 4;
      const before = this.materials[type];
      this.materials[type] = Math.min(limit, before + amount);
      return this.materials[type] - before;
    }
    return 0;
  },

  removeMaterial(type, amount = 1) {
    if (this.materials[type] >= amount) {
      this.materials[type] -= amount;
      return true;
    }
    return false;
  },

  hasMaterial(type, amount = 1) {
    return this.materials[type] >= amount;
  },

  // === Search ===
  getSearchLimit(region) {
    if (this.activeEvents[region].includes('Foul Weather') && !this.craftedItems.heavy_coat) {
      return 2;
    }
    return 3;
  },

  getAvailableSearchBoxes(region, limit = this.getSearchLimit(region)) {
    const boxes = [];
    for (let i = 0; i < this.regions[region].searchBoxes.length; i++) {
      if (!this.regions[region].searchBoxes[i].complete) boxes.push(i);
      if (boxes.length >= limit) break;
    }
    return boxes;
  },

  startSearch(region) {
    if (this.phase !== 'idle') return false;

    // Find first incomplete search box
    const regionData = this.regions[region];
    const boxIndex = regionData.searchBoxes.findIndex(b => !b.complete);
    if (boxIndex === -1) return false; // all boxes full

    // Determine max searches per day (3 normally, 2 under Foul Weather)
    const maxSearches = this.getSearchLimit(region);

    // Find empty boxes for today's search
    const emptyBoxes = this.getAvailableSearchBoxes(region, maxSearches);

    this.search = {
      originRegion: region,
      region,
      boxIndex: emptyBoxes[0],
      rollCount: 0,
      rolls: [],
      emptyBoxes,
      boxesCompleted: 0,
      maxSearches,
      quickSearchUsed: false,
    };
    this.phase = 'searching';
    return true;
  },

  // === Combat ===
  startCombat(region, beastType, beast) {
    const beastHp = beast.hp || 1;
    this.combat = {
      region,
      beastType,
      beast,
      beastHp,
      maxHp: beastHp,
      playerBonusAtk: 0,
      beastBonusAtk: 0,
      log: [],
      nature: null,
      ambush: false,
    };
    this.phase = 'combat';
  },

  // === Build ===
  startBuild(tower, material) {
    if (!this.removeMaterial(material)) return false;
    if (this.towers[tower]) {
      this.towers[tower].destroyed = false;
    }
    this.build = { tower, materialSpent: material, rollCount: 0 };
    this.phase = 'building';
    return true;
  },

  // === Elder Approval ===
  approveElder(elderKey) {
    if (!this.elders[elderKey]) {
      this.elders[elderKey] = true;
      const elder = GAME_DATA.elders.find(e => e.name.toLowerCase() === elderKey);
      if (elder) {
        switch (elder.rewardType) {
          case 'heal': this.heal(elder.rewardValue); break;
          case 'determination': this.addDetermination(elder.rewardValue); break;
          case 'recharge': /* handled by UI */ break;
        }
      }
      return true;
    }
    return false;
  },

  // === Check Win Condition ===
  checkWinCondition() {
    return this.beastsDefeated.halebeard &&
           this.beastsDefeated.coastal &&
           this.beastsDefeated.scar;
  },

  // === Calculate Score ===
  calculateScore() {
    const score = typeof Scoring !== 'undefined'
      ? Scoring.getTotal()
      : 0;
    this.score = score;
    return score;
  },

  // === Save / Load ===
  save(slot = 0) {
    const data = {
      meta: {
        appVersion: GAME_VERSION.number,
        saveSchema: GAME_VERSION.saveSchema,
        savedAt: new Date().toISOString(),
      },
      hp: { ...this.hp },
      hpOneDeterminationAwarded: this.hpOneDeterminationAwarded,
      determination: this.determination,
      doubt: { ...this.doubt },
      currentDay: this.currentDay,
      daysCrossed: [...this.daysCrossed],
      pendingDayAction: this.pendingDayAction,
      huts: [...this.huts],
      regions: JSON.parse(JSON.stringify(this.regions)),
      towers: JSON.parse(JSON.stringify(this.towers)),
      materials: { ...this.materials },
      toolbelt: { ...this.toolbelt },
      craftedItems: { ...this.craftedItems },
      craftedItemHistory: { ...this.craftedItemHistory },
      equipment: { ...this.equipment },
      elders: { ...this.elders },
      beastsDefeated: { ...this.beastsDefeated },
      beastNature: { ...this.beastNature },
      beastWounds: { ...this.beastWounds },
      commonBeastWounds: { ...this.commonBeastWounds },
      activeEvents: JSON.parse(JSON.stringify(this.activeEvents)),
      phase: 'idle',
      log: [...this.log],
    };
    localStorage.setItem(`uebh_save_${slot}`, JSON.stringify(data));
  },

  load(slot = 0) {
    const raw = localStorage.getItem(`uebh_save_${slot}`);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if ((data.meta?.saveSchema || 0) > GAME_VERSION.saveSchema) return false;
    Object.assign(this, data);
    this.hpOneDeterminationAwarded = Boolean(data.hpOneDeterminationAwarded);
    this.beastWounds = {
      halebeard: data.beastWounds?.halebeard || 0,
      coastal: data.beastWounds?.coastal || 0,
      scar: data.beastWounds?.scar || 0,
    };
    this.commonBeastWounds = data.commonBeastWounds || {};
    this.craftedItemHistory = {
      blood_lure: Boolean(data.craftedItemHistory?.blood_lure || data.craftedItems?.blood_lure !== null),
      potent_bait: Boolean(data.craftedItemHistory?.potent_bait || data.craftedItems?.potent_bait !== null),
      heavy_coat: Boolean(data.craftedItemHistory?.heavy_coat || data.craftedItems?.heavy_coat !== null),
      firebox: Boolean(data.craftedItemHistory?.firebox || data.craftedItems?.firebox !== null),
      crab_plate: Boolean(data.craftedItemHistory?.crab_plate || data.craftedItems?.crab_plate !== null),
      reviving_dose: Boolean(data.craftedItemHistory?.reviving_dose || data.craftedItems?.reviving_dose !== null),
      hawk_totem: Boolean(data.craftedItemHistory?.hawk_totem || data.craftedItems?.hawk_totem !== null),
    };
    const hutCount = GAME_DATA.hutCount || 9;
    this.huts = Array.from({ length: hutCount }, (_, i) => data.huts?.[i] ?? true);
    for (const key of Object.keys(this.towers)) {
      this.towers[key].destroyed = Boolean(this.towers[key].destroyed);
    }
    this.combat = null;
    this.forge = null;
    this.search = null;
    this.build = null;
    this.pendingDayAction = data.pendingDayAction || null;
    return true;
  },

  hasSave(slot = 0) {
    return localStorage.getItem(`uebh_save_${slot}`) !== null;
  },

  deleteSave(slot = 0) {
    localStorage.removeItem(`uebh_save_${slot}`);
  },
};
