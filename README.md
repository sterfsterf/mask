# 🎭 MASK

Roguelike deck-builder where you summon minions, craft masks with traits, and battle through a branching node map.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3001 (or whatever port vite assigns)

## Core Loop

1. Start with **5 ⚡ dark energy + 5 💰 coins**, no minions
2. First node is always a **Void Gate** - summon your first minion
3. Navigate a **branching node map** with different encounters
4. **Fight** with cards from minion + mask traits
5. **Win** → add positive trait to mask | **Lose** → mask breaks, minion gets cursed
6. Choose your path through the void

## Node Types

### 🌀 Void Gate
- Summon new minions (5 ⚡)
- Starting location gives you your first minion

### 🎭 Mask Vendor
- Buy masks from curated selection
- 3 common (3 💰), 2 rare (10 💰), 1 legendary (30 💰)
- Equip immediately to any minion

### ✨ Shrine
- **Cleansing**: Remove negative trait
- **Blessing**: Add positive trait to mask
- **Dark**: +3 dark energy
- **Coin**: +10 coins
- **Healing**: Full HP restore
- **Blood**: +5 max HP

### ⚔️ Battle
- Fight enemies for rewards
- Earn dark energy (1/2/5) and coins based on difficulty

### ❓ Mystery
- Could be any node type
- Reveals on entry

## Combat

- 5 card hand, 3 energy per turn
- Each minion has their own deck (base cards + mask trait cards + negative traits)
- Standard deck-builder: draw/discard/shuffle mechanics
- After battle, minion gets "Tired" card (clogs deck)

## Mask System

- **Bind duration**: How many battles before free removal
- Early removal costs blood (3 per remaining battle)
- Masks only break on defeat
- Removed masks can be re-equipped

## Config Files

All game data lives in `/config/*.json`:
- `cards.json` - card definitions
- `traits.json` - trait definitions + trait cards
- `minion_types.json` - minion types, stats, starter traits
- `masks.json` - mask loot tables by rarity
- `enemies.json` - node map structure + enemy definitions
- `shrines.json` - shrine types and effects

Edit these to modify game balance, add content, etc.

## Tech

- Three.js for visuals
- Vite for dev/build
- Pure JS, no framework bloat

---

**Let's fucking go.**
