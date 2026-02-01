// Combat system - handles card battles
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
    
    // Mask health - based on rarity
    let maskMaxBlood = 0;
    if (soul.mask) {
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
    }
    this.maskBlood = maskMaxBlood;
    this.maskMaxBlood = maskMaxBlood;
    this.maskBroken = false;
    
    this.enemyBlood = enemy.blood;
    this.enemyBlock = 0;
    
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
        this.hand.push(this.deck.pop());
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
    
    // Check if this is a mask card played after mask is broken
    if (this.maskBroken && playedCard.source === 'mask') {
      // Banish mask card to void
      this.voidPile.push(playedCard);
      
      // Generate and add scar card to discard
      const scarCard = this.generateScarCard(playedCard);
      this.discardPile.push(scarCard);
      
      // Execute the card effect still
      const animEvent = this.executeCardEffect(playedCard, true);
      
      // Check for death
      this.checkCombatEnd();
      
      return { success: true, card: playedCard, scarCard, state: this.getState(), animEvent };
    } else {
      // Normal card play
      this.discardPile.push(playedCard);
      
      // Execute card effect and get animation event
      const animEvent = this.executeCardEffect(playedCard, true);
      
      // Check for death
      this.checkCombatEnd();
      
      return { success: true, card: playedCard, state: this.getState(), animEvent };
    }
  }

  executeCardEffect(card, isPlayer) {
    let animEvent = null;

    if (card.type === 'attack') {
      if (isPlayer) {
        const prevHealth = this.enemyBlood;
        const damage = Math.max(0, card.damage - this.enemyBlock);
        this.enemyBlock = Math.max(0, this.enemyBlock - card.damage);
        this.enemyBlood -= damage;
        
        animEvent = { type: 'soul_attack', damage, prevHealth, newHealth: this.enemyBlood };
        
        // Self-damage if card has it
        if (card.self_damage) {
          this.soulBlood -= card.self_damage;
        }
      } else {
        // Enemy attacking soul - route damage to mask first
        const prevHealth = this.soulBlood;
        const prevMaskHealth = this.maskBlood;
        let damage = Math.max(0, card.damage - this.soulBlock);
        this.soulBlock = Math.max(0, this.soulBlock - card.damage);
        
        // Route damage to mask first if it exists
        if (this.maskBlood > 0) {
          const maskDamage = Math.min(damage, this.maskBlood);
          this.maskBlood -= maskDamage;
          damage -= maskDamage;
          
          // Update soul's mask health
          if (this.soul.mask) {
            this.soul.maskBlood = this.maskBlood;
          }
          
          // Check if mask broke
          if (this.maskBlood <= 0) {
            this.maskBlood = 0;
            this.maskBroken = true;
            if (this.soul.mask) {
              this.soul.maskBlood = 0;
            }
          }
        }
        
        // Remaining damage goes to soul
        this.soulBlood -= damage;
        
        animEvent = { 
          type: 'enemy_attack', 
          damage, 
          maskDamage: prevMaskHealth - this.maskBlood,
          prevHealth, 
          newHealth: this.soulBlood,
          prevMaskHealth,
          newMaskHealth: this.maskBlood,
          maskBroken: this.maskBroken && prevMaskHealth > 0
        };
      }
    } else if (card.type === 'defend') {
      if (isPlayer) {
        // Pay health cost if this is a scar card
        if (card.health_cost) {
          this.soulBlood -= card.health_cost;
        }
        this.soulBlock += card.block;
        animEvent = { type: 'soul_defend', blockGained: card.block, healthCost: card.health_cost || 0 };
      } else {
        this.enemyBlock += card.block;
      }
    }
    // 'status' cards do nothing
    
    return animEvent;
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
      this.drawCards(5);
      
      // Block decays each turn
      this.soulBlock = 0;
      this.enemyBlock = 0;
      
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

    let animEvent = null;

    // Execute the intent
    switch (this.enemyIntent.type) {
      case 'attack':
        animEvent = this.executeCardEffect({
          id: 'enemy_attack',
          name: 'Attack',
          cost: 0,
          type: 'attack',
          damage: this.enemyIntent.value
        }, false);
        break;
        
      case 'defend':
        this.enemyBlock += this.enemyIntent.value;
        break;
        
      case 'big_attack':
        animEvent = this.executeCardEffect({
          id: 'enemy_big_attack',
          name: 'Heavy Strike',
          cost: 0,
          type: 'attack',
          damage: this.enemyIntent.value
        }, false);
        break;
        
      case 'heal':
        this.enemyBlood = Math.min(this.enemy.blood, this.enemyBlood + this.enemyIntent.value);
        break;
    }

    return animEvent;
  }

  checkCombatEnd() {
    if (this.enemyBlood <= 0) {
      this.result = 'victory';
      this.soul.blood = this.soulBlood;
    } else if (this.soulBlood <= 0) {
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
        maskBroken: this.maskBroken
      },
      enemy: {
        id: this.enemy.id,
        blood: this.enemyBlood,
        maxBlood: this.enemy.blood,
        block: this.enemyBlock,
        name: this.enemy.name,
        intent: this.enemyIntent
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
