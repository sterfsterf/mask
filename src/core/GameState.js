// GameState - manages currencies, minions, progression
import { Minion } from './Minion.js';

export class GameState {
  constructor(config) {
    this.config = config;
    
    // Currencies
    this.darkEnergy = 5;
    this.coins = 5;
    
    // Minions
    this.minions = [];
    this.nextMinionId = 1;
    
    // Progression
    this.currentTrack = null;
    this.currentNodeId = null;
    this.visitedNodes = [];
    this.completedNodes = [];
    
    // Current node state
    this.maskShopOffering = null;
    this.currentShrine = null;
    this.mysteryRevealed = null;
  }

  initStartingState() {
    // No longer used - start with empty roster
  }

  summonMinion() {
    const cost = this.config.minionConfig.summon_cost;
    if (this.darkEnergy < cost) {
      return { success: false, error: 'Not enough dark energy' };
    }

    const minionType = this.config.rollMinionType();
    const minion = new Minion(
      this.nextMinionId++,
      minionType,
      this.config
    );

    this.minions.push(minion);
    this.darkEnergy -= cost;

    return { success: true, minion };
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

    const cost = this.config.maskConfig.costs[rarity];
    if (this.coins < cost) {
      return { success: false, error: 'Not enough coins' };
    }

    const mask = masks[index];
    this.coins -= cost;

    return { success: true, mask };
  }

  equipMaskToMinion(minionId, mask) {
    const minion = this.minions.find(m => m.id === minionId);
    if (!minion) {
      return { success: false, error: 'Minion not found' };
    }

    minion.equipMask(mask);

    return { success: true };
  }

  startTrack(trackId) {
    const track = this.config.getTrack(trackId);
    if (!track) {
      return { success: false, error: 'Track not found' };
    }

    this.currentTrack = track;
    this.currentNodeId = track.start_node;
    this.visitedNodes = [this.currentNodeId];

    return { success: true, track };
  }

  getCurrentNode() {
    if (!this.currentTrack || this.currentNodeId === null) {
      return null;
    }
    return this.config.getNode(this.currentNodeId);
  }

  getAvailableNextNodes() {
    const currentNode = this.getCurrentNode();
    if (!currentNode) return [];
    
    return currentNode.connections.map(nodeId => this.config.getNode(nodeId));
  }

  moveToNode(nodeId) {
    this.currentNodeId = nodeId;
    this.visitedNodes.push(nodeId);
    
    const node = this.getCurrentNode();
    
    // Initialize node-specific state
    if (node.type === 'mask_shop') {
      this.maskShopOffering = this.config.generateMaskShopOffering();
    } else if (node.type === 'shrine') {
      this.currentShrine = this.config.getRandomShrine();
    } else if (node.type === 'mystery') {
      // Reveal mystery as one of the other types
      const types = ['battle', 'void', 'mask_shop', 'shrine'];
      const revealedType = types[Math.floor(Math.random() * types.length)];
      this.mysteryRevealed = revealedType;
      
      if (revealedType === 'mask_shop') {
        this.maskShopOffering = this.config.generateMaskShopOffering();
      } else if (revealedType === 'shrine') {
        this.currentShrine = this.config.getRandomShrine();
      } else if (revealedType === 'battle') {
        // Mystery battles are random enemies
        const enemyIds = ['weak_shadow', 'goblin', 'orc_warrior'];
        node.enemy = enemyIds[Math.floor(Math.random() * enemyIds.length)];
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

  isTrackComplete() {
    const node = this.getCurrentNode();
    return node && node.connections.length === 0;
  }

  awardVictory(enemy) {
    this.darkEnergy += enemy.dark_energy_reward || 3;
    this.coins += enemy.coin_reward;
  }

  hasLost() {
    // Lost if no minions alive and can't afford to summon
    const hasAliveMinions = this.minions.some(m => !m.isDead());
    const canSummon = this.darkEnergy >= this.config.minionConfig.summon_cost;
    return !hasAliveMinions && !canSummon;
  }

  reset() {
    this.darkEnergy = 5;
    this.coins = 5;
    this.minions = [];
    this.nextMinionId = 1;
    this.currentTrack = null;
    this.currentNodeId = null;
    this.visitedNodes = [];
    this.completedNodes = [];
    this.maskShopOffering = null;
    this.currentShrine = null;
    this.mysteryRevealed = null;
  }
}
