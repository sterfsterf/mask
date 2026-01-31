// Game controller - orchestrates everything
import { ConfigLoader } from './core/ConfigLoader.js';
import { GameState } from './core/GameState.js';
import { Minion } from './core/Minion.js';
import { Combat } from './core/Combat.js';

export class Game {
  constructor() {
    this.config = null;
    this.state = null;
    this.combat = null;
    this.ui = null; // Will be set by main
  }

  async init() {
    console.log('🎭 Initializing MASK...');
    
    this.config = new ConfigLoader();
    await this.config.loadAll();
    
    this.state = new GameState(this.config);
    
    // Start at beginning of track (void node)
    this.state.startTrack('main_path');
    
    console.log('✓ Game initialized');
    return this;
  }

  // Home screen actions
  summonMinion() {
    return this.state.summonMinion();
  }

  buyMask(rarity, index) {
    const result = this.state.buyMaskFromShop(rarity, index);
    if (result.success) {
      // Store mask temporarily for equipping
      this.tempMask = result.mask;
    }
    return result;
  }

  equipTempMask(minionId) {
    if (!this.tempMask) {
      return { success: false, error: 'No mask to equip' };
    }
    
    const result = this.state.equipMaskToMinion(minionId, this.tempMask);
    if (result.success) {
      this.tempMask = null;
    }
    return result;
  }

  equipMask(minionId, mask) {
    return this.state.equipMaskToMinion(minionId, mask);
  }

  removeMaskFromMinion(minionId) {
    const minion = this.state.minions.find(m => m.id === minionId);
    if (!minion) {
      return { success: false, error: 'Minion not found' };
    }

    if (!minion.mask) {
      return { success: false, error: 'No mask equipped' };
    }

    const cost = minion.getMaskRemovalCost();
    
    if (cost === 0) {
      // Free removal - bind expired
      const mask = minion.removeMask();
      if (mask) {
        this.tempMask = mask; // Store for re-equipping
      }
      return { success: true, cost: 0 };
    }

    if (!minion.canAffordMaskRemoval()) {
      return { success: false, error: 'Not enough blood to remove mask' };
    }

    const mask = minion.forceRemoveMask();
    if (mask) {
      this.tempMask = mask; // Store for re-equipping
    }
    return { success: true, cost };
  }

  getMinions() {
    return this.state.minions.filter(m => !m.isDead());
  }

  getMaskInventory() {
    return this.tempMask ? [this.tempMask] : [];
  }

  getCurrencies() {
    return {
      darkEnergy: this.state.darkEnergy,
      coins: this.state.coins
    };
  }

  // Battle selection
  getCurrentNode() {
    return this.state.getCurrentNode();
  }

  getAvailableNodes() {
    return this.state.getAvailableNextNodes();
  }

  moveToNode(nodeId) {
    return this.state.moveToNode(nodeId);
  }

  getCurrentEnemy() {
    const node = this.state.getCurrentNode();
    if (!node) return null;
    
    if (node.type === 'mystery' && this.state.mysteryRevealed === 'battle') {
      return this.config.getEnemy(node.enemy);
    }
    
    if (node.type === 'battle') {
      return this.config.getEnemy(node.enemy);
    }
    
    return null;
  }

  startBattle(minionId) {
    const minion = this.state.minions.find(m => m.id === minionId);
    if (!minion) {
      return { success: false, error: 'Minion not found' };
    }

    const enemy = this.getCurrentEnemy();
    if (!enemy) {
      return { success: false, error: 'No enemy at current node' };
    }

    // Create deep copy of enemy for this battle
    const enemyCopy = { ...enemy };
    
    this.combat = new Combat(minion, enemyCopy, this.config);
    const initialState = this.combat.startCombat();

    return { success: true, combatState: initialState };
  }

  // Combat actions
  playCard(handIndex) {
    if (!this.combat) {
      return { success: false, error: 'No active combat' };
    }
    return this.combat.playCard(handIndex);
  }

  endTurn() {
    if (!this.combat) {
      return { success: false, error: 'No active combat' };
    }
    return this.combat.endTurn();
  }

  getCombatState() {
    if (!this.combat) return null;
    return this.combat.getState();
  }

  // Post-battle
  resolveBattle() {
    if (!this.combat || !this.combat.isOver()) {
      return { success: false, error: 'Combat not over' };
    }

    const result = this.combat.getResult();
    const minion = this.combat.minion;
    const enemy = this.combat.enemy;

    if (result === 'victory') {
      // Award resources
      this.state.awardVictory(enemy);
      
      // Mark minion tired
      minion.setTired(true);
      
      // Decrement mask bind
      minion.decrementMaskBind();
      
      return {
        success: true,
        result: 'victory',
        needsTraitChoice: true,
        availableTraits: this.getRandomPositiveTraits(3)
      };
    } else {
      // Mask breaks on defeat
      if (minion.mask) {
        minion.breakMask();
      }
      
      return {
        success: true,
        result: 'defeat',
        needsTraitChoice: true,
        availableTraits: this.getRandomNegativeTraits(3)
      };
    }
  }

  getRandomPositiveTraits(count) {
    const positive = Object.values(this.config.traits).filter(t => t.type === 'positive');
    return this.sampleArray(positive, count);
  }

  getRandomNegativeTraits(count) {
    const negative = Object.values(this.config.traits).filter(t => t.type === 'negative');
    return this.sampleArray(negative, count);
  }

  sampleArray(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  applyTraitChoice(traitId, isPositive) {
    const minion = this.combat.minion;
    
    if (isPositive) {
      minion.addPositiveTraitToMask(traitId);
    } else {
      minion.addNegativeTrait(traitId);
    }

    this.combat = null;
    return { success: true };
  }

  // Game over check
  checkGameOver() {
    if (this.state.hasLost()) {
      return { gameOver: true, message: 'All minions lost. Starting over...' };
    }
    
    if (this.state.isTrackComplete()) {
      return { trackComplete: true, message: 'Track complete! Victory!' };
    }
    
    return { gameOver: false };
  }

  reset() {
    this.state.reset();
    this.combat = null;
    this.state.startTrack('main_path');
    this.tempMask = null;
  }
}
