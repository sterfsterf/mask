// Procedural map generator with seeded RNG
export class MapGenerator {
  constructor(seed) {
    this.seed = seed;
    this.rng = this.createSeededRNG(seed);
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

  /**
   * Generate a branching node map with layers
   * @param {number} numLayers - Number of layers (default 20)
   * @returns {Array} Array of node objects with connections and positions
   */
  generateMap(numLayers = 20) {
    const nodes = [];
    let nodeId = 0;

    // Node type weights (higher = more common)
    const nodeTypeWeights = [
      { value: 'battle', weight: 50 },      // Very common
      { value: 'mask_shop', weight: 15 },   // Uncommon
      { value: 'shrine', weight: 15 },      // Uncommon
      { value: 'void', weight: 5 },         // Rare
      { value: 'mystery', weight: 15 }      // Uncommon
    ];
    
    const enemyTypes = ['weak_shadow', 'goblin', 'orc_warrior'];

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

        // Add enemy for battle nodes
        if (nodeType === 'battle') {
          node.enemy = this.choice(enemyTypes);
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

      // Connect previous layer to current layer based on spatial proximity
      previousLayer.forEach(prevNode => {
        // Find 1-3 closest nodes in current layer
        const distances = currentLayerNodes.map(currNode => ({
          id: currNode.id,
          distance: Math.abs(currNode.x - prevNode.x)
        }));
        
        // Sort by distance
        distances.sort((a, b) => a.distance - b.distance);
        
        // Connect to 1-3 closest nodes (prefer 2)
        const numConnections = Math.min(
          currentLayerNodes.length,
          this.randInt(1, 3)
        );
        
        const connections = distances.slice(0, numConnections).map(d => d.id);
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

    // Add boss node at final layer
    const bossNode = {
      id: nodeId++,
      type: 'battle',
      name: 'BOSS',
      enemy: 'dark_knight',
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
