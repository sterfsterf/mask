// EffectManager - modular card effect system
export class EffectManager {
  constructor() {
    // Status effects are stacking buffs/debuffs that tick per turn
    this.statusEffects = {
      poison: 0,        // Lose N hp per turn, reduces by 1 each turn
      energy_next: 0,   // Gain/lose energy next turn
      mask_buff: 0,     // +N to all mask cards
      soul_buff: 0,     // +N to all soul cards
      scar_buff: 0,     // +N to all scar cards
      stunned: false    // Skip next turn
    };
  }

  // Apply a card's effects
  applyCardEffects(card, context) {
    const results = {
      damage: 0,
      maskDamage: 0,
      soulDamage: 0,
      block: 0,
      heal: 0,
      maskHeal: 0,
      soulHeal: 0,
      energyMod: 0,
      statusApplied: [],
      voidCard: false
    };

    // Get buffed values based on card source
    const buffedDamage = this.getBuffedValue(card.damage || 0, card.source);
    const buffedBlock = this.getBuffedValue(card.block || 0, card.source);

    // Attack effect
    if (card.type === 'attack' && buffedDamage > 0) {
      if (context.isPlayer) {
        // Player attacking enemy
        const actualDamage = Math.max(0, buffedDamage - context.enemyBlock);
        context.enemyBlock = Math.max(0, context.enemyBlock - buffedDamage);
        context.enemyBlood -= actualDamage;
        results.damage = actualDamage;
        
        // Self damage
        if (card.self_damage) {
          const buffedSelfDamage = this.getBuffedValue(card.self_damage, card.source);
          context.soulBlood -= buffedSelfDamage;
          results.soulDamage = buffedSelfDamage;
        }
      } else {
        // Enemy attacking player - route through mask first
        let damage = Math.max(0, buffedDamage - context.soulBlock);
        context.soulBlock = Math.max(0, context.soulBlock - buffedDamage);
        
        if (context.maskBlood > 0) {
          const maskDmg = Math.min(damage, context.maskBlood);
          context.maskBlood -= maskDmg;
          damage -= maskDmg;
          results.maskDamage = maskDmg;
          
          if (context.maskBlood <= 0) {
            context.maskBlood = 0;
            context.maskBroken = true;
          }
        }
        
        context.soulBlood -= damage;
        results.damage = damage;
      }
    }

    // Defend effect
    if (card.type === 'defend' && buffedBlock > 0) {
      if (context.isPlayer) {
        // Health cost for scar cards
        if (card.health_cost) {
          const buffedHealthCost = this.getBuffedValue(card.health_cost, card.source);
          context.soulBlood -= buffedHealthCost;
          results.soulDamage = buffedHealthCost;
        }
        context.soulBlock += buffedBlock;
        results.block = buffedBlock;
      } else {
        context.enemyBlock += buffedBlock;
        results.block = buffedBlock;
      }
    }

    // Poison effect (apply to target)
    if (card.poison) {
      if (context.isPlayer) {
        context.enemyStatusEffects.poison += card.poison;
        results.statusApplied.push({ type: 'poison', value: card.poison, target: 'enemy' });
      } else {
        this.statusEffects.poison += card.poison;
        results.statusApplied.push({ type: 'poison', value: card.poison, target: 'player' });
      }
    }

    // Energy next turn
    if (card.energy_next) {
      if (context.isPlayer) {
        this.statusEffects.energy_next += card.energy_next;
        results.statusApplied.push({ type: 'energy', value: card.energy_next, target: 'player' });
        results.energyMod = card.energy_next;
      }
    }

    // Buff effects (add to buff stacks)
    if (card.buff_mask) {
      this.statusEffects.mask_buff += card.buff_mask;
      results.statusApplied.push({ type: 'buff_mask', value: card.buff_mask });
    }
    if (card.buff_soul) {
      this.statusEffects.soul_buff += card.buff_soul;
      results.statusApplied.push({ type: 'buff_soul', value: card.buff_soul });
    }
    if (card.buff_scar) {
      this.statusEffects.scar_buff += card.buff_scar;
      results.statusApplied.push({ type: 'buff_scar', value: card.buff_scar });
    }

    // Stun effect (apply to enemy)
    if (card.stun && context.isPlayer) {
      context.enemyStatusEffects.stunned = true;
      results.statusApplied.push({ type: 'stun', target: 'enemy' });
    }

    // Heal mask
    if (card.heal_mask && context.maskBlood !== undefined) {
      const healAmount = Math.min(card.heal_mask, context.maskMaxBlood - context.maskBlood);
      context.maskBlood += healAmount;
      results.maskHeal = healAmount;
    }

    // Heal soul
    if (card.heal_soul) {
      // Special case: mask_sacrifice converts mask HP to soul HP
      if (card.id === 'mask_sacrifice' && context.maskBlood !== undefined) {
        // Take from mask, give to soul
        const transferAmount = Math.min(card.heal_soul, context.maskBlood);
        const actualHeal = Math.min(transferAmount, context.soulMaxBlood - context.soulBlood);
        context.maskBlood -= transferAmount;
        context.soulBlood += actualHeal;
        results.maskDamage = transferAmount;
        results.soulHeal = actualHeal;
        
        if (context.maskBlood <= 0) {
          context.maskBlood = 0;
          context.maskBroken = true;
        }
      } else {
        // Normal soul heal
        const healAmount = Math.min(card.heal_soul, context.soulMaxBlood - context.soulBlood);
        context.soulBlood += healAmount;
        results.soulHeal = healAmount;
      }
    }

    // Void card (exhaust/banish after use)
    if (card.void_after_use) {
      results.voidCard = true;
    }

    return results;
  }

  // Get buffed value based on card source
  getBuffedValue(baseValue, source) {
    if (baseValue === 0) return 0;
    
    let buff = 0;
    if (source === 'mask') buff = this.statusEffects.mask_buff;
    else if (source === 'soul') buff = this.statusEffects.soul_buff;
    else if (source === 'scar') buff = this.statusEffects.scar_buff;
    
    return baseValue + buff;
  }

  // Process turn start effects
  processTurnStart(context) {
    const results = {
      poisonDamage: 0,
      energyGain: 0
    };

    // Apply poison damage
    if (this.statusEffects.poison > 0) {
      const poisonDmg = this.statusEffects.poison * 2;
      context.soulBlood -= poisonDmg;
      results.poisonDamage = poisonDmg;
      
      // Reduce poison stack by 1
      this.statusEffects.poison = Math.max(0, this.statusEffects.poison - 1);
    }

    // Apply energy modifier
    if (this.statusEffects.energy_next !== 0) {
      results.energyGain = this.statusEffects.energy_next;
      context.energy = Math.max(0, context.energy + this.statusEffects.energy_next);
      this.statusEffects.energy_next = 0; // Reset after applying
    }

    return results;
  }

  // Process enemy turn start effects
  processEnemyTurnStart(context, enemyStatusEffects) {
    const results = {
      poisonDamage: 0,
      stunned: false
    };

    // Check if stunned
    if (enemyStatusEffects.stunned) {
      results.stunned = true;
      enemyStatusEffects.stunned = false; // Clear stun
      return results;
    }

    // Apply poison damage to enemy
    if (enemyStatusEffects.poison > 0) {
      const poisonDmg = enemyStatusEffects.poison * 2;
      context.enemyBlood -= poisonDmg;
      results.poisonDamage = poisonDmg;
      
      // Reduce poison stack by 1
      enemyStatusEffects.poison = Math.max(0, enemyStatusEffects.poison - 1);
    }

    return results;
  }

  // Get current status effects for display
  getStatusEffects() {
    return { ...this.statusEffects };
  }

  // Reset effects (for new combat)
  reset() {
    this.statusEffects = {
      poison: 0,
      energy_next: 0,
      mask_buff: 0,
      soul_buff: 0,
      scar_buff: 0,
      stunned: false
    };
  }
}
