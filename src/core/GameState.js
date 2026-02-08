// GameState - manages currencies, souls, progression
import { Soul } from './Soul.js';
import { MapGenerator } from './MapGenerator.js';
import { SoulMemory } from './SoulMemory.js';

export class GameState {
  constructor(config) {
    this.config = config;
    
    // Currencies
    this.darkEnergy = 5;
    this.coins = 5;
    
    // Souls
    this.souls = [];
    this.nextSoulId = 1;
    
    // Progression
    this.mapSeed = null;
    this.mapNodes = [];
    this.currentNodeId = null;
    this.visitedNodes = [];
    this.completedNodes = [];
    
    // Current node state
    this.maskShopOffering = null;
    this.soldMasks = { common: [], rare: [], legendary: [] }; // Track sold masks by rarity/index
    this.currentShrine = null;
    this.mysteryRevealed = null;
  }

  initStartingState() {
    // No longer used - start with empty roster
  }

  summonSoul() {
    const cost = this.config.soulConfig.summon_cost;
    if (this.darkEnergy < cost) {
      return { success: false, error: 'Not enough dark energy' };
    }

    const soulType = this.config.rollSoulType();
    
    // Roll for resurrection (1/10 chance)
    const resurrected = SoulMemory.rollResurrection(soulType.id);
    
    const soul = new Soul(
      this.nextSoulId++,
      soulType,
      this.config,
      resurrected // Pass resurrected data if found
    );

    this.souls.push(soul);
    this.darkEnergy -= cost;

    return { success: true, soul, resurrected: !!resurrected };
  }

  craftMask(rarity) {
    const cost = this.config.maskConfig.costs[rarity];
    if (!cost) {
      return { success: false, error: 'Invalid rarity' };
    }

    if (this.coins < cost) {
      return { success: false, error: 'Not enough coins' };
    }

    const mask = this.config.rollMask(rarity);
    this.coins -= cost;

    return { success: true, mask };
  }

  buyMaskFromShop(rarity, index) {
    if (!this.maskShopOffering) {
      return { success: false, error: 'No shop available' };
    }

    const masks = this.maskShopOffering[rarity];
    if (!masks || index >= masks.length) {
      return { success: false, error: 'Mask not found' };
    }

    // Check if already sold
    if (this.soldMasks[rarity].includes(index)) {
      return { success: false, error: 'Already sold out' };
    }

    const cost = this.config.maskConfig.costs[rarity];
    if (this.coins < cost) {
      return { success: false, error: 'Not enough coins' };
    }

    const mask = masks[index];
    this.coins -= cost;

    // Mark as sold
    this.soldMasks[rarity].push(index);

    return { success: true, mask };
  }

  equipMaskToSoul(soulId, mask) {
    const soul = this.souls.find(m => m.id === soulId);
    if (!soul) {
      return { success: false, error: 'Soul not found' };
    }

    soul.equipMask(mask);

    return { success: true };
  }

  startRun(seed = null) {
    // Generate new seed if not provided
    this.mapSeed = seed || Math.floor(Math.random() * 1000000);
    
    const generator = new MapGenerator(this.mapSeed, this.config.enemyConfig);
    this.mapNodes = generator.generateMap(20); // 20 layers
    generator.visualizeMap(this.mapNodes);
    
    this.currentNodeId = 0; // Start at first node
    this.visitedNodes = [0];
    this.completedNodes = [];
    
    console.log(`🎲 Started run with seed: ${this.mapSeed}`);
    return { success: true, seed: this.mapSeed };
  }

  getCurrentNode() {
    if (this.currentNodeId === null || !this.mapNodes.length) {
      return null;
    }
    return this.mapNodes.find(n => n.id === this.currentNodeId);
  }

  getAvailableNextNodes() {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return [];
    
    return currentNode.connections.map(nodeId => 
      this.mapNodes.find(n => n.id === nodeId)
    ).filter(n => n !== undefined);
  }

  moveToNode(nodeId) {
    this.currentNodeId = nodeId;
    this.visitedNodes.push(nodeId);
    
    const node = this.getCurrentNode();
    
    // Initialize node-specific state
    if (node.type === 'mask_shop') {
      this.maskShopOffering = this.config.generateMaskShopOffering();
      this.soldMasks = { common: [], rare: [], legendary: [] }; // Reset sold masks for new shop
    } else if (node.type === 'shrine') {
      this.currentShrine = this.config.getRandomShrine();
    } else if (node.type === 'mystery') {
      // Reveal mystery as one of the other types
      const types = ['battle', 'void', 'mask_shop', 'shrine'];
      const revealedType = types[Math.floor(Math.random() * types.length)];
      this.mysteryRevealed = revealedType;
      
      if (revealedType === 'mask_shop') {
        this.maskShopOffering = this.config.generateMaskShopOffering();
        this.soldMasks = { common: [], rare: [], legendary: [] }; // Reset sold masks for new shop
      } else if (revealedType === 'shrine') {
        this.currentShrine = this.config.getRandomShrine();
      } else if (revealedType === 'battle') {
        // Mystery battles use tier 1-2 enemies from any faction
        const tier1and2Enemies = this.config.enemyConfig.enemies.filter(e => e.tier === 1 || e.tier === 2);
        if (tier1and2Enemies.length > 0) {
          const randomEnemy = tier1and2Enemies[Math.floor(Math.random() * tier1and2Enemies.length)];
          node.enemy = randomEnemy.id;
        }
      }
    }
    
    return { success: true, node };
  }

  completeCurrentNode() {
    if (this.currentNodeId !== null) {
      this.completedNodes.push(this.currentNodeId);
    }
  }

  isCurrentNodeComplete() {
    return this.completedNodes.includes(this.currentNodeId);
  }

  isRunComplete() {
    const node = this.getCurrentNode();
    return node && node.connections.length === 0;
  }

  awardVictory(enemy) {
    this.darkEnergy += enemy.dark_energy_reward || 3;
    this.coins += enemy.coin_reward;
  }

  hasLost() {
    // Lost if no souls alive and can't afford to summon
    const hasAliveSouls = this.souls.some(m => !m.isDead());
    const canSummon = this.darkEnergy >= this.config.soulConfig.summon_cost;
    return !hasAliveSouls && !canSummon;
  }

  reset() {
    this.darkEnergy = 5;
    this.coins = 5;
    this.souls = [];
    this.nextSoulId = 1;
    this.mapSeed = null;
    this.mapNodes = [];
    this.currentNodeId = null;
    this.visitedNodes = [];
    this.completedNodes = [];
    this.maskShopOffering = null;
    this.currentShrine = null;
    this.mysteryRevealed = null;
  }
}
