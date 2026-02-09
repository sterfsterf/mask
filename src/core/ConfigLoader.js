// Config loader - reads and validates all JSON configs
export class ConfigLoader {
  constructor() {
    this.cards = null;
    this.soulTypes = null;
    this.masks = null;
    this.enemies = null;
  }

  async loadAll() {
    const base = import.meta.env.BASE_URL || './';
    const [cards, soulTypes, masks, enemies, shrines, marks] = await Promise.all([
      fetch(`${base}config/cards.json`).then(r => r.json()),
      fetch(`${base}config/soul_types.json`).then(r => r.json()),
      fetch(`${base}config/masks.json`).then(r => r.json()),
      fetch(`${base}config/enemies.json`).then(r => r.json()),
      fetch(`${base}config/shrines.json`).then(r => r.json()),
      fetch(`${base}config/marks.json`).then(r => r.json())
    ]);

    // Store raw configs for access
    this.config = {
      cards,
      soulTypes,
      masks,
      enemies,
      shrines,
      marks
    };

    this.cards = this.indexById(cards.cards);
    this.soulTypes = this.indexById(soulTypes.types);
    this.soulConfig = soulTypes;
    this.maskConfig = masks;
    this.enemyConfig = enemies;
    
    console.log('Enemy config structure:', Object.keys(enemies));
    console.log('Enemies array:', enemies.enemies);
    
    this.enemies = this.indexById(enemies.enemies);
    console.log('Indexed enemies:', Object.keys(this.enemies).length);
    
    this.shrineTypes = this.indexById(shrines.shrine_types);
    this.marks = this.indexById(marks.marks);

    console.log('✓ All configs loaded');
    return this;
  }

  indexById(array) {
    return array.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
  }

  getCard(id) {
    return this.cards[id];
  }

  getSoulType(id) {
    return this.soulTypes[id];
  }

  getEnemy(id) {
    return this.enemies[id];
  }

  getMask(id) {
    return this.maskConfig.masks.find(m => m.id === id);
  }

  getMark(id) {
    return this.marks[id];
  }

  rollSoulType() {
    const table = this.soulConfig.rarity_table;
    const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * totalWeight;
    
    let selectedRarity = 'common';
    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) {
        selectedRarity = entry.rarity;
        break;
      }
    }

    // Find soul types with this rarity
    const candidates = Object.values(this.soulTypes).filter(
      t => t.rarity === selectedRarity
    );
    
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  rollMask(rarity) {
    const masks = this.maskConfig.masks.filter(m => m.rarity === rarity);
    if (masks.length === 0) return null;
    
    return { ...masks[Math.floor(Math.random() * masks.length)] };
  }

  getRandomShrine() {
    const shrines = Object.values(this.shrineTypes);
    return shrines[Math.floor(Math.random() * shrines.length)];
  }

  generateMaskShopOffering() {
    const offering = {
      common: [],
      rare: [],
      legendary: []
    };

    // Create shuffled copies to avoid duplicates
    const commonMasks = [...this.maskConfig.masks.filter(m => m.rarity === 'common')]
      .sort(() => Math.random() - 0.5);
    const rareMasks = [...this.maskConfig.masks.filter(m => m.rarity === 'rare')]
      .sort(() => Math.random() - 0.5);
    const legendaryMasks = [...this.maskConfig.masks.filter(m => m.rarity === 'legendary')]
      .sort(() => Math.random() - 0.5);

    // Pick 2 unique common masks
    for (let i = 0; i < Math.min(2, commonMasks.length); i++) {
      offering.common.push({ ...commonMasks[i] });
    }

    // 1 rare OR legendary mask (50/50 chance)
    if (Math.random() < 0.5 && rareMasks.length > 0) {
      offering.rare.push({ ...rareMasks[0] });
    } else if (legendaryMasks.length > 0) {
      offering.legendary.push({ ...legendaryMasks[0] });
    }

    return offering;
  }
}
