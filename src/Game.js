// Game controller - orchestrates everything
import { ConfigLoader } from './core/ConfigLoader.js';
import { GameState } from './core/GameState.js';
import { Soul } from './core/Soul.js';
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
    
    // Start a new run with procedural map
    this.state.startRun();
    
    console.log('✓ Game initialized');
    return this;
  }

  // Home screen actions
  summonSoul() {
    return this.state.summonSoul();
  }

  buyMask(rarity, index) {
    const result = this.state.buyMaskFromShop(rarity, index);
    if (result.success) {
      // Store mask temporarily for equipping
      this.tempMask = result.mask;
    }
    return result;
  }

  equipTempMask(soulId) {
    if (!this.tempMask) {
      return { success: false, error: 'No mask to equip' };
    }
    
    const result = this.state.equipMaskToSoul(soulId, this.tempMask);
    if (result.success) {
      this.tempMask = null;
    }
    return result;
  }

  equipMask(soulId, mask) {
    return this.state.equipMaskToSoul(soulId, mask);
  }

  removeMaskFromSoul(soulId) {
    const soul = this.state.souls.find(m => m.id === soulId);
    if (!soul) {
      return { success: false, error: 'Soul not found' };
    }

    if (!soul.mask) {
      return { success: false, error: 'No mask equipped' };
    }

    const cost = soul.getMaskRemovalCost();
    
    if (cost === 0) {
      // Free removal - bind expired
      const mask = soul.removeMask();
      if (mask) {
        this.tempMask = mask; // Store for re-equipping
      }
      return { success: true, cost: 0 };
    }

    if (!soul.canAffordMaskRemoval()) {
      return { success: false, error: 'Not enough blood to remove mask' };
    }

    const mask = soul.forceRemoveMask();
    if (mask) {
      this.tempMask = mask; // Store for re-equipping
    }
    return { success: true, cost };
  }

  getSouls() {
    return this.state.souls.filter(m => !m.isDead());
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

  startBattle(soulId) {
    const soul = this.state.souls.find(m => m.id === soulId);
    if (!soul) {
      return { success: false, error: 'Soul not found' };
    }

    const enemy = this.getCurrentEnemy();
    if (!enemy) {
      return { success: false, error: 'No enemy at current node' };
    }

    // Reduce tiredness for souls that weren't selected (remove one tired card)
    this.state.souls.forEach(s => {
      if (s.id !== soulId && s.tired) {
        s.reduceTiredness();
      }
    });

    // Create deep copy of enemy for this battle
    const enemyCopy = { ...enemy };
    
    this.combat = new Combat(soul, enemyCopy, this.config);
    const initialState = this.combat.startCombat();

    return { success: true, combatState: initialState };
  }

  startBattleWithEnemy(soulId, enemy) {
    const soul = this.state.souls.find(m => m.id === soulId);
    if (!soul) {
      return { success: false, error: 'Soul not found' };
    }

    if (!enemy) {
      return { success: false, error: 'No enemy provided' };
    }

    // Create deep copy of enemy for this battle
    const enemyCopy = { ...enemy };
    
    this.combat = new Combat(soul, enemyCopy, this.config);
    const initialState = this.combat.startCombat();

    return { success: true, combatState: initialState };
  }

  endCombat() {
    this.combat = null;
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
    const soul = this.combat.soul;
    const enemy = this.combat.enemy;

    if (result === 'victory') {
      // Award resources
      this.state.awardVictory(enemy);
      
      // Mark soul tired
      soul.setTired(true);
      
      // Decrement mask bind
      soul.decrementMaskBind();
      
      return {
        success: true,
        result: 'victory',
        needsCardChoice: true,
        availableCards: this.getRandomPositiveCards(3)
      };
    } else {
      // Mask breaks on defeat
      if (soul.mask) {
        soul.breakMask();
      }
      
      return {
        success: true,
        result: 'defeat',
        needsCardChoice: true,
        availableCards: this.getRandomNegativeCards(3)
      };
    }
  }

  getRandomPositiveCards(count) {
    // Get all rewardable positive cards (not curses/status)
    console.log('Config structure:', this.config);
    console.log('Config.config:', this.config.config);
    
    if (!this.config || !this.config.config || !this.config.config.cards) {
      console.error('Config not properly loaded!');
      // Fallback to old hardcoded list
      const positive = ['rage_strike_trait', 'fortify_block', 'swift_strike', 'iron_defense', 'void_strike'];
      return this.sampleArray(positive, count);
    }
    
    const allCards = this.config.config.cards.cards;
    console.log('All cards loaded:', allCards?.length);
    
    const common = allCards.filter(c => c.rarity === 'common' && c.type !== 'status');
    const rare = allCards.filter(c => c.rarity === 'rare');
    const legendary = allCards.filter(c => c.rarity === 'legendary');
    
    console.log('Card pools - Common:', common.length, 'Rare:', rare.length, 'Legendary:', legendary.length);
    
    const rewards = [];
    
    for (let i = 0; i < count; i++) {
      const roll = Math.random() * 100;
      let card;
      
      if (roll < 70) {
        // 70% common
        card = common[Math.floor(Math.random() * common.length)];
      } else if (roll < 95) {
        // 25% rare
        card = rare[Math.floor(Math.random() * rare.length)];
      } else {
        // 5% legendary
        card = legendary[Math.floor(Math.random() * legendary.length)];
      }
      
      if (card) {
        console.log('Selected reward card:', card.name, card.rarity);
        rewards.push(card.id);
      }
    }
    
    console.log('Final rewards:', rewards);
    return rewards;
  }

  getRandomNegativeCards(count) {
    const allCards = this.config.config.cards.cards;
    const curses = allCards.filter(c => c.rarity === 'curse');
    return this.sampleArray(curses.map(c => c.id), count);
  }

  sampleArray(arr, count) {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  applyCardChoice(cardId, isPositive) {
    const soul = this.combat.soul;
    
    if (isPositive) {
      if (soul.mask) {
        soul.addPositiveCardToMask(cardId);
        console.log(`✓ Added positive card ${cardId} to ${soul.name}'s mask`);
      } else {
        console.log(`⚠️ ${soul.name} has no mask - positive card ${cardId} forfeited`);
      }
    } else {
      soul.addNegativeCard(cardId);
      console.log(`✓ Added negative card ${cardId} to ${soul.name}`);
    }

    this.combat = null;
    return { success: true };
  }

  // Game over check
  checkGameOver() {
    if (this.state.hasLost()) {
      return { gameOver: true, message: 'All souls lost. Starting over...' };
    }
    
    if (this.state.isRunComplete()) {
      return { runComplete: true, message: 'Run complete! Victory!' };
    }
    
    return { gameOver: false };
  }

  reset() {
    this.state.reset();
    this.combat = null;
    this.state.startRun();
    this.tempMask = null;
  }
}
