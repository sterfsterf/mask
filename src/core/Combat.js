// Combat system - handles card battles
import { EffectManager } from './EffectManager.js';

export class Combat {
  constructor(soul, enemy, config) {
    this.config = config;
    
    // Combatants
    this.soul = soul;
    this.enemy = enemy;
    
    // Stats
    this.soulStats = soul.getStats();
    this.soulBlood = soul.blood;
    this.soulBlock = 0;
    
    // Mask health - use existing if available, otherwise initialize based on rarity
    let maskMaxBlood = 0;
    if (soul.mask) {
      // Check if mask health is already set (from equipping at shop)
      if (soul.maskMaxBlood !== undefined && soul.maskBlood !== undefined) {
        maskMaxBlood = soul.maskMaxBlood;
        this.maskBlood = soul.maskBlood;
      } else {
        // Initialize new mask health based on rarity
        const rarity = soul.mask.rarity;
        if (rarity === 'common') {
          maskMaxBlood = Math.floor(Math.random() * 6) + 10; // 10-15
        } else if (rarity === 'rare') {
          maskMaxBlood = Math.floor(Math.random() * 11) + 15; // 15-25
        } else if (rarity === 'legendary') {
          maskMaxBlood = Math.floor(Math.random() * 16) + 25; // 25-40
        }
        
        // Store mask health on the soul for UI display
        soul.maskBlood = maskMaxBlood;
        soul.maskMaxBlood = maskMaxBlood;
        this.maskBlood = maskMaxBlood;
      }
    }
    this.maskMaxBlood = maskMaxBlood;
    this.maskBroken = false;
    
    this.enemyBlood = enemy.blood;
    this.enemyBlock = 0;
    
    // Effect managers
    this.playerEffects = new EffectManager();
    this.enemyEffects = new EffectManager();
    
    // Deck & hand
    this.deck = this.shuffleDeck(soul.buildDeck(config));
    this.hand = [];
    this.discardPile = [];
    this.voidPile = []; // Banished cards
    
    // Turn state
    this.energy = 3;
    this.maxEnergy = 3;
    this.turn = 0;
    this.playerTurn = true;
    
    // Enemy intent
    this.enemyIntent = null;
    
    // Result
    this.result = null; // 'victory' | 'defeat' | null
  }

  shuffleDeck(deck) {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  startCombat() {
    this.drawCards(5);
    this.generateEnemyIntent();
    return this.getState();
  }

  drawCards(count) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length === 0) {
        // Reshuffle discard into deck
        this.deck = this.shuffleDeck(this.discardPile);
        this.discardPile = [];
      }
      
      if (this.deck.length > 0) {
        const card = this.deck.pop();
        this.hand.push(card);
        
        // Decrease affection when drawing a tired card
        if (card.id === 'tired') {
          this.soul.changeAffection(-2); // -2 for each tired card drawn
        }
      }
    }
  }

  playCard(handIndex) {
    if (!this.playerTurn) {
      return { success: false, error: 'Not player turn' };
    }

    if (handIndex >= this.hand.length) {
      return { success: false, error: 'Invalid card' };
    }

    const card = this.hand[handIndex];
    
    if (card.unplayable) {
      return { success: false, error: 'Card cannot be played' };
    }
    
    if (card.cost > this.energy) {
      return { success: false, error: 'Not enough energy' };
    }

    // Play the card
    this.energy -= card.cost;
    const playedCard = this.hand.splice(handIndex, 1)[0];
    
    // Execute card effect and get animation event + void status
    const { animEvent, voidCard } = this.executeCardEffect(playedCard, true);
    
    // Check if this is a mask card played after mask is broken
    if (this.maskBroken && playedCard.source === 'mask') {
      // Banish mask card to void
      this.voidPile.push(playedCard);
      
      // Generate and add scar card to discard
      const scarCard = this.generateScarCard(playedCard);
      this.discardPile.push(scarCard);
      
      // Check for death
      this.checkCombatEnd();
      
      return { success: true, card: playedCard, scarCard, state: this.getState(), animEvent };
    } else if (voidCard) {
      // Card is banished to void after use
      this.voidPile.push(playedCard);
      
      // Check for death
      this.checkCombatEnd();
      
      return { success: true, card: playedCard, voided: true, state: this.getState(), animEvent };
    } else {
      // Normal card play - goes to discard
      this.discardPile.push(playedCard);
      
      // Check for death
      this.checkCombatEnd();
      
      return { success: true, card: playedCard, state: this.getState(), animEvent };
    }
  }

  executeCardEffect(card, isPlayer) {
    // Build context for effect manager
    const context = {
      isPlayer,
      soulBlood: this.soulBlood,
      soulMaxBlood: this.soul.maxBlood,
      soulBlock: this.soulBlock,
      maskBlood: this.maskBlood,
      maskMaxBlood: this.maskMaxBlood,
      maskBroken: this.maskBroken,
      enemyBlood: this.enemyBlood,
      enemyBlock: this.enemyBlock,
      energy: this.energy,
      playerStatusEffects: this.playerEffects.statusEffects,
      enemyStatusEffects: this.enemyEffects.statusEffects
    };

    // Apply effects
    const effectManager = isPlayer ? this.playerEffects : this.enemyEffects;
    const results = effectManager.applyCardEffects(card, context);

    console.log(`💥 Card effect: ${card.name} | Enemy HP: ${context.enemyBlood} | Soul HP: ${context.soulBlood}`);

    // Update combat state from context
    this.soulBlood = context.soulBlood;
    this.soulBlock = context.soulBlock;
    this.maskBlood = context.maskBlood;
    this.maskBroken = context.maskBroken;
    this.enemyBlood = context.enemyBlood;
    this.enemyBlock = context.enemyBlock;
    this.energy = context.energy;

    // If mask just broke, remove it from the soul
    if (this.maskBroken && this.soul.mask) {
      this.soul.breakMask();
    }

    // Update soul's mask health if changed
    if (this.soul.mask) {
      this.soul.maskBlood = this.maskBlood;
    }

    // Build animation event
    let animEvent = null;
    if (card.type === 'attack') {
      if (isPlayer) {
        animEvent = { 
          type: 'soul_attack', 
          damage: results.damage,
          selfDamage: results.soulDamage,
          effects: results.statusApplied
        };
      } else {
        animEvent = { 
          type: 'enemy_attack', 
          damage: results.damage,
          maskDamage: results.maskDamage,
          maskBroken: this.maskBroken,
          effects: results.statusApplied
        };
      }
    } else if (card.type === 'defend') {
      animEvent = { 
        type: isPlayer ? 'soul_defend' : 'enemy_defend',
        blockGained: results.block,
        healthCost: results.soulDamage,
        effects: results.statusApplied
      };
    } else if (card.type === 'skill') {
      animEvent = {
        type: isPlayer ? 'soul_skill' : 'enemy_skill',
        maskHeal: results.maskHeal,
        soulHeal: results.soulHeal,
        energyMod: results.energyMod,
        effects: results.statusApplied
      };
    }

    return { animEvent, voidCard: results.voidCard };
  }

  endTurn() {
    if (!this.playerTurn) {
      return { success: false, error: 'Not player turn' };
    }

    // Discard hand
    this.discardPile.push(...this.hand);
    this.hand = [];

    // Enemy turn
    this.playerTurn = false;
    const enemyAnimEvent = this.enemyTurn();

    // Check death
    this.checkCombatEnd();

    // Start new turn
    if (!this.result) {
      this.turn++;
      this.playerTurn = true;
      this.energy = this.maxEnergy;
      
      // Process turn start effects
      const turnStartContext = {
        soulBlood: this.soulBlood,
        soulMaxBlood: this.soul.maxBlood,
        energy: this.energy
      };
      const playerTurnEffects = this.playerEffects.processTurnStart(turnStartContext);
      this.soulBlood = turnStartContext.soulBlood;
      this.energy = turnStartContext.energy;
      
      // Check if player died from poison before drawing cards
      this.checkCombatEnd();
      if (this.result) {
        return { success: true, state: this.getState(), enemyAnimEvent, playerDiedPoison: true };
      }
      
      this.drawCards(5);
      
      // Soul block decays at start of player's turn (was used to block enemy attack)
      this.soulBlock = 0;
      // Enemy block stays from their defend action last turn
      
      // Generate new enemy intent for next turn
      this.generateEnemyIntent();
    }

    return { success: true, state: this.getState(), enemyAnimEvent };
  }

  generateEnemyIntent() {
    // Random intent based on weights
    // 60% normal attack, 20% defend, 10% big attack, 10% heal
    const roll = Math.random() * 100;
    
    if (roll < 60) {
      // Normal attack
      this.enemyIntent = {
        type: 'attack',
        value: this.enemy.attack,
        name: 'Attack',
        icon: '⚔️'
      };
    } else if (roll < 80) {
      // Defend
      const blockAmount = Math.floor(this.enemy.defense * 2);
      this.enemyIntent = {
        type: 'defend',
        value: blockAmount,
        name: 'Defend',
        icon: '🛡️'
      };
    } else if (roll < 90) {
      // Big attack
      const bigDamage = Math.floor(this.enemy.attack * 1.5);
      this.enemyIntent = {
        type: 'big_attack',
        value: bigDamage,
        name: 'Heavy Strike',
        icon: '💥'
      };
    } else {
      // Heal
      const healAmount = Math.floor(this.enemy.blood * 0.15);
      this.enemyIntent = {
        type: 'heal',
        value: healAmount,
        name: 'Regenerate',
        icon: '💚'
      };
    }
  }

  generateScarCard(maskCard) {
    // Generate a negative scar card based on the mask card type
    const scarId = `scar_${maskCard.id}_${Date.now()}`;
    
    if (maskCard.type === 'attack') {
      // Attack scar: deals damage but also hurts the user
      return {
        id: scarId,
        name: `Scar: ${maskCard.name}`,
        description: `${maskCard.description} Takes ${Math.ceil(maskCard.damage / 2)} self-damage.`,
        type: 'attack',
        cost: maskCard.cost,
        damage: maskCard.damage,
        self_damage: Math.ceil(maskCard.damage / 2),
        source: 'scar'
      };
    } else if (maskCard.type === 'defend') {
      // Defense scar: grants block but costs health
      const healthCost = Math.ceil(maskCard.block / 2);
      return {
        id: scarId,
        name: `Scar: ${maskCard.name}`,
        description: `${maskCard.description} Costs ${healthCost} HP to play.`,
        type: 'defend',
        cost: maskCard.cost,
        block: maskCard.block,
        health_cost: healthCost,
        source: 'scar'
      };
    } else {
      // Status scar: becomes a dead card (unplayable)
      return {
        id: scarId,
        name: `Scar: ${maskCard.name}`,
        description: 'A broken fragment. Cannot be played.',
        type: 'status',
        cost: maskCard.cost,
        unplayable: true,
        source: 'scar'
      };
    }
  }

  enemyTurn() {
    if (!this.enemyIntent) {
      this.generateEnemyIntent();
    }

    // Process enemy turn start effects (poison, stun)
    const enemyTurnContext = {
      enemyBlood: this.enemyBlood
    };
    const enemyTurnEffects = this.playerEffects.processEnemyTurnStart(enemyTurnContext, this.enemyEffects.statusEffects);
    this.enemyBlood = enemyTurnContext.enemyBlood;
    
    // Check if enemy died from poison before doing anything else
    if (this.enemyBlood <= 0) {
      return { type: 'enemy_died_poison', poisonDamage: enemyTurnEffects.poisonDamage };
    }
    
    // If stunned, skip turn
    if (enemyTurnEffects.stunned) {
      return { type: 'enemy_stunned', poisonDamage: enemyTurnEffects.poisonDamage };
    }

    // Enemy block decays at start of their turn (was used to block player attacks)
    this.enemyBlock = 0;

    let animEvent = null;

    // Execute the intent
    switch (this.enemyIntent.type) {
      case 'attack':
        const attackResult = this.executeCardEffect({
          id: 'enemy_attack',
          name: 'Attack',
          cost: 0,
          type: 'attack',
          damage: this.enemyIntent.value
        }, false);
        animEvent = attackResult.animEvent;
        break;
        
      case 'defend':
        this.enemyBlock += this.enemyIntent.value;
        break;
        
      case 'big_attack':
        const bigAttackResult = this.executeCardEffect({
          id: 'enemy_big_attack',
          name: 'Heavy Strike',
          cost: 0,
          type: 'attack',
          damage: this.enemyIntent.value
        }, false);
        animEvent = bigAttackResult.animEvent;
        break;
        
      case 'heal':
        this.enemyBlood = Math.min(this.enemy.blood, this.enemyBlood + this.enemyIntent.value);
        break;
    }

    return animEvent;
  }

  checkCombatEnd() {
    console.log('🔍 Death check - Enemy HP:', this.enemyBlood, 'Soul HP:', this.soulBlood);
    
    if (this.enemyBlood <= 0) {
      console.log('✅ Enemy defeated!');
      this.result = 'victory';
      this.soul.blood = this.soulBlood;
    } else if (this.soulBlood <= 0) {
      console.log('💀 Soul defeated!');
      this.result = 'defeat';
      this.soul.blood = 0;
    }
  }

  getState() {
    return {
      soul: {
        id: this.soul.id,
        name: this.soul.name,
        type: this.soul.type,
        mask: this.soul.mask,
        blood: this.soulBlood,
        maxBlood: this.soul.maxBlood,
        block: this.soulBlock,
        stats: this.soulStats,
        maskBlood: this.maskBlood,
        maskMaxBlood: this.maskMaxBlood,
        maskBroken: this.maskBroken,
        statusEffects: this.playerEffects.getStatusEffects()
      },
      enemy: {
        id: this.enemy.id,
        blood: this.enemyBlood,
        maxBlood: this.enemy.blood,
        block: this.enemyBlock,
        name: this.enemy.name,
        intent: this.enemyIntent,
        statusEffects: this.enemyEffects.getStatusEffects()
      },
      hand: this.hand.map(card => ({
        ...card,
        unplayable: card.unplayable || card.cost > this.energy
      })),
      deck: [...this.deck],
      discard: [...this.discardPile],
      voidPile: [...this.voidPile],
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      deckCount: this.deck.length,
      discardCount: this.discardPile.length,
      voidCount: this.voidPile.length,
      turn: this.turn,
      playerTurn: this.playerTurn,
      result: this.result
    };
  }

  isOver() {
    return this.result !== null;
  }

  getResult() {
    return this.result;
  }
}
