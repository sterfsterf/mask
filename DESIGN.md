# MASK - Design Document

## Core Concept
Roguelike deck-builder where you summon minions from the void, craft masks with traits, and battle through enemy tracks. Masks = temporary power that breaks under failure. Your minions carry the scars.

---

## Tech Stack
- **Engine**: Three.js
- **Target**: Mobile landscape (primary)
- **Configs**: JSON/YAML for all game data (enemies, minions, traits, loot tables)

---

## Core Systems

### 1. Minions
**Base Stats:**
- Name (procedural/predefined)
- Type (e.g., Shadow, Flesh, Bone, Void)
- Blood (Health)
- Attack
- Defense
- Starter Trait (1)

**Rules:**
- Traits can modify base stats
- Minions can equip 1 mask at a time
- If mask breaks → gain permanent negative trait
- Death = permanent (unless you have dark energy to resummon)
- No roster limit - summon as many as you can afford
- After battle, minion gains "Tired" card (do-nothing card, deck clog)

**Summoning:**
- Flat dark energy cost
- Pulls from weighted "marble bag" rarity table
- Minion type/stats determined by rarity roll

### 2. Masks
**Properties:**
- Type (matches minion types or universal)
- Traits (1-3, each trait = 1 card)
- Durability (implicit - breaks on battle loss)
- Binding Duration (X battles)

**Binding System:**
- Masks bind for N battles
- Early removal costs: Blood (scales with remaining battles)
- Removing mask = remove trait cards from deck
- Applying mask = add trait cards to deck

**Crafting:**
- Cost: Tiered by rarity
  - Common: 3 coins
  - Rare: 10 coins
  - Legendary: 30 coins
- Each pile pulls random mask of that rarity
- Source: Loot tables per rarity (configurable)

### 3. Traits
**Types:**
- **Positive**: Gained on battle victory (choose 1 of 3)
- **Negative**: Gained on mask break (forced choice of 1 from 3)

**Function:**
- Each trait = exactly 1 card added to minion's deck
- Can modify stats (Attack +2, Blood -1, etc.)
- Can add special effects (TODO: define later)

**Storage:**
- Config file with all trait definitions
- Categories: Combat, Defensive, Utility, Curse

### 4. Combat (Card Battle System)
**Deck Composition:**
- Each minion has their own deck
- Deck = Minion base cards + Mask trait cards + Negative trait cards (if any)
- Tired cards added after battle (debuff - does nothing, clogs deck)

**Battle Flow:**
- Turn-based, 1v1
- Starting hand: 5 cards
- Starting energy: 3 per turn (refreshes each round)
- Cards have energy costs
- Draw/discard mechanics: Standard deck-builder (draw until hand full, discard pile shuffles back when deck empty)

**Card Types:**
- Attack
- Defend
- Special

**Victory/Defeat:**
- Win → Choose positive trait for mask (1 of 3), gain dark energy (3) + coins, minion gets "Tired" card added to deck
- Lose → Mask breaks, choose negative trait for minion (1 of 3)

### 5. Enemy System
**Enemy Track:**
- Node-based progression
- Node types: Battle, Random Event (TODO)
- Configurable via JSON
- Players can preview/scout enemies before choosing minion

**Battle Selection:**
- View enemy stats/type before committing
- Choose 1 minion from roster (non-tired preferred)
- 1v1 battle only

**Enemy Stats:**
- Type
- Blood
- Attack
- Defense
- AI Pattern (simple - basic attack priority at first)

**Rewards:**
- Dark Energy: 3 (flat)
- Coins: Based on enemy type/difficulty

### 6. Currencies
- **Dark Energy**: Summon minions from void (flat cost per summon)
- **Coins**: Craft masks (tiered costs by rarity)
- **Blood**: Early mask removal cost (minion resource)

**Starting Resources:**
- Dark Energy: Enough for 1 summon
- Coins: Enough for 1 common mask (3 coins)
- First battle: Easy enemy (tutorial-level)

---

## Core Loop

```
START
  ↓
1. Summon Minion (Dark Energy) → If no energy + no minions = GAME OVER
  ↓
2. Craft Mask (Coins)
  ↓
3. Bind Mask to Minion (free, locks for N battles)
  ↓
4. Choose Next Battle (preview enemies)
  ↓
5. Select Minion → Battle
  ↓
  ├─ WIN: Choose Positive Trait → Rewards → HOME
  └─ LOSE: Mask Breaks → Choose Negative Trait → HOME
  ↓
6. Home Screen
  ├─ Manage Minions/Masks
  ├─ Craft New Masks
  ├─ Summon New Minion
  └─ Choose Next Battle → (repeat)
```

---

## UI/UX Requirements

### Home Screen
- Minion roster (visual)
- Current masks inventory
- Currency display (Dark Energy, Coins)
- Battle track progress
- Action buttons: Craft, Summon, Battle

### Battle Screen
- Enemy display (top)
- Your minion + mask (bottom)
- Hand of cards (bottom)
- Health bars
- Energy/resource display

### Mobile Landscape Optimization
- Touch-friendly card interactions
- Large tap targets
- Minimal text, icon-heavy
- Swipe gestures for card play

---

## Config Files Structure

### `minion_types.json`
```json
{
  "summon_cost": 5,
  "rarity_table": [
    { "rarity": "common", "weight": 60 },
    { "rarity": "rare", "weight": 30 },
    { "rarity": "legendary", "weight": 10 }
  ],
  "types": [
    {
      "id": "shadow",
      "rarity": "common",
      "base_blood": 30,
      "base_attack": 8,
      "base_defense": 3,
      "starter_traits": ["swift_strike"],
      "base_cards": ["slash", "dodge", "shadow_step"]
    }
  ]
}
```

### `masks.json`
```json
{
  "loot_tables": {
    "basic": [
      {
        "type": "shadow",
        "traits": ["rage", "thorns"],
        "weight": 10,
        "bind_duration": 3
      }
    ]
  }
}
```

### `traits.json`
```json
{
  "traits": [
    {
      "id": "rage",
      "name": "Rage",
      "type": "positive",
      "stat_mods": { "attack": 3, "defense": -1 },
      "card": "rage_card"
    }
  ]
}
```

### `enemies.json`
```json
{
  "tracks": [
    {
      "id": "tutorial_track",
      "nodes": [
        { "type": "battle", "enemy": "weak_goblin" },
        { "type": "random" },
        { "type": "battle", "enemy": "strong_orc" }
      ]
    }
  ],
  "enemies": [
    {
      "id": "weak_goblin",
      "type": "goblin",
      "blood": 20,
      "attack": 5,
      "defense": 2,
      "coin_reward": 5
    }
  ]
}
```

### `cards.json`
```json
{
  "cards": [
    {
      "id": "slash",
      "name": "Slash",
      "cost": 1,
      "type": "attack",
      "damage": 6
    },
    {
      "id": "tired",
      "name": "Tired",
      "cost": 1,
      "type": "status",
      "effect": "none",
      "description": "Does nothing. Clogs your deck."
    }
  ]
}
```

---

## MVP Scope (Phase 1)

### Must Have
- [ ] 1 minion type with 3 base cards
- [ ] 3-5 positive traits
- [ ] 3 negative traits
- [ ] 1 mask type with basic traits
- [ ] 3 enemy types
- [ ] 1 short enemy track (5 nodes)
- [ ] Basic card battle (attack/defend only)
- [ ] Summon, craft, bind mechanics
- [ ] Victory/defeat flow with trait selection
- [ ] Config loading system

### Nice to Have (Phase 2)
- [ ] Multiple minion types
- [ ] 10+ traits per category
- [ ] Complex card effects
- [ ] Random events on track
- [ ] Mask inventory management
- [ ] Procedural minion names
- [ ] Better AI patterns
- [ ] Visual effects in Three.js

---

## Open Questions / TODO
1. ~~Card energy system~~ ✓ Per-turn energy (3), refreshes each round
2. ~~Starting resources~~ ✓ Enough for 1 summon + 1 common mask
3. ~~Enemy AI~~ ✓ Simple attack priority to start
4. ~~Minion roster cap~~ ✓ Unlimited (economy-gated)
5. Mask inventory limit? (can craft but not equip immediately?)
6. Blood cost formula for early mask removal? (linear? exponential?)
7. ~~Visual style~~ ✓ Tribal low-poly, dark + bright accents
8. Sound design approach? (ambient dark? tribal drums?)
9. Dark energy summon cost - exact amount? (3? 5?)
10. Tired card mechanics - removed after rest? Stays forever? Multiple stack?
11. Enemy reward coin amounts - formula based on difficulty?
12. Discard/draw timing - end of turn? Start of turn?

---

## Art/Visual Direction
- **Theme**: Tribal, dark, gritty, occult void aesthetic
- **Color Palette**: 
  - Base: Dark murky colors (deep grays, blacks, dark purples/blues)
  - Accents: Bright red, glowing white, occasional vibrant pops
- **Masks**: Central visual focus - tribal/primitive designs, ornate, intimidating
- **Minions**: Distinct silhouettes per type, shadowy forms
- **UI**: Minimal, dark with high-contrast accents for readability
- **3D Style**: Low-poly tribal aesthetic with dramatic lighting (good mobile performance)
- **Camera**: Fixed perspective, angled top-down for card game view with 3D character models

---

## Development Phases

### Phase 1: Prototype (Config + Core Loop)
- Config parser/loader
- Basic minion/mask/enemy data
- Simple combat (no visuals, just logic)
- Core loop validation

### Phase 2: Visual MVP
- Three.js scene setup
- Mobile landscape UI
- Card visuals and interaction
- Basic animations

### Phase 3: Content
- Full trait library
- Multiple tracks
- Balancing pass
- Polish

---

**Let's fucking build this.**
