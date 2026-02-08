// Procedural map generator with seeded RNG
export class MapGenerator {
  constructor(seed, enemyConfig) {
    this.seed = seed;
    this.rng = this.createSeededRNG(seed);
    this.enemyConfig = enemyConfig;
    
    // Select dominant faction for this run
    this.dominantFaction = this.selectDominantFaction();
    this.secondaryFaction = this.selectSecondaryFaction();
    
    console.log(`🎯 Run factions: ${this.dominantFaction} (dominant), ${this.secondaryFaction} (secondary)`);
  }

  // Seeded RNG based on mulberry32
  createSeededRNG(seed) {
    let state = seed;
    return () => {
      state |= 0;
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Choose random element from array
  choice(array) {
    return array[Math.floor(this.rng() * array.length)];
  }

  // Weighted choice - choose based on weights
  weightedChoice(options) {
    const totalWeight = options.reduce((sum, opt) => sum + opt.weight, 0);
    let roll = this.rng() * totalWeight;
    
    for (const option of options) {
      roll -= option.weight;
      if (roll <= 0) {
        return option.value;
      }
    }
    
    return options[0].value; // Fallback
  }

  // Choose random int between min and max (inclusive)
  randInt(min, max) {
    return Math.floor(this.rng() * (max - min + 1)) + min;
  }

  // Shuffle array
  shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  // Select dominant faction (60% of enemies)
  selectDominantFaction() {
    const factions = ['purifier', 'clockwork', 'hive', 'refined'];
    return this.choice(factions);
  }
  
  // Select secondary faction (30% of enemies)
  selectSecondaryFaction() {
    const factions = ['purifier', 'clockwork', 'hive', 'refined'].filter(f => f !== this.dominantFaction);
    return this.choice(factions);
  }
  
  // Get enemy for battle node based on layer and faction distribution
  getEnemyForLayer(layer, totalLayers) {
    // Determine faction for this enemy (60% dominant, 40% secondary)
    const factionRoll = this.rng();
    const faction = factionRoll < 0.6 ? this.dominantFaction : this.secondaryFaction;
    
    // Determine tier based on layer
    const progress = layer / totalLayers;
    let tier;
    
    if (progress < 0.35) {
      tier = 1; // Early game
    } else if (progress < 0.75) {
      tier = this.rng() < 0.7 ? 2 : 1; // Mid game (mostly tier 2, some tier 1)
    } else {
      tier = this.rng() < 0.8 ? 3 : 2; // Late game (mostly tier 3, some tier 2)
    }
    
    // Get enemies matching faction and tier
    const matchingEnemies = this.enemyConfig.enemies.filter(e => 
      e.faction === faction && e.tier === tier
    );
    
    if (matchingEnemies.length === 0) {
      // Fallback to any enemy of that tier
      const tierFallback = this.enemyConfig.enemies.filter(e => e.tier === tier);
      return tierFallback.length > 0 ? this.choice(tierFallback).id : 'crusader_scout';
    }
    
    return this.choice(matchingEnemies).id;
  }
  
  // Get boss enemy from dominant faction
  getBossEnemy() {
    const bosses = this.enemyConfig.enemies.filter(e => 
      e.faction === this.dominantFaction && e.tier === 4
    );
    
    return bosses.length > 0 ? this.choice(bosses).id : 'the_saint';
  }

  /**
   * Generate a branching node map with layers
   * @param {number} numLayers - Number of layers (default 20)
   * @returns {Array} Array of node objects with connections and positions
   */
  generateMap(numLayers = 20) {
    const nodes = [];
    let nodeId = 0;

    // Start with void at layer 0
    nodes.push({
      id: nodeId++,
      type: 'void',
      name: 'Starting Void',
      connections: [],
      layer: 0,
      x: 0.5 // Center position (0-1)
    });

    // Build layers (each layer has 1-4 nodes)
    let previousLayer = [{ id: 0, x: 0.5 }]; // Start node

    for (let layer = 1; layer < numLayers; layer++) {
      const currentLayerNodes = [];
      const numNodes = this.randInt(1, 4); // 1-4 nodes per layer

      // Calculate void weight based on layer progress (0 to 1)
      const progress = layer / (numLayers - 1); // 0 at start, 1 at boss
      // Start with weight 2, increase to 20 near boss
      const voidWeight = 2 + (progress * progress * 18); // Quadratic growth
      
      // Node type weights (adjusted per layer)
      const nodeTypeWeights = [
        { value: 'battle', weight: 50 },      // Very common
        { value: 'mask_shop', weight: 15 },   // Uncommon
        { value: 'shrine', weight: 15 },      // Uncommon
        { value: 'void', weight: voidWeight }, // Increases near boss
        { value: 'mystery', weight: 15 }      // Uncommon
      ];

      // Calculate x positions for this layer (spread evenly)
      const positions = [];
      for (let i = 0; i < numNodes; i++) {
        const x = (i + 1) / (numNodes + 1); // Evenly spaced 0-1
        positions.push(x);
      }

      // Create nodes with positions
      for (let i = 0; i < numNodes; i++) {
        const nodeType = this.weightedChoice(nodeTypeWeights);
        const node = {
          id: nodeId++,
          type: nodeType,
          connections: [],
          layer,
          x: positions[i]
        };

        // Add enemy for battle nodes using faction system
        if (nodeType === 'battle') {
          node.enemy = this.getEnemyForLayer(layer, numLayers);
        }

        nodes.push(node);
        currentLayerNodes.push({ id: node.id, x: positions[i] });
      }

      // RULE: Second row (layer 1) must have at least one mask shop
      if (layer === 1) {
        const hasMaskShop = currentLayerNodes.some(n => nodes[n.id].type === 'mask_shop');
        if (!hasMaskShop) {
          // Replace a random node with mask_shop
          const randomNode = this.choice(currentLayerNodes);
          const nodeToReplace = nodes[randomNode.id];
          nodeToReplace.type = 'mask_shop';
          delete nodeToReplace.enemy;
          console.log(`🎭 Enforced mask shop in layer 1 (replaced node ${randomNode.id})`);
        }
      }

      // Connect previous layer to current layer (only to adjacent nodes)
      previousLayer.forEach(prevNode => {
        // Find adjacent nodes (straight, one up, or one down)
        // Define adjacency: within reasonable x-distance threshold
        const adjacentNodes = currentLayerNodes.filter(currNode => {
          const xDiff = Math.abs(currNode.x - prevNode.x);
          // Adjacent means within ~0.4 units of x-space (handles up to 4 nodes per layer)
          return xDiff < 0.4;
        });
        
        // Sort by distance
        adjacentNodes.sort((a, b) => {
          const aDist = Math.abs(a.x - prevNode.x);
          const bDist = Math.abs(b.x - prevNode.x);
          return aDist - bDist;
        });
        
        // Connect to 1-2 adjacent nodes (prefer straight and one diagonal)
        const numConnections = Math.min(
          adjacentNodes.length,
          this.randInt(1, 2)
        );
        
        const connections = adjacentNodes.slice(0, numConnections).map(n => n.id);
        nodes[prevNode.id].connections = connections;
      });

      // Ensure all current layer nodes are reachable
      currentLayerNodes.forEach(currNode => {
        const isReachable = previousLayer.some(
          prevNode => nodes[prevNode.id].connections.includes(currNode.id)
        );
        
        if (!isReachable) {
          // Connect to closest previous node
          const distances = previousLayer.map(prevNode => ({
            id: prevNode.id,
            distance: Math.abs(prevNode.x - currNode.x)
          }));
          distances.sort((a, b) => a.distance - b.distance);
          const closestPrevNode = distances[0].id;
          
          if (!nodes[closestPrevNode].connections.includes(currNode.id)) {
            nodes[closestPrevNode].connections.push(currNode.id);
          }
        }
      });

      previousLayer = currentLayerNodes;
    }

    // Add boss node at final layer (from dominant faction)
    const bossEnemy = this.getBossEnemy();
    const bossNode = {
      id: nodeId++,
      type: 'battle',
      name: 'BOSS',
      enemy: bossEnemy,
      connections: [],
      layer: numLayers,
      x: 0.5,
      isBoss: true
    };
    nodes.push(bossNode);

    // Connect all final layer nodes to boss
    previousLayer.forEach(prevNode => {
      nodes[prevNode.id].connections.push(bossNode.id);
    });

    console.log(`🗺️ Generated map with ${nodes.length} nodes across ${numLayers + 1} layers`);
    console.log(`👑 Boss: ${bossEnemy}`);
    return nodes;
  }

  /**
   * Get visual representation of the map for debugging
   */
  visualizeMap(nodes) {
    const layers = {};
    nodes.forEach(node => {
      if (!layers[node.layer]) layers[node.layer] = [];
      layers[node.layer].push(node);
    });

    let visual = '\n=== MAP STRUCTURE ===\n';
    Object.keys(layers).sort((a, b) => a - b).forEach(layer => {
      visual += `\nLayer ${layer}: `;
      visual += layers[layer].map(n => `[${n.id}:${n.type}]`).join(' ');
    });
    
    console.log(visual);
  }
}
