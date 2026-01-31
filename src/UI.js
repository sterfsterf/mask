// UI Manager - handles all DOM/UI interactions
export class UI {
  constructor(game) {
    this.game = game;
    this.currentScreen = 'map';
    this.selectedMinion = null;
    this.selectedMask = null;
    this.pendingMinion = null;
    
    this.createUI();
  }

  createUI() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div id="currency-hud" class="currency-hud"></div>
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
    console.log('Minions:', this.game.getMinions());
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

      .minion-card {
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #666;
        padding: 12px;
        margin: 8px 0;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .minion-card:hover {
        border-color: #ff0033;
      }

      .minion-card.selected {
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
      }

      .combat-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
      }

      .combatant {
        flex: 1;
        text-align: center;
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

      .mask-shop-item {
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #666;
        padding: 15px;
        margin: 10px;
        display: inline-block;
        min-width: 200px;
        vertical-align: top;
      }

      .mask-shop-item:hover {
        border-color: #ff0033;
      }

      .mask-shop-item.legendary { border-color: #fbbf24; }
      .mask-shop-item.rare { border-color: #a855f7; }
      .mask-shop-item.common { border-color: #666; }

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
    `;
    document.head.appendChild(style);
  }

  renderMap() {
    const mapScreen = document.getElementById('map-screen');
    const minions = this.game.getMinions();
    const currentNode = this.game.getCurrentNode();
    const availableNodes = this.game.getAvailableNodes();
    const isComplete = this.game.state.isCurrentNodeComplete();

    this.updateCurrencyHUD();

    mapScreen.innerHTML = `
      <h2>🎭 MASK - The Void Path</h2>

      <div class="panel">
        <h3>Your Minions</h3>
        ${minions.length === 0 ? '<p>No minions summoned yet.</p>' : ''}
        ${minions.map(m => `
          <div class="minion-card">
            <strong>${m.name}</strong> (${m.type})<br>
            ❤️ ${m.blood}/${m.maxBlood} | ⚔️ ${m.baseAttack} | 🛡️ ${m.baseDefense}<br>
            ${m.mask ? `Mask: ${m.mask.name} (${m.maskBattlesRemaining} battles)` : 'No mask'}
            ${m.tired ? ' | <span style="color:#fbbf24">TIRED</span>' : ''}
          </div>
        `).join('')}
      </div>

      ${!isComplete ? `
        <div class="panel">
          <h3>Current Location: ${this.getNodeName(currentNode)}</h3>
          <button onclick="window.ui.enterCurrentNode()">Enter</button>
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

    this.showScreen('map');
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
      case 'void': return 'Summon minions from the void';
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
    const summonCost = this.game.config.minionConfig.summon_cost;
    const canAfford = this.game.state.darkEnergy >= summonCost;

    this.updateCurrencyHUD();

    nodeScreen.innerHTML = `
      <h2>🌀 Void Gate</h2>
      
      <div class="panel">
        <p>The void whispers... summon a minion to fight for you.</p>
        <p>Cost: ${summonCost} ⚡ Dark Energy</p>
        <button onclick="window.ui.summonMinion()" ${!canAfford ? 'disabled' : ''}>
          Summon Minion
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
    const minions = this.game.getMinions();
    const coins = this.game.state.coins;

    this.updateCurrencyHUD();

    nodeScreen.innerHTML = `
      <h2>🎭 Mask Vendor</h2>

      ${tempMask ? `
        <div class="panel">
          <h3>Purchased Mask (Select a minion to equip)</h3>
          <div class="mask-shop-item ${tempMask.rarity}">
            <strong>${tempMask.name}</strong> [${tempMask.rarity.toUpperCase()}]<br>
            Traits: ${tempMask.traits.join(', ')}<br>
            Bind: ${tempMask.bind_duration} battles
          </div>
          
          <h4>Equip to:</h4>
          ${minions.map(m => `
            <button onclick="window.ui.equipTempMaskTo(${m.id})">
              ${m.name} ${m.mask ? '(has mask)' : ''}
            </button>
          `).join('')}
        </div>
      ` : ''}

      ${offering.legendary.length > 0 ? `
        <div class="panel">
          <h3>Legendary Masks (${costs.legendary} 💰)</h3>
          ${offering.legendary.map((mask, i) => `
            <div class="mask-shop-item legendary">
              <strong>${mask.name}</strong><br>
              Traits: ${mask.traits.join(', ')}<br>
              Bind: ${mask.bind_duration} battles<br><br>
              <button onclick="window.ui.buyMask('legendary', ${i})" ${coins < costs.legendary ? 'disabled' : ''}>
                Buy (${costs.legendary} 💰)
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${offering.rare.length > 0 ? `
        <div class="panel">
          <h3>Rare Masks (${costs.rare} 💰)</h3>
          ${offering.rare.map((mask, i) => `
            <div class="mask-shop-item rare">
              <strong>${mask.name}</strong><br>
              Traits: ${mask.traits.join(', ')}<br>
              Bind: ${mask.bind_duration} battles<br><br>
              <button onclick="window.ui.buyMask('rare', ${i})" ${coins < costs.rare ? 'disabled' : ''}>
                Buy (${costs.rare} 💰)
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${offering.common.length > 0 ? `
        <div class="panel">
          <h3>Common Masks (${costs.common} 💰)</h3>
          ${offering.common.map((mask, i) => `
            <div class="mask-shop-item common">
              <strong>${mask.name}</strong><br>
              Traits: ${mask.traits.join(', ')}<br>
              Bind: ${mask.bind_duration} battles<br><br>
              <button onclick="window.ui.buyMask('common', ${i})" ${coins < costs.common ? 'disabled' : ''}>
                Buy (${costs.common} 💰)
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <button onclick="window.ui.backToMap()">Leave</button>
    `;

    this.showScreen('node');
  }

  renderShrine() {
    const nodeScreen = document.getElementById('node-screen');
    const shrine = this.game.state.currentShrine;
    const minions = this.game.getMinions();

    nodeScreen.innerHTML = `
      <h2>✨ ${shrine.name}</h2>
      
      <div class="panel">
        <p>${shrine.description}</p>
        
        ${minions.length > 0 ? `
          <h4>Choose a minion:</h4>
          ${minions.map(m => `
            <button onclick="window.ui.applyShrineEffect(${m.id}, '${shrine.effect}', ${shrine.value || 0})">
              ${m.name}
            </button>
          `).join('')}
        ` : '<p>No minions to bless.</p>'}
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
    const minions = this.game.getMinions();

    nodeScreen.innerHTML = `
      <h2>⚔️ Battle Ahead</h2>
      
      <div class="panel">
        <h3>${enemy.name}</h3>
        <p>❤️ ${enemy.blood} | ⚔️ ${enemy.attack} | 🛡️ ${enemy.defense}</p>
        <p>Rewards: ${enemy.dark_energy_reward} ⚡ + ${enemy.coin_reward} 💰</p>
      </div>

      <div class="panel">
        <h3>Choose Your Fighter</h3>
        ${minions.map(m => `
          <button onclick="window.ui.startBattleWith(${m.id})">
            ${m.name} (❤️ ${m.blood}/${m.maxBlood})
          </button>
        `).join('')}
      </div>

      <button onclick="window.ui.backToMap()">Retreat</button>
    `;

    this.showScreen('node');
  }

  summonMinion() {
    const result = this.game.summonMinion();
    if (result.success) {
      this.pendingMinion = result.minion;
      this.showNameMinionModal();
    } else {
      alert(result.error);
    }
  }

  showNameMinionModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <h2>Name Your Minion</h2>
        <p>${this.pendingMinion.type.toUpperCase()} summoned from the void</p>
        <input type="text" id="minion-name-input" placeholder="Enter name..." maxlength="20" />
        <br>
        <button onclick="window.ui.confirmMinionName()">Confirm</button>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Focus input and allow enter key
    setTimeout(() => {
      const input = document.getElementById('minion-name-input');
      input.focus();
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.confirmMinionName();
        }
      });
    }, 100);
  }

  confirmMinionName() {
    const input = document.getElementById('minion-name-input');
    const name = input.value.trim();
    
    if (name) {
      this.pendingMinion.name = name;
    }
    
    // Remove modal
    const modal = document.querySelector('.modal-overlay');
    if (modal) {
      modal.remove();
    }
    
    console.log('Summoned:', this.pendingMinion.name);
    this.pendingMinion = null;
    this.renderVoidNode();
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

  equipTempMaskTo(minionId) {
    const result = this.game.equipTempMask(minionId);
    if (result.success) {
      console.log('Mask equipped!');
      this.renderMaskShop();
    } else {
      alert(result.error);
    }
  }

  applyShrineEffect(minionId, effect, value) {
    const minion = this.game.state.minions.find(m => m.id === minionId);
    if (!minion) return;

    switch(effect) {
      case 'remove_negative_trait':
        if (minion.negativeTraits.length > 0) {
          minion.negativeTraits.pop();
          console.log('Negative trait removed');
        }
        break;
      case 'add_positive_trait':
        if (minion.mask) {
          const traits = this.game.getRandomPositiveTraits(1);
          minion.addPositiveTraitToMask(traits[0].id);
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
        minion.blood = minion.maxBlood;
        console.log('Minion fully healed');
        break;
      case 'increase_max_hp':
        minion.maxBlood += value;
        minion.blood += value;
        console.log(`Max HP increased by ${value}`);
        break;
    }

    // Mark shrine as complete
    this.game.state.completeCurrentNode();
    this.renderMap();
  }

  startBattleWith(minionId) {
    const result = this.game.startBattle(minionId);
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
    
    this.renderMap();
  }

  renderBattle(state) {
    const battleScreen = document.getElementById('battle-screen');
    
    battleScreen.innerHTML = `
      <div class="combat-info">
        <div class="combatant">
          <h3>Your Minion</h3>
          <div>❤️ ${state.minion.blood}/${state.minion.maxBlood}</div>
          ${state.minion.block > 0 ? `<span class="block-badge">🛡️ ${state.minion.block}</span>` : ''}
          <div class="health-bar">
            <div class="health-fill" style="width: ${(state.minion.blood / state.minion.maxBlood) * 100}%"></div>
          </div>
        </div>

        <div style="align-self: center;">
          <h2>VS</h2>
        </div>

        <div class="combatant">
          <h3>${state.enemy.name}</h3>
          <div>❤️ ${state.enemy.blood}/${state.enemy.maxBlood}</div>
          ${state.enemy.block > 0 ? `<span class="block-badge">🛡️ ${state.enemy.block}</span>` : ''}
          <div class="health-bar">
            <div class="health-fill" style="width: ${(state.enemy.blood / state.enemy.maxBlood) * 100}%"></div>
          </div>
        </div>
      </div>

      <div class="panel">
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
      this.renderTraitChoice(result);
    }
  }

  renderTraitChoice(battleResult) {
    const traitScreen = document.getElementById('trait-choice-screen');
    const isPositive = battleResult.result === 'victory';
    
    traitScreen.innerHTML = `
      <div class="panel">
        <h2>${isPositive ? '🎉 VICTORY!' : '💀 DEFEAT'}</h2>
        <p>${isPositive ? 'Choose a trait to add to your mask:' : 'Your mask broke! Choose a curse for your minion:'}</p>
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

    this.selectedMinion = null;
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
}
