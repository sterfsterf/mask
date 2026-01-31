// Combat system - handles card battles
export class Combat {
  constructor(minion, enemy, config) {
    this.config = config;
    
    // Combatants
    this.minion = minion;
    this.enemy = enemy;
    
    // Stats
    this.minionStats = minion.getStats();
    this.minionBlood = minion.blood;
    this.minionBlock = 0;
    
    this.enemyBlood = enemy.blood;
    this.enemyBlock = 0;
    
    // Deck & hand
    this.deck = this.shuffleDeck(minion.buildDeck(config));
    this.hand = [];
    this.discardPile = [];
    
    // Turn state
    this.energy = 3;
    this.maxEnergy = 3;
    this.turn = 0;
    this.playerTurn = true;
    
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
    
    if (card.cost > this.energy) {
      return { success: false, error: 'Not enough energy' };
    }

    // Play the card
    this.energy -= card.cost;
    const playedCard = this.hand.splice(handIndex, 1)[0];
    this.discardPile.push(playedCard);

    // Execute card effect
    this.executeCardEffect(playedCard, true);

    // Check for death
    this.checkCombatEnd();

    return { success: true, card: playedCard, state: this.getState() };
  }

  executeCardEffect(card, isPlayer) {
    if (card.type === 'attack') {
      if (isPlayer) {
        const damage = Math.max(0, (card.damage + this.minionStats.attack) - this.enemyBlock);
        this.enemyBlock = Math.max(0, this.enemyBlock - (card.damage + this.minionStats.attack));
        this.enemyBlood -= damage;
      } else {
        const damage = Math.max(0, (card.damage + this.enemy.attack) - this.minionBlock);
        this.minionBlock = Math.max(0, this.minionBlock - (card.damage + this.enemy.attack));
        this.minionBlood -= damage;
      }
    } else if (card.type === 'defend') {
      if (isPlayer) {
        this.minionBlock += card.block + this.minionStats.defense;
      } else {
        this.enemyBlock += card.block + this.enemy.defense;
      }
    }
    // 'status' cards do nothing
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
    this.enemyTurn();

    // Check death
    this.checkCombatEnd();

    // Start new turn
    if (!this.result) {
      this.turn++;
      this.playerTurn = true;
      this.energy = this.maxEnergy;
      this.drawCards(5);
      
      // Block decays each turn
      this.minionBlock = 0;
      this.enemyBlock = 0;
    }

    return { success: true, state: this.getState() };
  }

  enemyTurn() {
    // Simple AI - just attack
    const attackCard = {
      id: 'enemy_attack',
      name: 'Attack',
      cost: 0,
      type: 'attack',
      damage: this.enemy.attack
    };

    this.executeCardEffect(attackCard, false);
  }

  checkCombatEnd() {
    if (this.enemyBlood <= 0) {
      this.result = 'victory';
      this.minion.blood = this.minionBlood;
    } else if (this.minionBlood <= 0) {
      this.result = 'defeat';
      this.minion.blood = 0;
    }
  }

  getState() {
    return {
      minion: {
        blood: this.minionBlood,
        maxBlood: this.minion.maxBlood,
        block: this.minionBlock,
        stats: this.minionStats
      },
      enemy: {
        blood: this.enemyBlood,
        maxBlood: this.enemy.blood,
        block: this.enemyBlock,
        name: this.enemy.name
      },
      hand: [...this.hand],
      energy: this.energy,
      maxEnergy: this.maxEnergy,
      deckCount: this.deck.length,
      discardCount: this.discardPile.length,
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
