# Debug System Documentation

## Debug Menu

A dev tool menu appears in the top-right corner with a green "🛠️ DEBUG" button.

### Features

1. **3D Model Preview** - Opens a full-screen 3D viewport to preview all entities
2. **+1000 Coins** - Instant currency for testing
3. **+1000 Energy** - Instant dark energy for testing

## 3D Preview Viewport

Click "🎨 3D Model Preview" to open the viewport.

### Categories

- **MINIONS** - Preview all minion types (Shadow, Flesh, Bone)
- **ENEMIES** - Preview all enemy models (Weak Shadow, Goblin, Orc Warrior, Dark Knight)
- **MASKS** - Preview mask models by rarity (Common, Rare, Legendary)

### Controls

- Click any model name in the list to preview it
- Models auto-rotate and bob
- Right panel shows entity stats from config files

## Prefab System

All entities use a prefab-based architecture:

```javascript
// Get prefab manager
const prefabManager = new PrefabManager();

// Instantiate a model
const shadowMinion = prefabManager.instantiate('minion_shadow');
scene.add(shadowMinion);

// Available prefabs:
// - minion_shadow, minion_flesh, minion_bone
// - enemy_weak_shadow, enemy_goblin, enemy_orc_warrior, enemy_dark_knight
// - mask_common, mask_rare, mask_legendary
```

### Creating New Prefabs

1. Extend `Prefab3D` class
2. Override `create()` method
3. Return a THREE.Group or THREE.Mesh
4. Register in `PrefabManager.initPrefabs()`

Example:

```javascript
export class MyCustomPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    // Build your 3D model here
    return group;
  }
}

// In PrefabManager:
this.prefabs.set('custom_entity', new MyCustomPrefab('custom', {}));
```

## Config Integration

The preview viewport pulls stats directly from config files:

- **Minions**: `config/minion_types.json`
- **Enemies**: `config/enemies.json`
- **Masks**: `config/masks.json`

Edit these files to update entity properties (HP, attack, defense, rewards, etc).

## Accessing Debug Tools

```javascript
// From browser console:
window.debugMenu     // DebugMenu instance
window.debugPreview  // PreviewViewport instance
window.game          // Game instance
window.ui            // UI instance
```

## File Structure

```
src/
  debug/
    DebugMenu.js       - Top-right debug menu UI
    PreviewViewport.js - 3D viewport with Three.js
    Prefab3D.js        - Prefab system & all entity models
```
