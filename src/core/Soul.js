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
    
    // Cards & traits
    this.baseCards = [...type.base_cards];
    this.starterTrait = type.starter_trait;
    this.negativeTraits = [];
    
    // Mask
    this.mask = null;
    this.maskBattlesRemaining = 0;
    
    // State
    this.tired = false;
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
    
    // Base cards
    this.baseCards.forEach(cardId => {
      const card = config.getCard(cardId);
      if (card) deck.push({ ...card });
    });

    // Starter trait card
    const starterTrait = config.getTrait(this.starterTrait);
    if (starterTrait) {
      const traitCard = config.getCard(starterTrait.card);
      if (traitCard) deck.push({ ...traitCard });
    }

    // Mask trait cards
    if (this.mask) {
      this.mask.traits.forEach(traitId => {
        const trait = config.getTrait(traitId);
        if (trait) {
          const traitCard = config.getCard(trait.card);
          if (traitCard) deck.push({ ...traitCard });
        }
      });
    }

    // Negative trait cards
    this.negativeTraits.forEach(traitId => {
      const trait = config.getTrait(traitId);
      if (trait) {
        const traitCard = config.getCard(trait.card);
        if (traitCard) deck.push({ ...traitCard });
      }
    });

    // Tired card if flagged
    if (this.tired) {
      const tiredCard = config.getCard('tired');
      if (tiredCard) deck.push({ ...tiredCard });
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
    this.tired = isTired;
  }

  takeDamage(amount) {
    this.blood = Math.max(0, this.blood - amount);
    return this.blood <= 0;
  }

  isDead() {
    return this.blood <= 0;
  }
}
