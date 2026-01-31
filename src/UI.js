// UI Manager - handles all DOM/UI interactions
import * as THREE from 'three';
import { PrefabManager } from './debug/Prefab3D.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export class UI {
  constructor(game) {
    this.game = game;
    this.currentScreen = 'map';
    this.selectedSoul = null;
    this.selectedMask = null;
    this.pendingSoul = null;
    this.prefabManager = new PrefabManager();
    this.battleScene = null;
    this.battleAnimationId = null;
    
    this.createUI();
  }

  createUI() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div id="currency-hud" class="currency-hud"></div>
      <div id="battle-canvas-container"></div>
      <div id="ui-overlay">
        <div id="map-screen" class="screen"></div>
        <div id="node-screen" class="screen hidden"></div>
        <div id="battle-screen" class="screen hidden"></div>
        <div id="trait-choice-screen" class="screen hidden"></div>
      </div>
    `;

    this.addStyles();
    this.updateCurrencyHUD();
    this.renderMap();
  }

  toggleDebug() {
    console.log('=== DEBUG INFO ===');
    console.log('Game State:', this.game.state);
    console.log('Current Node:', this.game.getCurrentNode());
    console.log('Souls:', this.game.getSouls());
    console.log('Completed Nodes:', this.game.state.completedNodes);
    console.log('Config:', this.game.config);
    
    // Quick cheats
    if (confirm('Add 10 dark energy + 10 coins?')) {
      this.game.state.darkEnergy += 10;
      this.game.state.coins += 10;
      this.updateCurrencyHUD();
      console.log('Resources added');
    }
  }

  updateCurrencyHUD() {
    const currencies = this.game.getCurrencies();
    const hud = document.getElementById('currency-hud');
    hud.innerHTML = `
      <span class="currency dark-energy">⚡ ${currencies.darkEnergy}</span>
      <span class="currency coins">💰 ${currencies.coins}</span>
    `;
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #ui-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
      }

      .screen {
        pointer-events: all;
        width: 100%;
        height: 100%;
        padding: 20px;
        overflow-y: auto;
      }

      .screen.hidden {
        display: none;
      }

      .panel {
        background: rgba(10, 10, 10, 0.95);
        border: 2px solid #ff0033;
        padding: 15px;
        margin: 10px 0;
        border-radius: 4px;
      }

      #battle-canvas-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1;
        display: none;
      }

      #battle-canvas-container.active {
        display: block;
      }

      #ui-overlay {
        position: relative;
        z-index: 10;
        pointer-events: none;
      }

      #ui-overlay > * {
        pointer-events: auto;
      }

      .currency-hud {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 200;
        display: flex;
        gap: 15px;
        background: rgba(10, 10, 10, 0.9);
        border: 2px solid #ff0033;
        padding: 10px 15px;
        border-radius: 4px;
      }

      .currency {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #fff;
        font-size: 18px;
        font-weight: bold;
      }

      .currency.dark-energy { color: #a855f7; }
      .currency.coins { color: #fbbf24; }

      button {
        background: #1a1a1a;
        border: 2px solid #ff0033;
        color: #fff;
        padding: 10px 20px;
        margin: 5px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        transition: all 0.2s;
      }

      button:hover {
        background: #ff0033;
        transform: scale(1.05);
      }

      button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }

      .soul-card {
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #666;
        padding: 12px;
        margin: 8px 0;
        cursor: pointer;
        transition: border-color 0.2s;
        display: flex;
        gap: 15px;
        align-items: center;
      }

      .soul-preview {
        border: 2px solid #444;
        image-rendering: pixelated;
        flex-shrink: 0;
      }

      .soul-info {
        flex: 1;
      }

      .soul-card:hover {
        border-color: #ff0033;
      }

      .soul-card.selected {
        border-color: #fff;
        background: rgba(50, 50, 50, 0.9);
      }

      .card {
        background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
        border: 2px solid #ff0033;
        padding: 15px;
        margin: 5px;
        min-width: 120px;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-block;
        vertical-align: top;
      }

      .card:hover {
        transform: translateY(-10px);
        border-color: #fff;
        box-shadow: 0 10px 20px rgba(255, 0, 51, 0.5);
      }

      .card.attack { border-color: #ff0033; }
      .card.defend { border-color: #3b82f6; }
      .card.status { border-color: #6b7280; }

      .card-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #fff;
      }

      .card-cost {
        color: #a855f7;
        font-size: 12px;
        margin-bottom: 8px;
      }

      .card-desc {
        font-size: 11px;
        color: #999;
      }

      .hand {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        max-width: 90%;
        overflow-x: auto;
        z-index: 50;
      }

      .combat-info {
        display: flex;
        justify-content: space-between;
        position: fixed;
        top: 20px;
        left: 20px;
        right: 20px;
        z-index: 50;
        pointer-events: none;
      }

      .combatant {
        flex: 1;
        pointer-events: auto;
      }

      .health-bar-floating {
        background: rgba(10, 10, 10, 0.9);
        border: 2px solid #666;
        padding: 10px;
        border-radius: 4px;
        max-width: 250px;
      }

      .combatant canvas {
        margin: 0 auto 10px;
        display: block;
        border: 2px solid #666;
        image-rendering: pixelated;
      }

      .health-bar {
        background: #333;
        height: 20px;
        border: 2px solid #666;
        position: relative;
        margin: 10px 0;
      }

      .health-fill {
        background: linear-gradient(90deg, #ff0033 0%, #ff6666 100%);
        height: 100%;
        transition: width 0.3s;
      }

      .block-badge {
        display: inline-block;
        background: #3b82f6;
        color: #fff;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 12px;
        margin-left: 10px;
      }

      h2 {
        color: #ff0033;
        margin: 10px 0;
      }

      h3 {
        color: #fff;
        margin: 10px 0;
      }

      .trait-choice {
        background: rgba(30, 30, 30, 0.95);
        border: 2px solid #ff0033;
        padding: 20px;
        margin: 10px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .trait-choice:hover {
        border-color: #fff;
        background: rgba(50, 50, 50, 0.95);
        transform: scale(1.05);
      }

      .node-button {
        background: rgba(30, 30, 30, 0.95);
        border: 3px solid #ff0033;
        padding: 20px;
        margin: 10px;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 200px;
        display: inline-block;
      }

      .node-button:hover {
        border-color: #fff;
        transform: scale(1.05);
        box-shadow: 0 0 20px rgba(255, 0, 51, 0.5);
      }

      .node-button.current {
        border-color: #a855f7;
        background: rgba(50, 30, 70, 0.95);
      }

      .mask-shop-grid {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;
        margin: 20px 0;
      }

      .mask-shop-card {
        width: 120px;
        border: 3px solid;
        padding: 8px;
        background: rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }

      .mask-shop-card.legendary { border-color: #fbbf24; }
      .mask-shop-card.rare { border-color: #a855f7; }
      .mask-shop-card.common { border-color: #666; }

      .mask-shop-card.sold-out {
        opacity: 0.5;
        position: relative;
      }

      .mask-shop-card.sold-out::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: repeating-linear-gradient(
          45deg,
          transparent,
          transparent 10px,
          rgba(255, 0, 0, 0.1) 10px,
          rgba(255, 0, 0, 0.1) 20px
        );
        pointer-events: none;
      }

      .sold-btn {
        background: #666 !important;
        color: #999 !important;
        cursor: not-allowed !important;
      }

      .mask-image {
        width: 80px;
        height: 80px;
        object-fit: contain;
        image-rendering: pixelated;
      }

      .mask-placeholder {
        width: 80px;
        height: 80px;
      }

      .mask-card-info {
        text-align: center;
        font-size: 11px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .mask-traits {
        font-size: 9px;
        color: #aaa;
      }

      .buy-btn {
        padding: 4px 8px;
        font-size: 10px;
        margin-top: 4px;
      }

      .temp-mask-panel {
        padding: 10px;
        margin-bottom: 15px;
        background: rgba(100, 255, 100, 0.1);
        border: 2px solid #0f0;
        display: flex;
        gap: 8px;
        align-items: center;
        flex-wrap: wrap;
      }

      .mini-btn {
        padding: 4px 8px;
        font-size: 10px;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: #1a1a1a;
        border: 3px solid #ff0033;
        padding: 30px;
        max-width: 400px;
        text-align: center;
      }

      .modal input {
        background: #0a0a0a;
        border: 2px solid #666;
        color: #fff;
        padding: 10px;
        font-family: 'Courier New', monospace;
        font-size: 16px;
        width: 100%;
        margin: 20px 0;
      }

      .modal input:focus {
        border-color: #ff0033;
        outline: none;
      }

      .souls-bar {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.9);
        border-top: 2px solid #ff0033;
        padding: 10px;
        display: flex;
        gap: 10px;
        justify-content: center;
        z-index: 100;
      }

      .soul-card-mini {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #666;
      }

      .soul-preview-mini {
        border: 2px solid #444;
        image-rendering: pixelated;
      }

      .soul-name {
        font-size: 11px;
        font-weight: bold;
      }

      .soul-stats {
        font-size: 10px;
        color: #aaa;
      }

      .has-mask {
        position: absolute;
        top: 4px;
        right: 4px;
        font-size: 14px;
      }

      .is-tired {
        position: absolute;
        top: 4px;
        left: 4px;
        font-size: 14px;
      }
    `;
    document.head.appendChild(style);
  }

  renderMap() {
    const mapScreen = document.getElementById('map-screen');
    const souls = this.game.getSouls();
    const currentNode = this.game.getCurrentNode();
    const availableNodes = this.game.getAvailableNodes();
    const isComplete = this.game.state.isCurrentNodeComplete();

    this.updateCurrencyHUD();

    // Remove old souls bar if exists
    const oldBar = document.querySelector('.souls-bar');
    if (oldBar) oldBar.remove();

    mapScreen.innerHTML = `
      <h2>🎭 MASK - The Void Path</h2>

      ${!isComplete && currentNode ? `
        <div class="panel">
          <h3>Current Location: ${this.getNodeName(currentNode)}</h3>
          <p>${this.getNodeDescription(currentNode)}</p>
        </div>
      ` : ''}

      ${isComplete && availableNodes.length > 0 ? `
        <div class="panel">
          <h3>Choose Your Path</h3>
          ${availableNodes.map(node => `
            <div class="node-button" onclick="window.ui.moveToNode(${node.id})">
              <strong>${this.getNodeName(node)}</strong><br>
              <span style="color: #999; font-size: 12px;">${this.getNodeDescription(node)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${isComplete && availableNodes.length === 0 ? `
        <div class="panel"><h3>🏆 Path Complete!</h3></div>
      ` : ''}
    `;

    // Add souls bar at bottom
    const soulsBar = document.createElement('div');
    soulsBar.className = 'souls-bar';
    soulsBar.innerHTML = `
      ${souls.map(m => `
        <div class="soul-card-mini">
          <canvas class="soul-preview-mini" id="soul-preview-mini-${m.id}" width="80" height="80"></canvas>
          <div class="soul-name">${m.name}</div>
          <div class="soul-stats">❤️${m.blood}/${m.maxBlood}</div>
          ${m.mask ? '<div class="has-mask">🎭</div>' : ''}
          ${m.tired ? '<div class="is-tired">💤</div>' : ''}
        </div>
      `).join('')}
    `;
    document.body.appendChild(soulsBar);

    this.showScreen('map');
    
    // Render soul previews after DOM is updated
    setTimeout(() => {
      souls.forEach(m => this.renderSoulPreview(m, true));
    }, 0);

    // Auto-enter current node if not completed
    if (!isComplete && currentNode) {
      setTimeout(() => this.enterCurrentNode(), 100);
    }
  }

  getNodeName(node) {
    if (!node) return 'Unknown';
    if (node.name) return node.name;
    
    const type = node.type === 'mystery' ? (this.game.state.mysteryRevealed || 'mystery') : node.type;
    
    switch(type) {
      case 'void': return 'Void Gate';
      case 'battle': return 'Battle';
      case 'mask_shop': return 'Mask Vendor';
      case 'shrine': return 'Shrine';
      case 'mystery': return '???';
      default: return node.type;
    }
  }

  getNodeDescription(node) {
    const type = node.type === 'mystery' ? (this.game.state.mysteryRevealed || 'mystery') : node.type;
    
    switch(type) {
      case 'void': return 'Summon souls from the void';
      case 'battle': return 'Combat encounter';
      case 'mask_shop': return 'Buy masks';
      case 'shrine': return 'Receive a blessing';
      case 'mystery': return 'Unknown...';
      default: return '';
    }
  }

  moveToNode(nodeId) {
    this.game.moveToNode(nodeId);
    this.renderMap();
  }

  enterCurrentNode() {
    const isComplete = this.game.state.isCurrentNodeComplete();
    if (isComplete) {
      alert('This node has already been completed!');
      return;
    }
    
    const node = this.game.getCurrentNode();
    const actualType = node.type === 'mystery' ? this.game.state.mysteryRevealed : node.type;
    
    switch(actualType) {
      case 'void':
        this.renderVoidNode();
        break;
      case 'mask_shop':
        this.renderMaskShop();
        break;
      case 'shrine':
        this.renderShrine();
        break;
      case 'battle':
        this.renderBattlePrep();
        break;
    }
  }

  renderVoidNode() {
    const nodeScreen = document.getElementById('node-screen');
    const summonCost = this.game.config.soulConfig.summon_cost;
    const canAfford = this.game.state.darkEnergy >= summonCost;

    this.updateCurrencyHUD();

    nodeScreen.innerHTML = `
      <h2>🌀 Void Gate</h2>
      
      <div class="panel">
        <p>The void whispers... summon a soul to fight for you.</p>
        <p>Cost: ${summonCost} ⚡ Dark Energy</p>
        <button onclick="window.ui.summonSoul()" ${!canAfford ? 'disabled' : ''}>
          Summon Soul
        </button>
      </div>

      <button onclick="window.ui.backToMap()">Leave</button>
    `;

    this.showScreen('node');
  }

  renderMaskShop() {
    const nodeScreen = document.getElementById('node-screen');
    const offering = this.game.state.maskShopOffering;
    const costs = this.game.config.maskConfig.costs;
    const tempMask = this.game.tempMask;
    const souls = this.game.getSouls();
    const coins = this.game.state.coins;
    const soldMasks = this.game.state.soldMasks;

    this.updateCurrencyHUD();

    // Combine all masks into one array with rarity info
    const allMasks = [
      ...offering.legendary.map((m, i) => ({ ...m, rarity: 'legendary', index: i, cost: costs.legendary, sold: soldMasks.legendary.includes(i) })),
      ...offering.rare.map((m, i) => ({ ...m, rarity: 'rare', index: i, cost: costs.rare, sold: soldMasks.rare.includes(i) })),
      ...offering.common.map((m, i) => ({ ...m, rarity: 'common', index: i, cost: costs.common, sold: soldMasks.common.includes(i) }))
    ];

    nodeScreen.innerHTML = `
      <h2>🎭 Mask Vendor</h2>

      ${tempMask ? `
        <div class="panel temp-mask-panel">
          <strong>Purchased: ${tempMask.name}</strong> - Select soul to equip:
          ${souls.map(m => `
            <button class="mini-btn" onclick="window.ui.equipTempMaskTo(${m.id})">
              ${m.name}${m.mask ? ' ⚠️' : ''}
            </button>
          `).join('')}
        </div>
      ` : ''}

      <div class="mask-shop-grid">
        ${allMasks.map(mask => `
          <div class="mask-shop-card ${mask.rarity} ${mask.sold ? 'sold-out' : ''}">
            ${mask.texture ? `
              <img src="${mask.texture}" alt="${mask.name}" class="mask-image">
            ` : `
              <div class="mask-placeholder" style="background: ${
                mask.rarity === 'legendary' ? '#fbbf24' : 
                mask.rarity === 'rare' ? '#a855f7' : '#666'
              }"></div>
            `}
            <div class="mask-card-info">
              <strong>${mask.name}</strong>
              <div class="mask-traits">${mask.traits.join(', ')}</div>
              ${mask.sold ? `
                <button class="buy-btn sold-btn" disabled>SOLD OUT</button>
              ` : `
                <button class="buy-btn" onclick="window.ui.buyMask('${mask.rarity}', ${mask.index})" ${coins < mask.cost ? 'disabled' : ''}>
                  ${mask.cost} 💰
                </button>
              `}
            </div>
          </div>
        `).join('')}
      </div>

      <button onclick="window.ui.backToMap()">Leave</button>
    `;

    this.showScreen('node');
  }

  renderShrine() {
    const nodeScreen = document.getElementById('node-screen');
    const shrine = this.game.state.currentShrine;
    const souls = this.game.getSouls();

    nodeScreen.innerHTML = `
      <h2>✨ ${shrine.name}</h2>
      
      <div class="panel">
        <p>${shrine.description}</p>
        
        ${souls.length > 0 ? `
          <h4>Choose a soul:</h4>
          ${souls.map(m => `
            <button onclick="window.ui.applyShrineEffect(${m.id}, '${shrine.effect}', ${shrine.value || 0})">
              ${m.name}
            </button>
          `).join('')}
        ` : '<p>No souls to bless.</p>'}
      </div>

      <button onclick="window.ui.skipShrine()">Skip Blessing</button>
    `;

    this.showScreen('node');
  }

  skipShrine() {
    this.game.state.completeCurrentNode();
    this.renderMap();
  }

  renderBattlePrep() {
    const nodeScreen = document.getElementById('node-screen');
    const enemy = this.game.getCurrentEnemy();

    // Souls bar is already visible, just show enemy and prompt
    nodeScreen.innerHTML = `
      <h2>⚔️ Battle Ahead</h2>
      
      <div class="panel">
        <canvas id="enemy-preview" width="200" height="200"></canvas>
        <h3>${enemy.name}</h3>
        <p>❤️ ${enemy.blood} | ⚔️ ${enemy.attack} | 🛡️ ${enemy.defense}</p>
        <p>Rewards: ${enemy.dark_energy_reward} ⚡ + ${enemy.coin_reward} 💰</p>
      </div>

      <div class="panel">
        <h3>Select a soul from below to fight</h3>
      </div>

      <button onclick="window.ui.backToMap()">Retreat</button>
    `;

    this.showScreen('node');
    
    // Render enemy 3D preview
    setTimeout(() => this.renderEnemyPreview(enemy), 50);
    
    // Make soul cards clickable to start battle
    setTimeout(() => {
      document.querySelectorAll('.soul-card-mini').forEach((card, idx) => {
        const souls = this.game.getSouls();
        if (souls[idx]) {
          card.style.cursor = 'pointer';
          card.style.border = '2px solid #0f0';
          card.onclick = () => this.startBattleWith(souls[idx].id);
        }
      });
    }, 100);
  }

  summonSoul() {
    const result = this.game.summonSoul();
    if (result.success) {
      this.pendingSoul = result.soul;
      this.showSummoningScene();
    } else {
      alert(result.error);
    }
  }

  showSummoningScene() {
    const nodeScreen = document.getElementById('node-screen');
    
    // Create summoning container
    nodeScreen.innerHTML = `
      <style>
        @keyframes shake {
          0%, 100% { transform: translateX(-50%); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(calc(-50% - 10px)); }
          20%, 40%, 60%, 80% { transform: translateX(calc(-50% + 10px)); }
        }
        .shake-animation {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes float-up {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -20px); }
        }
        .speech-bubble {
          position: absolute;
          top: 15%;
          left: 50%;
          transform: translate(-50%, 0);
          background: rgba(10, 10, 10, 0.95);
          border: 2px solid #666;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 14px;
          font-style: italic;
          color: #ddd;
          z-index: 4;
          opacity: 0;
          pointer-events: none;
          max-width: 350px;
          text-align: center;
        }
        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 10px solid transparent;
          border-right: 10px solid transparent;
          border-top: 10px solid #666;
        }
        .speech-bubble.show {
          animation: float-up 3s ease-in-out;
        }
      </style>
      <div id="summoning-container" style="position: relative; width: 100%; height: 100vh;">
        <div id="summoning-canvas-container" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1;"></div>
        <div id="flash-overlay" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #9d4edd; opacity: 0; z-index: 2; pointer-events: none;"></div>
        <div id="speech-bubble" class="speech-bubble"></div>
        <div id="name-soul-form" style="position: absolute; bottom: 60px; left: 50%; transform: translateX(-50%); z-index: 3; background: rgba(10, 10, 10, 0.95); border: 2px solid #9d4edd; padding: 20px 40px; border-radius: 8px; opacity: 0; pointer-events: none;">
          <h3 style="margin: 0 0 15px 0; text-align: center;">${this.pendingSoul.type.toUpperCase()} Soul Summoned</h3>
          <input type="text" id="soul-name-input" placeholder="Name your soul..." maxlength="20" style="width: 300px; padding: 10px; font-size: 16px; background: #1a1a1a; border: 2px solid #666; color: #fff; border-radius: 4px;" />
          <button id="confirm-soul-name-btn" style="margin-left: 10px; padding: 10px 20px; font-size: 16px; background: #9d4edd; border: 2px solid #fff; color: #fff; cursor: pointer; border-radius: 4px;">Confirm</button>
        </div>
      </div>
    `;

    this.showScreen('node');

    // Initialize summoning 3D scene
    setTimeout(() => this.initSummoningScene(), 50);
  }

  initSummoningScene() {
    const container = document.getElementById('summoning-canvas-container');
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7a5a8a); // Much lighter purple
    scene.fog = new THREE.Fog(0x7a5a8a, 5, 15);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 0.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const PixelShader = {
      uniforms: {
        'tDiffuse': { value: null },
        'resolution': { value: new THREE.Vector2() },
        'pixelSize': { value: 4 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float pixelSize;
        varying vec2 vUv;
        
        void main() {
          vec2 dxy = pixelSize / resolution;
          vec2 coord = dxy * floor(vUv / dxy);
          gl_FragColor = texture2D(tDiffuse, coord);
        }
      `
    };

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = 6;
    composer.addPass(pixelPass);

    // Create void portal (dark torus)
    const portalGeom = new THREE.TorusGeometry(1.5, 0.3, 16, 32);
    const portalMat = new THREE.MeshBasicMaterial({ 
      color: 0x1a0a2e,
      side: THREE.DoubleSide
    });
    const portal = new THREE.Mesh(portalGeom, portalMat);
    portal.rotation.x = Math.PI / 2;
    portal.position.y = 0.3; // Lower portal to match soul position
    scene.add(portal);

    // Purple light emanating from portal
    const light = new THREE.PointLight(0x9d4edd, 0, 10);
    light.position.set(0, 0.3, 0);
    scene.add(light);

    // Ambient - much brighter
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.5);
    scene.add(ambientLight);

    // Directional lights for better visibility
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x9d4edd, 2.0);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.5);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // Load soul mesh (initially hidden)
    const soulMesh = this.prefabManager.instantiate(`soul_${this.pendingSoul.type}`);
    if (soulMesh) {
      soulMesh.position.set(0, 0.3, 0); // Lower the soul
      soulMesh.scale.set(0, 0, 0); // Start scaled to 0
      scene.add(soulMesh);
    }

    // Animation state
    const animState = {
      phase: 'light_building', // light_building -> flash -> reveal -> idle
      time: 0,
      flashTime: 0,
      revealTime: 0
    };

    const flashOverlay = document.getElementById('flash-overlay');
    const nameForm = document.getElementById('name-soul-form');

    // Animation loop
    let animId;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      animState.time += 0.016;

      // Phase 1: Light building (0-0.8s) - much faster
      if (animState.phase === 'light_building') {
        const t = Math.min(animState.time / 0.8, 1.0);
        light.intensity = t * 20;
        portal.rotation.z += 0.1;
        
        if (t >= 1.0) {
          animState.phase = 'flash';
          animState.flashTime = 0;
        }
      }
      // Phase 2: Flash (0.8-1.1s) - faster flash
      else if (animState.phase === 'flash') {
        animState.flashTime += 0.016;
        const t = animState.flashTime / 0.3;
        
        if (t < 0.5) {
          // Flash up
          flashOverlay.style.opacity = t * 2;
        } else {
          // Flash down
          flashOverlay.style.opacity = 2 - (t * 2);
        }

        if (t >= 1.0) {
          animState.phase = 'reveal';
          animState.revealTime = 0;
          flashOverlay.style.opacity = '0';
        }
      }
      // Phase 3: Reveal soul (1.1-2.1s) - faster reveal
      else if (animState.phase === 'reveal') {
        animState.revealTime += 0.016;
        const t = Math.min(animState.revealTime / 1.0, 1.0);
        
        // Fade out portal
        portalMat.opacity = 1 - t;
        portalMat.transparent = true;
        
        // Scale in soul
        if (soulMesh) {
          const scale = t * 1.2;
          soulMesh.scale.set(scale, scale, scale);
        }

        // Reduce light intensity
        light.intensity = 20 * (1 - t) + 5 * t;

        if (t >= 1.0) {
          animState.phase = 'idle';
          // Show name form
          nameForm.style.opacity = '1';
          nameForm.style.pointerEvents = 'auto';
          
          // Show speech bubble with random quote
          const speechBubble = document.getElementById('speech-bubble');
          const soulType = this.game.config.soulConfig.types.find(t => t.id === this.pendingSoul.type);
          if (soulType && soulType.quotes && soulType.quotes.length > 0) {
            const randomQuote = soulType.quotes[Math.floor(Math.random() * soulType.quotes.length)];
            speechBubble.textContent = `"${randomQuote}"`;
            speechBubble.classList.add('show');
            
            // Remove animation class after it completes so it can be replayed
            setTimeout(() => {
              speechBubble.classList.remove('show');
            }, 3000);
          }
          
          setTimeout(() => {
            const input = document.getElementById('soul-name-input');
            if (input) input.focus();
          }, 100);
        }
      }
      // Phase 4: Idle (soul floating)
      else if (animState.phase === 'idle') {
        if (soulMesh) {
          soulMesh.position.y = 0.3 + Math.sin(animState.time * 2) * 0.1;
          soulMesh.rotation.y += 0.01;

          // Animate soul spheres if it's a shadow
          if (soulMesh.userData.spheres) {
            const time = Date.now() * 0.001;
            soulMesh.userData.spheres.forEach(sphere => {
              const data = sphere.userData;
              sphere.position.copy(data.basePos);
              sphere.position.x += Math.sin(time * data.speed + data.phase) * data.amplitude;
              sphere.position.y += Math.cos(time * data.speed + data.phase) * data.amplitude;
            });
          }
        }
      }

      composer.render();
    };

    animate();

    // Store reference for cleanup
    this.summoningScene = {
      renderer,
      composer,
      animId,
      container
    };

    // Bind confirm button
    const confirmBtn = document.getElementById('confirm-soul-name-btn');
    const input = document.getElementById('soul-name-input');
    
    // Start with button disabled
    confirmBtn.disabled = true;
    confirmBtn.style.opacity = '0.5';
    confirmBtn.style.cursor = 'not-allowed';
    
    // Enable/disable button based on input
    input.addEventListener('input', () => {
      const hasText = input.value.trim().length > 0;
      confirmBtn.disabled = !hasText;
      confirmBtn.style.opacity = hasText ? '1' : '0.5';
      confirmBtn.style.cursor = hasText ? 'pointer' : 'not-allowed';
    });
    
    const confirmHandler = () => {
      const name = input.value.trim();
      if (!name) return; // Extra safety check
      
      this.pendingSoul.name = name;
      console.log('Summoned:', this.pendingSoul.name);
      this.disposeSummoningScene();
      this.pendingSoul = null;
      
      // Mark void as complete and go back to map
      this.game.state.completeCurrentNode();
      this.renderMap();
    };

    confirmBtn.onclick = confirmHandler;
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (input.value.trim().length > 0) {
          confirmHandler();
        } else {
          // Shake the dialog when trying to submit empty name
          nameForm.classList.remove('shake-animation');
          // Force reflow to restart animation
          void nameForm.offsetWidth;
          nameForm.classList.add('shake-animation');
        }
      }
    });
  }

  disposeSummoningScene() {
    if (!this.summoningScene) return;

    cancelAnimationFrame(this.summoningScene.animId);
    if (this.summoningScene.renderer) {
      this.summoningScene.renderer.dispose();
    }
    if (this.summoningScene.container) {
      this.summoningScene.container.innerHTML = '';
    }
    this.summoningScene = null;
  }

  buyMask(rarity, index) {
    const result = this.game.buyMask(rarity, index);
    if (result.success) {
      console.log('Bought mask:', result.mask.name);
      this.renderMaskShop();
    } else {
      alert(result.error);
    }
  }

  equipTempMaskTo(soulId) {
    const result = this.game.equipTempMask(soulId);
    if (result.success) {
      console.log('Mask equipped!');
      this.renderMaskShop();
      // Re-render the soul preview in the bottom bar
      const soul = this.game.state.souls.find(m => m.id === soulId);
      if (soul) {
        setTimeout(() => this.renderSoulPreview(soul, true), 50);
      }
    } else {
      alert(result.error);
    }
  }

  applyShrineEffect(soulId, effect, value) {
    const soul = this.game.state.souls.find(m => m.id === soulId);
    if (!soul) return;

    switch(effect) {
      case 'remove_negative_trait':
        if (soul.negativeTraits.length > 0) {
          soul.negativeTraits.pop();
          console.log('Negative trait removed');
        }
        break;
      case 'add_positive_trait':
        if (soul.mask) {
          const traits = this.game.getRandomPositiveTraits(1);
          soul.addPositiveTraitToMask(traits[0].id);
          console.log('Positive trait added');
        }
        break;
      case 'dark_energy':
        this.game.state.darkEnergy += value;
        console.log(`Gained ${value} dark energy`);
        break;
      case 'coins':
        this.game.state.coins += value;
        console.log(`Gained ${value} coins`);
        break;
      case 'heal_full':
        soul.blood = soul.maxBlood;
        console.log('Soul fully healed');
        break;
      case 'increase_max_hp':
        soul.maxBlood += value;
        soul.blood += value;
        console.log(`Max HP increased by ${value}`);
        break;
    }

    // Mark shrine as complete
    this.game.state.completeCurrentNode();
    this.renderMap();
  }

  startBattleWith(soulId) {
    const result = this.game.startBattle(soulId);
    if (result.success) {
      this.renderBattle(result.combatState);
    } else {
      alert(result.error);
    }
  }

  backToMap() {
    // Mark node as complete when leaving void/shop
    const node = this.game.getCurrentNode();
    const actualType = node.type === 'mystery' ? this.game.state.mysteryRevealed : node.type;
    
    if (actualType === 'void' || actualType === 'mask_shop') {
      this.game.state.completeCurrentNode();
    }
    
    // Dispose battle scene if active
    this.disposeBattleScene();
    
    // Show souls bar again when leaving battle
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'flex';
    }
    
    this.renderMap();
  }

  renderBattle(state) {
    const battleScreen = document.getElementById('battle-screen');
    
    // Hide souls bar during battle
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'none';
    }
    
    // Setup 3D battle scene if not already initialized
    if (!this.battleScene) {
      this.initBattleScene(state);
    } else {
      // Update existing scene
      this.updateBattleScene(state);
    }
    
    battleScreen.innerHTML = `
      <div class="combat-info">
        <div class="combatant">
          <div class="health-bar-floating">
            <strong>${state.soul.name || 'Your Soul'}</strong><br>
            <div>❤️ ${state.soul.blood}/${state.soul.maxBlood}</div>
            ${state.soul.block > 0 ? `<span class="block-badge">🛡️ ${state.soul.block}</span>` : ''}
            <div class="health-bar">
              <div class="health-fill" style="width: ${(state.soul.blood / state.soul.maxBlood) * 100}%"></div>
            </div>
          </div>
        </div>

        <div class="combatant" style="text-align: right;">
          <div class="health-bar-floating">
            <strong>${state.enemy.name}</strong><br>
            <div>❤️ ${state.enemy.blood}/${state.enemy.maxBlood}</div>
            ${state.enemy.block > 0 ? `<span class="block-badge">🛡️ ${state.enemy.block}</span>` : ''}
            <div class="health-bar">
              <div class="health-fill" style="width: ${(state.enemy.blood / state.enemy.maxBlood) * 100}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="panel" style="position: fixed; top: 120px; left: 50%; transform: translateX(-50%); z-index: 50; background: rgba(10, 10, 10, 0.8);">
        <span style="color: #a855f7;">Energy: ${state.energy}/${state.maxEnergy}</span> | 
        <span>Turn: ${state.turn + 1}</span> | 
        <span>Deck: ${state.deckCount}</span> | 
        <span>Discard: ${state.discardCount}</span>
        <button onclick="window.ui.endTurn()" style="float: right;">End Turn</button>
      </div>

      <div class="hand">
        ${state.hand.map((card, i) => `
          <div class="card ${card.type}" onclick="window.ui.playCard(${i})">
            <div class="card-name">${card.name}</div>
            <div class="card-cost">Cost: ${card.cost}</div>
            <div class="card-desc">${card.description || ''}</div>
          </div>
        `).join('')}
      </div>
    `;

    this.showScreen('battle');

    if (state.result) {
      setTimeout(() => this.handleBattleEnd(), 1000);
    }
  }

  initBattleScene(state) {
    console.log('Initializing battle scene with state:', state);
    const container = document.getElementById('battle-canvas-container');
    container.classList.add('active');

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7a5555);
    scene.fog = new THREE.Fog(0x7a5555, 5, 15);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 2, 3);
    camera.lookAt(0, 1, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Post-processing with pixelation
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const PixelShader = {
      uniforms: {
        'tDiffuse': { value: null },
        'resolution': { value: new THREE.Vector2() },
        'pixelSize': { value: 4 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float pixelSize;
        varying vec2 vUv;
        
        void main() {
          vec2 dxy = pixelSize / resolution;
          vec2 coord = dxy * floor(vUv / dxy);
          gl_FragColor = texture2D(tDiffuse, coord);
        }
      `
    };

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = 6;
    composer.addPass(pixelPass);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
    rimLight.position.set(0, 5, -10);
    scene.add(rimLight);

    // Ground
    const groundGeom = new THREE.CircleGeometry(5, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(10, 20, 0x333333, 0x222222);
    scene.add(gridHelper);

    // Load soul on the left
    console.log('Loading soul:', `soul_${state.soul.type}`);
    const soulMesh = this.prefabManager.instantiate(`soul_${state.soul.type}`);
    console.log('Soul mesh:', soulMesh);
    if (soulMesh) {
      soulMesh.position.set(-2, 0, 0);
      soulMesh.rotation.y = Math.PI / 4; // Face right
      scene.add(soulMesh);

      // Add mask if equipped
      if (state.soul.mask && state.soul.mask.id) {
        const maskMesh = this.prefabManager.instantiate(`mask_${state.soul.mask.id}`);
        if (maskMesh) {
          let mountPoint;
          // Mount points based on soul type
          if (state.soul.type === 'wretch') {
            // Wretch uses shadow model - attach to head orb
            const headOrb = soulMesh.userData.headOrb;
            if (headOrb) {
              mountPoint = new THREE.Object3D();
              mountPoint.position.set(0, 0, 0.35);
              headOrb.add(mountPoint);
            }
          } else if (state.soul.type === 'imp' || state.soul.type === 'brute') {
            // Imp and Brute use flesh-like models
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 0.9, 0.5);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'hollow' || state.soul.type === 'blight') {
            // Hollow and Blight use bone-like models
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.4, 0.45);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'cur') {
            // Cur - dog head
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.5, 0.9, 0.3);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'scamp') {
            // Scamp - small imp head
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.2, 0.3);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'varmint') {
            // Varmint - rat face
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.3, 0.85, 0.2);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'knave') {
            // Knave - hooded face
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.3, 0.25);
            soulMesh.add(mountPoint);
          }
          
          if (mountPoint) {
            maskMesh.scale.set(1.0, 1.0, 1.0);
            mountPoint.add(maskMesh);
          }
        }
      }
    }

    // Load enemy on the right
    console.log('Loading enemy:', `enemy_${state.enemy.id}`);
    const enemyMesh = this.prefabManager.instantiate(`enemy_${state.enemy.id}`);
    console.log('Enemy mesh:', enemyMesh);
    if (enemyMesh) {
      enemyMesh.position.set(2, 0, 0);
      enemyMesh.rotation.y = -Math.PI / 4; // Face left
      scene.add(enemyMesh);
    }

    // Store scene data
    this.battleScene = {
      scene,
      camera,
      renderer,
      composer,
      soulMesh,
      enemyMesh,
      cameraAngle: 0
    };

    // Handle resize
    const resizeHandler = () => {
      if (!this.battleScene) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);
    this.battleScene.resizeHandler = resizeHandler;

    // Start animation
    this.animateBattleScene();
  }

  updateBattleScene(state) {
    // Update models if needed (health changes, effects, etc)
    // For now, just keep animating
  }

  animateBattleScene() {
    if (!this.battleScene) return;

    this.battleAnimationId = requestAnimationFrame(() => this.animateBattleScene());

    const { scene, camera, composer, soulMesh, enemyMesh, cameraAngle } = this.battleScene;

    // Slowly pan camera around the characters
    this.battleScene.cameraAngle += 0.001;
    const radius = 4;
    camera.position.x = Math.cos(this.battleScene.cameraAngle) * radius;
    camera.position.z = Math.sin(this.battleScene.cameraAngle) * radius;
    camera.position.y = 2;
    camera.lookAt(0, 1, 0);

    // Animate soul and enemy
    if (soulMesh && soulMesh.userData.spheres) {
      const time = Date.now() * 0.001;
      soulMesh.userData.spheres.forEach(sphere => {
        const data = sphere.userData;
        sphere.position.copy(data.basePos);
        sphere.position.x += Math.sin(time * data.speed + data.phase) * data.amplitude;
        sphere.position.y += Math.cos(time * data.speed + data.phase) * data.amplitude;
      });
    }

    composer.render();
  }

  disposeBattleScene() {
    if (!this.battleScene) return;

    cancelAnimationFrame(this.battleAnimationId);
    this.battleAnimationId = null;

    const container = document.getElementById('battle-canvas-container');
    container.classList.remove('active');
    container.innerHTML = '';

    if (this.battleScene.resizeHandler) {
      window.removeEventListener('resize', this.battleScene.resizeHandler);
    }

    if (this.battleScene.renderer) {
      this.battleScene.renderer.dispose();
    }

    this.battleScene = null;
  }

  playCard(handIndex) {
    const result = this.game.playCard(handIndex);
    if (result.success) {
      this.renderBattle(result.state);
    } else {
      console.log(result.error);
    }
  }

  endTurn() {
    const result = this.game.endTurn();
    if (result.success) {
      this.renderBattle(result.state);
    }
  }

  handleBattleEnd() {
    const result = this.game.resolveBattle();
    if (result.success) {
      // Dispose battle scene
      this.disposeBattleScene();
      
      // Show souls bar again when battle ends
      const soulsBar = document.querySelector('.souls-bar');
      if (soulsBar) {
        soulsBar.style.display = 'flex';
      }
      this.renderTraitChoice(result);
    }
  }

  renderTraitChoice(battleResult) {
    const traitScreen = document.getElementById('trait-choice-screen');
    const isPositive = battleResult.result === 'victory';
    
    traitScreen.innerHTML = `
      <div class="panel">
        <h2>${isPositive ? '🎉 VICTORY!' : '💀 DEFEAT'}</h2>
        <p>${isPositive ? 'Choose a trait to add to your mask:' : 'Your mask broke! Choose a curse for your soul:'}</p>
      </div>

      <div style="display: flex; gap: 20px; flex-wrap: wrap;">
        ${battleResult.availableTraits.map(trait => `
          <div class="trait-choice" onclick="window.ui.chooseTrait('${trait.id}', ${isPositive})">
            <h3>${trait.name}</h3>
            <p>${trait.description}</p>
            <p style="color: #999; font-size: 12px;">Card: ${trait.card}</p>
          </div>
        `).join('')}
      </div>
    `;

    this.showScreen('trait-choice');
  }

  chooseTrait(traitId, isPositive) {
    this.game.applyTraitChoice(traitId, isPositive);
    
    // Mark battle node as complete
    this.game.state.completeCurrentNode();
    
    const gameStatus = this.game.checkGameOver();
    if (gameStatus.gameOver) {
      alert(gameStatus.message);
      this.game.reset();
    }

    this.selectedSoul = null;
    this.renderMap();
  }

  showScreen(screenName) {
    const screens = ['map', 'node', 'battle', 'trait-choice'];
    screens.forEach(name => {
      const el = document.getElementById(`${name}-screen`);
      if (name === screenName) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    });
    this.currentScreen = screenName;
  }

  renderSoulPreview(soul, isMini = false) {
    const canvasId = isMini 
      ? `soul-preview-mini-${soul.id}` 
      : (soul.id ? `soul-preview-${soul.id}` : 'battle-soul-preview');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const size = isMini ? 80 : 200;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a1a1a);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 1, 2.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(size, size);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 3, 2);
    scene.add(mainLight);

    // Load soul model
    const soulMesh = this.prefabManager.instantiate(`soul_${soul.type}`);
    if (soulMesh) {
      soulMesh.position.set(0, 0, 0);
      scene.add(soulMesh);

      // Add mask if equipped
      if (soul.mask && soul.mask.id) {
        const maskMesh = this.prefabManager.instantiate(`mask_${soul.mask.id}`);
        if (maskMesh) {
          // Find mount point based on soul type
          let mountPoint;
          if (soul.type === 'wretch') {
            const headOrb = soulMesh.userData.headOrb;
            if (headOrb) {
              mountPoint = new THREE.Object3D();
              mountPoint.position.set(0, 0, 0.35);
              headOrb.add(mountPoint);
            }
          } else if (soul.type === 'imp' || soul.type === 'brute') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 0.9, 0.5);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'hollow' || soul.type === 'blight') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.4, 0.45);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'cur') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.5, 0.9, 0.3);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'scamp') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.2, 0.3);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'varmint') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.3, 0.85, 0.2);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'knave') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.3, 0.25);
            soulMesh.add(mountPoint);
          }

          if (mountPoint) {
            maskMesh.scale.set(1.0, 1.0, 1.0);
            mountPoint.add(maskMesh);
          }
        }
      }
    }

    // Render multiple frames to ensure textures load
    let frameCount = 0;
    const maxFrames = 60; // Render for ~1 second at 60fps
    const animate = () => {
      if (frameCount < maxFrames) {
        frameCount++;
        requestAnimationFrame(animate);
      }
      renderer.render(scene, camera);
    };
    animate();
  }

  renderEnemyPreview(enemy, canvasId = 'battle-enemy-preview') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a1a1a);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(0, 1, 2.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(200, 200);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(2, 3, 2);
    scene.add(mainLight);

    // Load enemy model
    const enemyMesh = this.prefabManager.instantiate(`enemy_${enemy.id}`);
    if (enemyMesh) {
      enemyMesh.position.set(0, 0, 0);
      scene.add(enemyMesh);
    }

    renderer.render(scene, camera);
  }
}
