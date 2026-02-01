# Card Effect System

## Overview
Cards can now have multiple effects that stack and interact. The system is modular - cards can combine any effects to create interesting gameplay.

## Card Properties

### Basic Properties
- `damage` - Deal damage to target
- `block` - Gain block
- `self_damage` - Take damage when playing the card
- `health_cost` - Health cost to play (for scar cards)

### Status Effects
- `poison` - Apply poison stacks to target (each stack = 2 dmg/turn, reduces by 1/turn)
- `energy_next` - Gain/lose energy next turn (can be negative)
- `stun` - Stun enemy, they skip their next turn

### Buffs (Permanent for combat)
- `buff_mask` - All mask cards gain +N damage/block
- `buff_soul` - All soul cards gain +N damage/block  
- `buff_scar` - All scar cards gain +N damage/block

### Healing
- `heal_mask` - Restore mask HP
- `heal_soul` - Restore soul HP

### Special
- `void_after_use` - Card is banished to void after playing (one-time use)

## Card Types
- `attack` - Deals damage
- `defend` - Gains block
- `skill` - Utility effects (buffs, heals, etc)
- `status` - Usually unplayable debuff cards

## Example Cards

### Poison Build
```json
{
  "id": "venom_strike",
  "name": "Venom Strike",
  "cost": 1,
  "type": "attack",
  "damage": 4,
  "poison": 2,
  "description": "Deal 4 damage Apply 2 poison"
}
```

### Energy Manipulation
```json
{
  "id": "adrenaline",
  "name": "Adrenaline",
  "cost": 0,
  "type": "skill",
  "energy_next": 2,
  "description": "Gain 2 energy next turn"
}
```

### Buff Synergies
```json
{
  "id": "empower_mask",
  "name": "Empower Mask",
  "cost": 1,
  "type": "skill",
  "buff_mask": 2,
  "description": "Mask cards gain +2 this combat"
}
```

### One-Time Power Moves
```json
{
  "id": "desperate_strike",
  "name": "Desperate Strike",
  "cost": 0,
  "type": "attack",
  "damage": 18,
  "self_damage": 6,
  "void_after_use": true,
  "description": "Deal 18 damage Take 6 damage Void"
}
```

### Combo Effects
```json
{
  "id": "poisoned_defense",
  "name": "Poisoned Defense",
  "cost": 1,
  "type": "defend",
  "block": 6,
  "poison": 1,
  "description": "Gain 6 block Apply 1 poison"
}
```

## How Buffs Work
- Buffs stack permanently for the entire combat
- They modify damage/block values based on card source
- Example: If you have `buff_mask: 2` and play a mask card with 10 damage, it deals 12
- Buffs affect all cards from that source (mask/soul/scar)

## How Poison Works
- Poison stacks accumulate (poison: 3 + poison: 2 = 5 poison)
- At start of turn, take damage = stacks × 2 HP
- After damage, stacks reduce by 1
- Example: 5 poison → take 10 damage → reduce to 4 poison

## How Stun Works
- Enemy skips their entire turn
- They still take poison damage at turn start
- Intent is not executed
- Clears after skipping the turn

## Enemy Usage
Enemies can also use these effects! The EffectManager handles both player and enemy status tracking separately.
