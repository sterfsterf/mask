// Soul class - represents a summoned soul
export class Soul {
  constructor(id, type, config) {
    this.id = id;
    this.type = type.id;
    this.name = `${type.name} #${id}`;
    
    // Base stats
    this.maxBlood = type.base_blood;
    this.blood = this.maxBlood;
    this.baseAttack = type.base_attack;
    this.baseDefense = type.base_defense;
    
    // Pick a random quote from the soul type
    this.quote = type.quotes && type.quotes.length > 0 
      ? type.quotes[Math.floor(Math.random() * type.quotes.length)]
      : '';
    
    // Store blessing quotes for later
    this.blessingQuotes = type.blessing_quotes || [];
    
    // Store mask break quotes
    this.maskBreakQuotes = type.mask_break_quotes || [];
    
    // Cards & traits
    this.baseCards = [...type.base_cards];
    this.starterTrait = type.starter_trait;
    this.specialCard = type.special_card;
    this.negativeTraits = [];
    
    // Mask
    this.mask = null;
    this.maskBattlesRemaining = 0;
    
    // State
    this.tiredCount = 0; // Number of tired cards in deck
  }
  
  getBlessingQuote() {
    if (this.blessingQuotes.length > 0) {
      return this.blessingQuotes[Math.floor(Math.random() * this.blessingQuotes.length)];
    }
    return '';
  }

  getMaskBreakQuote() {
    if (this.maskBreakQuotes.length > 0) {
      return this.maskBreakQuotes[Math.floor(Math.random() * this.maskBreakQuotes.length)];
    }
    return '';
  }

  getStats() {
    let attack = this.baseAttack;
    let defense = this.baseDefense;
    let blood = this.maxBlood;

    // Apply trait modifiers
    const allTraits = [this.starterTrait, ...this.negativeTraits];
    if (this.mask) {
      allTraits.push(...this.mask.traits);
    }

    return { attack, defense, blood, traits: allTraits };
  }

  buildDeck(config) {
    const deck = [];
    
    // Base cards (soul source)
    this.baseCards.forEach(cardId => {
      const card = config.getCard(cardId);
      if (card) deck.push({ ...card, source: 'soul' });
    });

    // Special card (soul source)
    if (this.specialCard) {
      const specialCard = config.getCard(this.specialCard);
      if (specialCard) deck.push({ ...specialCard, source: 'soul' });
    }

    // Mask trait cards (mask source)
    if (this.mask) {
      this.mask.traits.forEach(traitId => {
        const trait = config.getTrait(traitId);
        if (trait) {
          const traitCard = config.getCard(trait.card);
          if (traitCard) deck.push({ ...traitCard, source: 'mask' });
        }
      });
    }

    // Negative trait cards (soul source)
    this.negativeTraits.forEach(traitId => {
      const trait = config.getTrait(traitId);
      if (trait) {
        const traitCard = config.getCard(trait.card);
        if (traitCard) deck.push({ ...traitCard, source: 'soul' });
      }
    });

    // Tired cards if any (soul source)
    for (let i = 0; i < this.tiredCount; i++) {
      const tiredCard = config.getCard('tired');
      if (tiredCard) deck.push({ ...tiredCard, source: 'soul' });
    }

    return deck;
  }

  equipMask(mask) {
    this.mask = { ...mask };
    this.maskBattlesRemaining = mask.bind_duration;
  }

  removeMask() {
    const removedMask = this.mask ? { ...this.mask, bind_duration: this.mask.bind_duration } : null;
    this.mask = null;
    this.maskBattlesRemaining = 0;
    return removedMask;
  }

  canRemoveMask() {
    return this.mask && this.maskBattlesRemaining === 0;
  }

  getMaskRemovalCost() {
    if (!this.mask) return 0;
    // Cost = remaining battles * 3 blood
    return this.maskBattlesRemaining * 3;
  }

  canAffordMaskRemoval() {
    const cost = this.getMaskRemovalCost();
    return this.blood > cost; // Must have blood left after removal
  }

  forceRemoveMask() {
    // Remove mask early for blood cost, return the mask
    const cost = this.getMaskRemovalCost();
    this.blood = Math.max(1, this.blood - cost);
    const removedMask = this.mask ? { ...this.mask, bind_duration: this.mask.bind_duration } : null;
    this.mask = null;
    this.maskBattlesRemaining = 0;
    return removedMask;
  }

  breakMask() {
    // Mask breaks on defeat - remove it
    this.mask = null;
    this.maskBattlesRemaining = 0;
  }

  addNegativeTrait(traitId) {
    this.negativeTraits.push(traitId);
  }

  addPositiveTraitToMask(traitId) {
    if (this.mask) {
      this.mask.traits.push(traitId);
    }
  }

  decrementMaskBind() {
    if (this.maskBattlesRemaining > 0) {
      this.maskBattlesRemaining--;
    }
  }

  setTired(isTired) {
    if (isTired) {
      this.tiredCount++;
    } else {
      this.tiredCount = 0;
    }
  }

  reduceTiredness() {
    if (this.tiredCount > 0) {
      this.tiredCount--;
    }
  }

  get tired() {
    return this.tiredCount > 0;
  }

  takeDamage(amount) {
    this.blood = Math.max(0, this.blood - amount);
    return this.blood <= 0;
  }

  isDead() {
    return this.blood <= 0;
  }
}
