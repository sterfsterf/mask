// UI Manager - handles all DOM/UI interactions
import * as THREE from 'three';
import { PrefabManager } from './debug/Prefab3D.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { POST_PROCESSING_CONFIG, PixelShader, HalftoneShader } from './core/PixelationShader.js';
import { sfx } from './core/SoundEffects.js';

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
        <div id="summoning-screen" class="screen hidden"></div>
      </div>
    `;

    this.addStyles();
    this.updateCurrencyHUD();
    
    // Global button hover SFX
    this.setupButtonHoverSFX();
  }

  setupButtonHoverSFX() {
    document.addEventListener('mouseover', (e) => {
      const button = e.target.closest('button');
      if (button && !button.disabled) {
        sfx.buttonHover();
      }
    });
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

  updateSoulsBar() {
    // Remove old souls bar if exists
    const oldBar = document.querySelector('.souls-bar');
    if (oldBar) oldBar.remove();
    
    const souls = this.game.getSouls();
    if (souls.length === 0) return;
    
    // Rebuild souls bar
    const soulsBar = document.createElement('div');
    soulsBar.className = 'souls-bar';
    soulsBar.innerHTML = `
      ${souls.map(m => {
        // Calculate health percentages for bars
        const healthPercent = (m.blood / m.maxBlood) * 100;
        
        // Display actual mask health if equipped
        let maskHealth = '';
        if (m.mask && m.maskBlood !== undefined && m.maskMaxBlood !== undefined) {
          const maskHealthPercent = (m.maskBlood / m.maskMaxBlood) * 100;
          maskHealth = `<div class="mask-health">
            <span class="stat-icon">🎭</span>
            <span class="stat-values">${m.maskBlood}/${m.maskMaxBlood}</span>
            <div class="health-bar"><div class="health-bar-fill" style="width: ${maskHealthPercent}%"></div></div>
          </div>`;
        } else {
          // Reserve space for mask health even if no mask
          maskHealth = `<div class="mask-health"></div>`;
        }
        
        return `
          <div class="soul-card-mini" data-soul-id="${m.id}">
            <canvas class="soul-preview-mini" id="soul-preview-mini-${m.id}" width="80" height="80"></canvas>
            <div class="soul-name">${m.name}</div>
            <div class="soul-stats">
              <span class="stat-icon">❤️</span>
              <span class="stat-values">${m.blood}/${m.maxBlood}</span>
              <div class="health-bar"><div class="health-bar-fill" style="width: ${healthPercent}%"></div></div>
            </div>
            ${maskHealth}
            ${m.tired ? '<div class="is-tired">💤</div>' : ''}
            <button class="view-deck-btn" onclick="window.ui.viewSoulDeck(${m.id}); event.stopPropagation();">🃏</button>
          </div>
        `;
      }).join('')}
    `;
    document.body.appendChild(soulsBar);
    
    // Re-render soul previews
    souls.forEach(soul => {
      this.renderSoulPreview(soul, true);
    });
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
      @import url('https://fonts.googleapis.com/css2?family=IM+Fell+DW+Pica+SC&display=swap');

      #ui-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
        overflow: visible;
      }

      .screen {
        pointer-events: all;
        width: 100%;
        height: 100%;
        padding: 20px;
        overflow-y: auto;
        overflow-x: hidden;
      }

      .screen#battle-screen {
        overflow: visible;
        padding: 0;
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
      
      h1, h2, h3, h4, button {
        font-family: 'IM Fell DW Pica SC', serif;
      }
      
      input, button {
        font-size: 16px;
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
        font-family: 'IM Fell DW Pica SC', serif;
        font-size: 1.17em;
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
        padding: 0;
        margin: 5px;
        width: 120px;
        height: 180px;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        flex-direction: column;
        vertical-align: top;
        position: relative;
        border-radius: 8px;
        overflow: hidden;
        transform: translateY(140px);
      }

      .card:hover {
        transform: translateY(0);
        border-color: #fff;
        box-shadow: 0 10px 30px rgba(255, 0, 51, 0.8);
        z-index: 1000;
      }

      .card.attack { border-color: #ff0033; }
      .card.defend { border-color: #3b82f6; }
      .card.status { border-color: #6b7280; }
      
      .card.scar {
        border-color: #8b0000;
        background: linear-gradient(135deg, #1a0a0a 0%, #2a0a0a 100%);
      }

      .card.unplayable {
        opacity: 0.5;
        cursor: not-allowed;
        border-color: #444;
        background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
      }

      .card.unplayable:hover {
        transform: translateY(-20px);
        box-shadow: none;
      }

      .card-cost-circle {
        position: absolute;
        top: 4px;
        left: 4px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: #a855f7;
        border: 2px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        color: #fff;
        z-index: 2;
      }

      .card-source-icon {
        position: absolute;
        top: 4px;
        right: 4px;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        z-index: 2;
      }

      .card.unplayable .card-cost-circle {
        background: #444;
        border-color: #666;
        color: #999;
      }

      .card-header {
        padding: 6px 8px;
        padding-left: 40px;
        background: rgba(0, 0, 0, 0.5);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .card-name {
        font-size: 11px;
        font-weight: bold;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        text-align: left;
      }

      .card-illustration {
        flex: 1;
        background: rgba(0, 0, 0, 0.3);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 36px;
        min-height: 60px;
      }

      .card.attack .card-illustration { color: #ff0033; }
      .card.defend .card-illustration { color: #3b82f6; }
      .card.status .card-illustration { color: #6b7280; }

      .card-footer {
        padding: 8px;
        background: rgba(0, 0, 0, 0.7);
        min-height: 50px;
      }

      .card-desc {
        font-size: 10px;
        color: #ccc;
        line-height: 1.3;
      }

      .hand {
        position: fixed;
        bottom: -100px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
        max-width: 90%;
        overflow-x: auto;
        overflow-y: visible;
        z-index: 999;
        padding-bottom: 120px;
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
        overflow: hidden;
      }

      .health-bar-shake {
        animation: healthShake 0.08s ease-in-out 5;
      }

      @keyframes healthShake {
        0%, 100% { transform: translateX(0) translateY(0); }
        10% { transform: translateX(-6px) translateY(2px); }
        20% { transform: translateX(6px) translateY(-2px); }
        30% { transform: translateX(-6px) translateY(-1px); }
        40% { transform: translateX(6px) translateY(1px); }
        50% { transform: translateX(-5px) translateY(-2px); }
        60% { transform: translateX(5px) translateY(2px); }
        70% { transform: translateX(-4px) translateY(1px); }
        80% { transform: translateX(4px) translateY(-1px); }
        90% { transform: translateX(-3px) translateY(0); }
      }

      @keyframes soul-card-shake {
        0%, 100% { transform: translateX(0) translateY(0); }
        10% { transform: translateX(-8px) translateY(3px); }
        20% { transform: translateX(8px) translateY(-3px); }
        30% { transform: translateX(-8px) translateY(-2px); }
        40% { transform: translateX(8px) translateY(2px); }
        50% { transform: translateX(-6px) translateY(-3px); }
        60% { transform: translateX(6px) translateY(3px); }
        70% { transform: translateX(-5px) translateY(2px); }
        80% { transform: translateX(5px) translateY(-2px); }
        90% { transform: translateX(-3px) translateY(0); }
      }

      @keyframes fade-in-out {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
      }

      .health-fill-back {
        position: absolute;
        top: 0;
        left: 0;
        background: rgba(255, 100, 100, 0.4);
        height: 100%;
        transition: none;
        z-index: 1;
      }

      .health-fill {
        position: absolute;
        top: 0;
        left: 0;
        background: linear-gradient(90deg, #ff0033 0%, #ff6666 100%);
        height: 100%;
        transition: none;
        z-index: 2;
      }

      .enemy-intent {
        background: rgba(255, 100, 100, 0.2);
        border: 1px solid #ff6464;
        padding: 6px 10px;
        margin: 8px 0;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-size: 12px;
      }

      .intent-icon {
        font-size: 16px;
      }

      .intent-text {
        color: #ffcccc;
        font-weight: bold;
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
        transform: translateY(-4px) scale(1.01);
      }

      .card.trait-choice {
        transform: translateY(0) !important;
      }

      .card.trait-choice:hover {
        transform: scale(1.05) !important;
      }

      .trait-card-choice {
        cursor: pointer;
        transition: all 0.2s;
        transform: translateY(0) !important; /* Override base .card translateY */
      }

      .trait-card-choice:hover {
        transform: scale(1.05) !important; /* Keep at translateY(0), just scale */
        box-shadow: 0 10px 30px rgba(255, 0, 51, 0.8);
        z-index: 10;
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
        position: fixed;
        bottom: 200px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 800px;
        padding: 0 20px;
        z-index: 100;
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

      .mask-description {
        font-size: 10px;
        color: #aaa;
        font-style: italic;
        line-height: 1.2;
        min-height: 30px;
      }

      .mask-shop-actions {
        display: flex;
        gap: 4px;
        width: 100%;
        margin-top: 4px;
      }

      .deck-preview-btn {
        padding: 6px 10px;
        background: #333;
        border: 2px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .deck-preview-btn:hover {
        background: #444;
        border-color: #ffd700;
        transform: scale(1.05);
      }

      .deck-preview-card {
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #444;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
      }

      .deck-preview-card .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }

      .deck-preview-card .card-type {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        margin-bottom: 5px;
      }

      .deck-preview-card .card-effect {
        color: #ccc;
        font-size: 14px;
        line-height: 1.4;
      }

      .deck-preview-card .card-cost {
        color: #ffd700;
        font-weight: bold;
      }

      .mask-traits {
        font-size: 9px;
        color: #aaa;
      }

      .buy-btn {
        padding: 4px 8px;
        font-size: 10px;
        width: 100%;
      }
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
        gap: 1px;
        padding: 8px 8px 4px 8px;
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #666;
        min-height: 160px;
      }

      .soul-preview-mini {
        border: 2px solid #444;
        image-rendering: pixelated;
      }

      .soul-name {
        font-family: 'IM Fell DW Pica SC', serif;
        font-size: 11px;
        font-weight: bold;
        margin-bottom: 2px;
      }

      .soul-stats {
        font-size: 10px;
        color: #aaa;
        width: 100%;
        padding: 0 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        height: 12px;
        position: relative;
      }

      .soul-stats .stat-icon {
        font-size: 10px;
        line-height: 1;
      }

      .soul-stats .stat-values {
        display: none;
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        font-size: 9px;
        color: #fff;
        -webkit-text-stroke: 1px #000;
        paint-order: stroke fill;
        font-weight: bold;
        z-index: 1;
      }

      .soul-stats .health-bar {
        flex: 1;
        height: 8px;
        background: #333;
        border: 1px solid #666;
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }

      .soul-stats .health-bar-fill {
        height: 100%;
        background: linear-gradient(to bottom, #ff6666, #cc0000);
        transition: width 0.3s ease;
      }

      .soul-card-mini:hover .soul-stats .stat-values {
        display: block;
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

      .mask-health {
        font-size: 10px;
        color: #ffd700;
        min-height: 12px;
        width: 100%;
        padding: 0 4px;
        display: flex;
        align-items: center;
        gap: 4px;
        height: 12px;
        position: relative;
      }

      .mask-health .stat-icon {
        font-size: 10px;
        line-height: 1;
      }

      .mask-health .stat-values {
        display: none;
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        font-size: 9px;
        color: #fff;
        -webkit-text-stroke: 1px #000;
        paint-order: stroke fill;
        font-weight: bold;
        z-index: 1;
      }

      .mask-health .health-bar {
        flex: 1;
        height: 8px;
        background: #333;
        border: 1px solid #999;
        border-radius: 2px;
        overflow: hidden;
        position: relative;
      }

      .mask-health .health-bar-fill {
        height: 100%;
        background: linear-gradient(to bottom, #ffd700, #cc9900);
        transition: width 0.3s ease;
      }

      .soul-card-mini:hover .mask-health .stat-values {
        display: block;
      }

      .view-deck-btn {
        position: absolute;
        top: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #666;
        padding: 1px 1px;
        font-size: 14px;
        cursor: pointer;
        border-radius: 3px;
        z-index: 1;
      }

      .view-deck-btn:hover {
        border-color: #fff;
        background: rgba(0, 0, 1);
      }

      .map-visual {
        position: relative;
        display: flex;
        flex-direction: row;
        padding: 20px;
        background: rgba(0, 0, 0, 0.3);
        border: 2px solid #333;
        border-radius: 8px;
        overflow-x: auto;
        overflow-y: hidden;
        max-height: 650px;
        height: 650px;
      }

      .map-connections {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 1;
      }

      .map-line {
        stroke: #444;
        stroke-width: 2;
        transition: all 0.3s;
      }

      .map-line.active {
        stroke: #666;
        stroke-width: 3;
      }

      .map-line.available {
        stroke: #0f0;
        stroke-width: 4;
        animation: line-pulse 2s ease-in-out infinite;
      }

      .map-path {
        stroke: #444;
        stroke-width: 2;
        transition: all 0.3s;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .map-path.active {
        stroke: #666;
        stroke-width: 3;
      }

      .map-path.available {
        stroke: #0f0;
        stroke-width: 4;
        animation: line-pulse 2s ease-in-out infinite;
      }

      @keyframes line-pulse {
        0%, 100% { opacity: 0.8; }
        50% { opacity: 0.4; }
      }

      .map-nodes-container {
        position: relative;
        z-index: 2;
        height: 100%;
      }

      .map-layer {
        position: absolute;
        height: 100%;
        width: 80px;
        display: flex;
        align-items: center;
      }

      .map-node {
        position: absolute;
        width: 54px;
        height: 54px;
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #444;
        border-radius: 6px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        transition: all 0.3s;
      }
      
      /* Type-specific colors for revealed mystery nodes */
      .map-node.node-type-void {
        background: rgba(30, 20, 40, 0.9);
        border-color: #9d4edd;
      }
      
      .map-node.node-type-battle {
        background: rgba(40, 20, 20, 0.9);
        border-color: #ff0033;
      }
      
      .map-node.node-type-mask_shop {
        background: rgba(20, 30, 40, 0.9);
        border-color: #4a9eff;
      }
      
      .map-node.node-type-shrine {
        background: rgba(20, 40, 40, 0.9);
        border-color: #4affe0;
      }

      .map-node.current {
        border-color: #a855f7;
        box-shadow: 0 0 15px rgba(168, 85, 247, 0.5);
        transform: scale(1.1);
        z-index: 10;
      }

      .map-node.completed {
        border-color: #666;
        opacity: 0.6;
      }

      .map-node.available {
        border-color: #0f0;
        box-shadow: 0 0 12px rgba(0, 255, 0, 0.3);
        cursor: pointer;
        animation: pulse 2s ease-in-out infinite;
        z-index: 5;
      }

      .map-node.available:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(0, 255, 0, 0.6);
      }

      .map-node.boss {
        width: 70px;
        height: 70px;
        border-color: #ff0033;
        background: rgba(50, 10, 10, 0.9);
      }

      .map-node-icon {
        font-size: 20px;
      }

      .map-node.boss .map-node-icon {
        font-size: 32px;
      }

      .map-node-type {
        font-size: 8px;
        color: #999;
        text-align: center;
        line-height: 1;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .energy-display-left {
        position: fixed;
        bottom: 200px;
        left: 20px;
        z-index: 50;
        background: rgba(10, 10, 10, 0.9);
        border: 2px solid #a855f7;
        padding: 8px 12px;
        border-radius: 4px;
        color: #a855f7;
        font-size: 16px;
        font-weight: bold;
      }

      .pile-viewer-btn {
        position: fixed;
        bottom: 120px;
        z-index: 50;
        background: rgba(30, 30, 30, 0.9);
        border: 2px solid #666;
        color: #fff;
        padding: 10px 15px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
        line-height: 1.4;
      }

      .pile-viewer-btn.left {
        left: 20px;
      }

      .pile-viewer-btn.right {
        right: 20px;
      }

      .pile-viewer-btn.right-top {
        right: 20px;
      }

      .pile-viewer-btn.right-bottom {
        right: 20px;
        bottom: 220px;
      }

      .pile-viewer-btn.right-middle {
        right: 20px;
        bottom: 180px;
      }

      .end-turn-btn {
        position: fixed;
        bottom: 200px;
        right: 20px;
        z-index: 50;
        background: #1a1a1a;
        border: 2px solid #ff0033;
        color: #fff;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .end-turn-btn:hover {
        background: #ff0033;
        transform: scale(1.05);
      }

      .pile-viewer-btn:hover {
        background: rgba(50, 50, 50, 0.95);
        border-color: #fff;
        transform: scale(1.05);
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
        transform: translateY(-4px) scale(1.01);
      }

      .card.trait-choice {
        transform: translateY(0) !important;
      }

      .card.trait-choice:hover {
        transform: scale(1.05) !important;
      }

      .trait-card-choice {
        cursor: pointer;
        transition: all 0.2s;
        transform: translateY(0) !important; /* Override base .card translateY */
      }

      .trait-card-choice:hover {
        transform: scale(1.05) !important; /* Keep at translateY(0), just scale */
        box-shadow: 0 10px 30px rgba(255, 0, 51, 0.8);
        z-index: 10;
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
        position: fixed;
        bottom: 200px;
        left: 50%;
        transform: translateX(-50%);
        max-width: 800px;
        padding: 0 20px;
        z-index: 100;
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

      .mask-description {
        font-size: 10px;
        color: #aaa;
        font-style: italic;
        line-height: 1.2;
        min-height: 30px;
      }

      .mask-shop-actions {
        display: flex;
        gap: 4px;
        width: 100%;
        margin-top: 4px;
      }

      .deck-preview-btn {
        padding: 6px 10px;
        background: #333;
        border: 2px solid #555;
        border-radius: 4px;
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .deck-preview-btn:hover {
        background: #444;
        border-color: #ffd700;
        transform: scale(1.05);
      }

      .deck-preview-card {
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #444;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
      }

      .deck-preview-card .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }

      .deck-preview-card .card-type {
        font-size: 12px;
        color: #888;
        text-transform: uppercase;
        margin-bottom: 5px;
      }

      .deck-preview-card .card-effect {
        color: #ccc;
        font-size: 14px;
        line-height: 1.4;
      }

      .deck-preview-card .card-cost {
        color: #ffd700;
        font-weight: bold;
      }

      .mask-traits {
        font-size: 9px;
        color: #aaa;
      }

      .buy-btn {
        padding: 4px 8px;
        font-size: 10px;
        width: 100%;
      }
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
        font-family: 'IM Fell DW Pica SC', serif;
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

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .pile-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
      }

      .pile-modal {
        background: #1a1a1a;
        border: 3px solid #ff0033;
        padding: 30px;
        max-width: 80%;
        max-height: 80%;
        overflow-y: auto;
        text-align: center;
      }

      .pile-cards {
        margin: 20px 0;
        max-height: 500px;
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
        justify-items: center;
      }

      .pile-cards .card {
        transform: none !important;
        transition: none !important;
      }

      .pile-cards .card:hover {
        transform: none !important;
      }

      #summoning-canvas-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1;
        pointer-events: none;
      }

      #summoning-ui {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        z-index: 10;
        pointer-events: none;
        display: flex;
        justify-content: center;
        align-items: flex-end;
        padding: 20px;
      }

      .summon-void-btn {
        position: absolute;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        pointer-events: auto;
        background: #9d4edd;
        border: 3px solid #fff;
        color: #fff;
        padding: 15px 30px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
      }

      .summon-void-btn:hover {
        background: #b47eee;
        transform: translateX(-50%) scale(1.05);
      }

      .summon-void-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: translateX(-50%);
      }

      .leave-void-btn {
        position: absolute;
        bottom: 20px;
        right: 20px;
        pointer-events: auto;
        background: #1a1a1a;
        border: 2px solid #666;
        color: #fff;
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .leave-void-btn:hover {
        background: #333;
        border-color: #fff;
      }

      .shrine-soul-btn {
        pointer-events: auto;
        background: linear-gradient(135deg, #ffd700 0%, #ffaa00 100%);
        border: 2px solid #fff;
        color: #000;
        padding: 6px 12px;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }

      .shrine-soul-btn:hover {
        background: linear-gradient(135deg, #ffe44d 0%, #ffbb33 100%);
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(255, 215, 0, 0.5);
      }

      #shrine-ui {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: auto;
        max-width: 600px;
        z-index: 10;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 20px;
        background: rgba(10, 10, 10, 0.85);
        border: 2px solid #ffd700;
        border-radius: 6px;
      }

      #shrine-ui * {
        pointer-events: auto;
      }

      #shrine-instruction {
        position: fixed;
        bottom: 200px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        pointer-events: none;
        padding: 8px 16px;
        background: rgba(10, 10, 10, 0.85);
        border: 2px solid #ffd700;
        border-radius: 6px;
        font-size: 13px;
        text-align: center;
      }

      .shrine-skip-btn {
        position: fixed;
        bottom: 200px;
        right: 20px;
        z-index: 10;
        pointer-events: auto;
        background: #1a1a1a;
        border: 2px solid #666;
        color: #fff;
        padding: 8px 16px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }

      .shrine-skip-btn:hover {
        background: #333;
        border-color: #fff;
      }

      #shop-ui {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: auto;
        max-width: 600px;
        z-index: 10;
        pointer-events: none;
        text-align: center;
      }

      #shop-instruction {
        position: fixed;
        bottom: 170px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        pointer-events: none;
        text-align: center;
        font-size: 14px;
      }

      .shop-leave-btn {
        position: fixed;
        bottom: 200px;
        right: 20px;
        z-index: 10;
        pointer-events: auto;
        background: #1a1a1a;
        border: 2px solid #666;
        color: #fff;
        padding: 8px 16px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }

      .shop-leave-btn:hover {
        background: #333;
        border-color: #fff;
      }

      #void-ui {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: auto;
        max-width: 600px;
        z-index: 10;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 20px;
        background: rgba(10, 10, 10, 0.85);
        border: 2px solid #9d4edd;
        border-radius: 6px;
      }

      #void-ui * {
        pointer-events: auto;
      }

      .void-summon-btn {
        position: fixed;
        bottom: 200px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10;
        pointer-events: auto;
        background: linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%);
        border: 2px solid #fff;
        color: #fff;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 6px;
        box-shadow: 0 4px 15px rgba(157, 78, 221, 0.4);
      }

      .void-summon-btn:hover {
        background: linear-gradient(135deg, #b47eee 0%, #9d4edd 100%);
        transform: translateX(-50%) scale(1.05);
        box-shadow: 0 6px 20px rgba(157, 78, 221, 0.6);
      }

      .void-summon-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: translateX(-50%);
      }

      .void-leave-btn {
        position: fixed;
        bottom: 200px;
        right: 20px;
        z-index: 10;
        pointer-events: auto;
        background: #1a1a1a;
        border: 2px solid #666;
        color: #fff;
        padding: 8px 16px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        border-radius: 4px;
      }

      .void-leave-btn:hover {
        background: #333;
        border-color: #fff;
      }
    `;
    document.head.appendChild(style);
  }

  renderMap() {
    console.log('🗺️ renderMap() called');
    const mapScreen = document.getElementById('map-screen');
    const souls = this.game.getSouls();
    const currentNode = this.game.getCurrentNode();
    console.log('Current node:', currentNode);
    const availableNodes = this.game.getAvailableNodes();
    const isComplete = this.game.state.isCurrentNodeComplete();
    console.log('Is complete:', isComplete);

    this.updateCurrencyHUD();

    // Remove old souls bar if exists
    const oldBar = document.querySelector('.souls-bar');
    if (oldBar) oldBar.remove();

    // Build visual node map
    const mapVisual = this.buildMapVisual();

    mapScreen.innerHTML = `
      <h2>🎭 MASK - Seed: ${this.game.state.mapSeed}</h2>

      ${mapVisual}

      ${!isComplete && currentNode ? `
        <div class="panel" style="margin-top: 20px;">
          <h3>Current Location: ${this.getNodeName(currentNode)}</h3>
          <p>${this.getNodeDescription(currentNode)}</p>
          <button onclick="window.ui.enterCurrentNode()">Enter</button>
        </div>
      ` : ''}

      ${isComplete && availableNodes.length > 0 ? `
        <div class="panel" style="margin-top: 20px;">
          <h3>Choose Your Path</h3>
          <p>Click a node on the map to proceed.</p>
        </div>
      ` : ''}

      ${isComplete && availableNodes.length === 0 ? `
        <div class="panel"><h3>🏆 Run Complete!</h3></div>
      ` : ''}
    `;

    // Add souls bar at bottom
    const soulsBar = document.createElement('div');
    soulsBar.className = 'souls-bar';
    soulsBar.innerHTML = `
      ${souls.map(m => {
        // Calculate health percentages for bars
        const healthPercent = (m.blood / m.maxBlood) * 100;
        
        // Display actual mask health if equipped
        let maskHealth = '';
        if (m.mask && m.maskBlood !== undefined && m.maskMaxBlood !== undefined) {
          const maskHealthPercent = (m.maskBlood / m.maskMaxBlood) * 100;
          maskHealth = `<div class="mask-health">
            <span class="stat-icon">🎭</span>
            <span class="stat-values">${m.maskBlood}/${m.maskMaxBlood}</span>
            <div class="health-bar"><div class="health-bar-fill" style="width: ${maskHealthPercent}%"></div></div>
          </div>`;
        } else {
          // Reserve space for mask health even if no mask
          maskHealth = `<div class="mask-health"></div>`;
        }
        
        return `
          <div class="soul-card-mini" data-soul-id="${m.id}">
            <canvas class="soul-preview-mini" id="soul-preview-mini-${m.id}" width="80" height="80"></canvas>
            <div class="soul-name">${m.name}</div>
            <div class="soul-stats">
              <span class="stat-icon">❤️</span>
              <span class="stat-values">${m.blood}/${m.maxBlood}</span>
              <div class="health-bar"><div class="health-bar-fill" style="width: ${healthPercent}%"></div></div>
            </div>
            ${maskHealth}
            ${m.tired ? '<div class="is-tired">💤</div>' : ''}
            <button class="view-deck-btn" onclick="window.ui.viewSoulDeck(${m.id}); event.stopPropagation();">🃏</button>
          </div>
        `;
      }).join('')}
    `;
    document.body.appendChild(soulsBar);

    this.showScreen('map');
    console.log('Map screen shown');
    
    // Render soul previews after DOM is updated
    setTimeout(() => {
      souls.forEach(m => this.renderSoulPreview(m, true));
    }, 0);

    // Bind click handlers to available nodes
    if (isComplete && availableNodes.length > 0) {
      setTimeout(() => {
        availableNodes.forEach(node => {
          const nodeEl = document.getElementById(`map-node-${node.id}`);
          if (nodeEl) {
            nodeEl.style.cursor = 'pointer';
            nodeEl.onclick = () => this.moveToNode(node.id);
          }
        });
      }, 0);
    }

    // Auto-scroll to center current node
    if (currentNode) {
      setTimeout(() => {
        const mapVisual = document.querySelector('.map-visual');
        const currentNodeEl = document.getElementById(`map-node-${currentNode.id}`);
        
        if (mapVisual && currentNodeEl) {
          // Calculate node position relative to container
          const layerWidth = 80;
          const containerHeight = 600;
          const nodeX = currentNode.layer * layerWidth + layerWidth / 2;
          const nodeY = currentNode.x * containerHeight;
          
          // Center the node in the viewport
          const scrollX = nodeX - (mapVisual.clientWidth / 2);
          const scrollY = nodeY - (mapVisual.clientHeight / 2);
          
          mapVisual.scrollTo({
            left: Math.max(0, scrollX),
            top: Math.max(0, scrollY),
            behavior: 'smooth'
          });
        }
      }, 100);
    }

    // Auto-enter current node if not completed
    if (!isComplete && currentNode) {
      console.log('Auto-entering current node in 100ms');
      setTimeout(() => this.enterCurrentNode(), 100);
    }
  }

  buildMapVisual() {
    const nodes = this.game.state.mapNodes;
    const currentNodeId = this.game.state.currentNodeId;
    const completedNodes = this.game.state.completedNodes;
    const availableNodes = this.game.getAvailableNodes().map(n => n.id);

    // Group nodes by layer
    const layers = {};
    nodes.forEach(node => {
      if (!layers[node.layer]) layers[node.layer] = [];
      layers[node.layer].push(node);
    });

    const maxLayer = Math.max(...Object.keys(layers).map(Number));
    const containerHeight = 600; // Fixed height for vertical spread
    const layerWidth = 80; // Width per layer (horizontal spacing)
    const nodeRadius = 27;

    // Build SVG for connections
    let svg = `<svg class="map-connections" width="${(maxLayer + 1) * layerWidth}" height="${containerHeight}">`;

    // Draw elbow connections between nodes
    nodes.forEach(node => {
      const fromX = node.layer * layerWidth + layerWidth / 2;
      const fromY = node.x * containerHeight;

      node.connections.forEach(targetId => {
        const targetNode = nodes.find(n => n.id === targetId);
        if (targetNode) {
          const toX = targetNode.layer * layerWidth + layerWidth / 2;
          const toY = targetNode.x * containerHeight;

          const isActive = (node.id === currentNodeId && availableNodes.includes(targetId)) ||
                          (completedNodes.includes(node.id) && completedNodes.includes(targetId));
          const isAvailable = node.id === currentNodeId && availableNodes.includes(targetId);

          // Create elbow path: horizontal -> vertical with rounded corner
          const midX = (fromX + toX) / 2;
          const cornerRadius = 15;
          
          // Determine if going up or down
          const goingDown = toY > fromY;
          const verticalDist = Math.abs(toY - fromY);
          const useCorner = verticalDist > cornerRadius * 2;
          
          let pathData;
          if (useCorner) {
            if (goingDown) {
              pathData = `
                M ${fromX} ${fromY}
                L ${midX - cornerRadius} ${fromY}
                Q ${midX} ${fromY}, ${midX} ${fromY + cornerRadius}
                L ${midX} ${toY - cornerRadius}
                Q ${midX} ${toY}, ${midX + cornerRadius} ${toY}
                L ${toX} ${toY}
              `;
            } else {
              pathData = `
                M ${fromX} ${fromY}
                L ${midX - cornerRadius} ${fromY}
                Q ${midX} ${fromY}, ${midX} ${fromY - cornerRadius}
                L ${midX} ${toY + cornerRadius}
                Q ${midX} ${toY}, ${midX + cornerRadius} ${toY}
                L ${toX} ${toY}
              `;
            }
          } else {
            // Straight line if too close vertically
            pathData = `M ${fromX} ${fromY} L ${toX} ${toY}`;
          }

          svg += `<path 
            d="${pathData}"
            class="map-path ${isActive ? 'active' : ''} ${isAvailable ? 'available' : ''}"
            fill="none"
          />`;
        }
      });
    });

    svg += '</svg>';

    let html = `<div class="map-visual">`;
    html += svg;
    html += '<div class="map-nodes-container">';

    // Render each layer as a column
    for (let layer = 0; layer <= maxLayer; layer++) {
      const layerNodes = layers[layer] || [];
      
      html += `<div class="map-layer" style="left: ${layer * layerWidth}px;">`;
      
      layerNodes.forEach(node => {
        const isCurrent = node.id === currentNodeId;
        const isCompleted = completedNodes.includes(node.id);
        const isAvailable = availableNodes.includes(node.id);
        const isBoss = node.isBoss;
        
        // Check if mystery node is revealed
        const isVisited = this.game.state.visitedNodes.includes(node.id);
        const revealedType = node.type === 'mystery' ? this.getRevealedMysteryType(node) : null;
        const isRevealedMystery = node.type === 'mystery' && (isVisited || revealedType);
        const actualType = isRevealedMystery 
          ? (isVisited ? (this.game.state.mysteryRevealed || 'mystery') : revealedType)
          : node.type;
        
        let statusClass = '';
        if (isCurrent) statusClass = 'current';
        else if (isCompleted) statusClass = 'completed';
        else if (isAvailable) statusClass = 'available';

        const topPos = node.x * containerHeight - nodeRadius;
        
        html += `
          <div id="map-node-${node.id}" 
               class="map-node ${statusClass} ${isBoss ? 'boss' : ''} node-type-${actualType}"
               style="top: ${topPos}px;">
            <div class="map-node-icon">${this.getNodeIcon(node)}</div>
            <div class="map-node-type">${this.getNodeName(node)}</div>
          </div>
        `;
      });
      
      html += `</div>`;
    }

    html += '</div>';
    html += '</div>';
    return html;
  }

  getNodeIcon(node) {
    if (node.isBoss) return '💀';
    
    // Check if this is a mystery node that has been visited or revealed
    if (node.type === 'mystery') {
      const isVisited = this.game.state.visitedNodes.includes(node.id);
      const revealedType = this.getRevealedMysteryType(node);
      
      if (isVisited || revealedType) {
        // Show the revealed icon with a small ? indicator
        const actualType = isVisited ? (this.game.state.mysteryRevealed || 'mystery') : revealedType;
        let icon = '❓';
        switch(actualType) {
          case 'void': icon = '🌀'; break;
          case 'battle': icon = '⚔️'; break;
          case 'mask_shop': icon = '🎭'; break;
          case 'shrine': 
            // If mystery revealed as shrine, show specific shrine icon if available
            if (node.shrine && this.game.config.shrineTypes[node.shrine]) {
              icon = this.game.config.shrineTypes[node.shrine].icon || '✨';
            } else {
              icon = '✨';
            }
            break;
        }
        return `<span style="position: relative;">${icon}<span style="position: absolute; top: -2px; right: -2px; font-size: 8px; opacity: 0.7;">❓</span></span>`;
      }
      return '❓';
    }
    
    // For shrine nodes, show specific shrine icon if available
    if (node.type === 'shrine') {
      const isVisited = this.game.state.visitedNodes.includes(node.id);
      const revealedByForesight = this.getNodeDistance(this.game.state.getCurrentNode(), node) === 1 && 
                                   this.game.state.getActiveMarks().some(m => m.id === 'foresight');
      
      if ((isVisited || revealedByForesight) && node.shrine && this.game.config.shrineTypes[node.shrine]) {
        return this.game.config.shrineTypes[node.shrine].icon || '✨';
      }
      return '✨'; // Generic shrine icon when not revealed
    }
    
    switch(node.type) {
      case 'void': return '🌀';
      case 'battle': return '⚔️';
      case 'mask_shop': return '🎭';
      case 'shrine': return '✨';
      case 'mystery': return '❓';
      default: return '◆';
    }
  }

  getNodeName(node) {
    if (!node) return 'Unknown';
    if (node.name) return node.name;
    if (node.isBoss) return 'BOSS';
    
    // Check if this is a mystery node revealed by foresight
    if (node.type === 'mystery') {
      const revealedType = this.getRevealedMysteryType(node);
      if (revealedType) {
        switch(revealedType) {
          case 'void': return 'Void';
          case 'battle': return 'Battle';
          case 'mask_shop': return 'Shop';
          case 'shrine':
            // Show specific shrine name if available
            if (node.shrine && this.game.config.shrineTypes[node.shrine]) {
              return this.game.config.shrineTypes[node.shrine].name.replace(' Shrine', '');
            }
            return 'Shrine';
          default: return '';
        }
      }
      return ''; // Mystery nodes have no label if not revealed
    }
    
    // For shrine nodes, show specific shrine name when revealed
    if (node.type === 'shrine') {
      const isVisited = this.game.state.visitedNodes.includes(node.id);
      const revealedByForesight = this.getNodeDistance(this.game.state.getCurrentNode(), node) === 1 && 
                                   this.game.state.getActiveMarks().some(m => m.id === 'foresight');
      
      if ((isVisited || revealedByForesight) && node.shrine && this.game.config.shrineTypes[node.shrine]) {
        return this.game.config.shrineTypes[node.shrine].name.replace(' Shrine', '');
      }
      return 'Shrine';
    }
    
    const type = node.type === 'mystery' ? (this.game.state.mysteryRevealed || 'mystery') : node.type;
    
    switch(type) {
      case 'void': return 'Void';
      case 'battle': return 'Battle';
      case 'mask_shop': return 'Shop';
      case 'shrine': return 'Shrine';
      case 'mystery': return '';
      default: return '';
    }
  }

  // Check if a mystery node should be revealed by Mark of Foresight
  getRevealedMysteryType(node) {
    if (node.type !== 'mystery') return null;
    
    // Get all active foresight marks
    const marks = this.game.state.getActiveMarks();
    const foresightMarks = marks.filter(m => m.id === 'mark_of_foresight');
    
    if (foresightMarks.length === 0) return null;
    
    // Find the highest reveal distance from all foresight marks
    let maxRevealDistance = 0;
    for (const mark of foresightMarks) {
      const distance = mark.effect.reveal_distance || 0;
      if (distance > maxRevealDistance) {
        maxRevealDistance = distance;
      }
    }
    
    // Check if this node is within reveal distance
    const currentNode = this.game.state.getCurrentNode();
    if (!currentNode) return null;
    
    const distanceToNode = this.getNodeDistance(currentNode, node);
    
    if (distanceToNode > 0 && distanceToNode <= maxRevealDistance) {
      // Reveal the mystery! Generate a random type if not already revealed
      if (!node.revealedType) {
        const types = ['battle', 'void', 'mask_shop', 'shrine'];
        node.revealedType = types[Math.floor(Math.random() * types.length)];
      }
      return node.revealedType;
    }
    
    return null;
  }

  // Calculate shortest path distance between two nodes
  getNodeDistance(fromNode, toNode) {
    if (fromNode.id === toNode.id) return 0;
    
    // BFS to find shortest path
    const queue = [{ node: fromNode, distance: 0 }];
    const visited = new Set([fromNode.id]);
    
    while (queue.length > 0) {
      const { node, distance } = queue.shift();
      
      for (const connectionId of node.connections) {
        if (connectionId === toNode.id) {
          return distance + 1;
        }
        
        if (!visited.has(connectionId)) {
          visited.add(connectionId);
          const nextNode = this.game.state.mapNodes.find(n => n.id === connectionId);
          if (nextNode) {
            queue.push({ node: nextNode, distance: distance + 1 });
          }
        }
      }
    }
    
    return -1; // Not reachable
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
    // Automatically enter the node instead of showing the "current location" screen
    this.enterCurrentNode();
  }

  enterCurrentNode() {
    sfx.buttonClick();
    console.log('🚪 enterCurrentNode() called');
    const isComplete = this.game.state.isCurrentNodeComplete();
    if (isComplete) {
      alert('This node has already been completed!');
      return;
    }
    
    const node = this.game.getCurrentNode();
    console.log('Entering node:', node);
    const actualType = node.type === 'mystery' ? this.game.state.mysteryRevealed : node.type;
    console.log('Actual type:', actualType);
    
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
    console.log('🌀 renderVoidNode() called');
    const summonCost = this.game.config.soulConfig.summon_cost;
    const canAfford = this.game.state.darkEnergy >= summonCost;
    const hasSouls = this.game.getSouls().length > 0;

    this.updateCurrencyHUD();
    console.log('About to build summoning screen HTML');

    // Hide souls bar during void scene
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'none';
    }

    // Show the summoning screen with 3D void scene
    const summoningScreen = document.getElementById('summoning-screen');
    summoningScreen.innerHTML = `
      <div id="summoning-canvas-container"></div>
      <div id="void-ui">
        <h2 style="margin: 0 0 8px 0; text-align: center; font-size: 18px;">🌀 The Void</h2>
        <p style="margin: 0; text-align: center; color: #ccc; font-size: 12px;">Summon a soul from the darkness</p>
      </div>
      <button class="void-summon-btn" onclick="window.ui.summonSoulFromVoid()" ${!canAfford ? 'disabled' : ''}>
        Summon Soul (${summonCost} ⚡)
      </button>
      ${hasSouls ? '<button class="void-leave-btn" onclick="window.ui.backToMap()">Leave</button>' : ''}
    `;

    console.log('Calling showScreen(summoning)');
    this.showScreen('summoning');
    console.log('Summoning screen should now be visible');
    
    // Initialize the void scene (without a soul - just show the portal)
    console.log('Calling initVoidScene()');
    this.initVoidScene();
  }

  initVoidScene() {
    const container = document.getElementById('summoning-canvas-container');
    if (!container) return;

    // Scene with gradient background
    const scene = new THREE.Scene();
    
    // Create gradient background using a large plane with gradient material
    const gradientCanvas = document.createElement('canvas');
    gradientCanvas.width = 2;
    gradientCanvas.height = 256;
    const gradientCtx = gradientCanvas.getContext('2d');
    const gradient = gradientCtx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#2a1a3a'); // Lighter purple at top
    gradient.addColorStop(1, '#000000'); // Black at bottom
    gradientCtx.fillStyle = gradient;
    gradientCtx.fillRect(0, 0, 2, 256);
    
    const gradientTexture = new THREE.CanvasTexture(gradientCanvas);
    const backgroundGeometry = new THREE.PlaneGeometry(100, 100);
    const backgroundMaterial = new THREE.MeshBasicMaterial({ 
      map: gradientTexture,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const background = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    background.position.z = -10;
    scene.add(background);
    
    scene.fog = new THREE.Fog(0x1a0a1a, 5, 15);

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

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

    const halftonePass = new ShaderPass(HalftoneShader);
    halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

    // Add appropriate pass based on current mode
    if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
      pixelPass.renderToScreen = true;
      composer.addPass(pixelPass);
    } else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
      halftonePass.renderToScreen = true;
      composer.addPass(halftonePass);
    } else {
      renderPass.renderToScreen = true;
    }

    // Create layered void portal with multiple offset toruses
    const portalLayers = [];
    const layerConfigs = [
      { radius: 0.8, tube: 0.25, color: 0x0a0014, rotationSpeed: 0.02, offset: { x: 0, y: 0, z: 0 } },
      { radius: 0.75, tube: 0.22, color: 0x1a0a2e, rotationSpeed: -0.025, offset: { x: 0.05, y: -0.03, z: 0.1 } },
      { radius: 0.7, tube: 0.2, color: 0x2a1540, rotationSpeed: 0.03, offset: { x: -0.03, y: 0.05, z: -0.08 } },
      { radius: 0.85, tube: 0.18, color: 0x150a24, rotationSpeed: -0.018, offset: { x: 0.02, y: 0.04, z: 0.05 } }
    ];
    
    layerConfigs.forEach(config => {
      const torusGeom = new THREE.TorusGeometry(config.radius, config.tube, 16, 32);
      const torusMat = new THREE.MeshBasicMaterial({ 
        color: config.color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const torus = new THREE.Mesh(torusGeom, torusMat);
      torus.rotation.x = Math.PI / 2;
      torus.position.y = 0.3 + config.offset.y;
      torus.position.x = config.offset.x;
      torus.position.z = config.offset.z;
      torus.userData.rotationSpeed = config.rotationSpeed;
      scene.add(torus);
      portalLayers.push(torus);
    });

    // Create eerie particle system for magenta and purple sparkles
    const particleCount = 60;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const isMagenta = Math.random() > 0.5;
      const particleGeom = new THREE.SphereGeometry(0.02, 4, 4);
      const particleMat = new THREE.MeshBasicMaterial({ 
        color: isMagenta ? 0xff00ff : 0x9d4edd,
        transparent: true,
        opacity: 0.6,
        depthTest: false // Render on top of everything
      });
      const particle = new THREE.Mesh(particleGeom, particleMat);
      particle.renderOrder = 999; // Render after everything else
      
      // Random position, focusing more on lower part of screen
      particle.position.x = (Math.random() - 0.5) * 6;
      particle.position.y = Math.random() * 2 - 0.5; // Mostly lower
      particle.position.z = (Math.random() - 0.5) * 6;
      
      // Very slow, eerie velocity
      particle.userData.velocity = {
        x: (Math.random() - 0.5) * 0.003,
        y: (Math.random() - 0.5) * 0.002,
        z: (Math.random() - 0.5) * 0.003
      };
      
      scene.add(particle);
      particles.push(particle);
    }

    // Purple light from portal (dimmer for eeriness)
    const light = new THREE.PointLight(0x9d4edd, 2, 10);
    light.position.set(0, 0.3, 0);
    scene.add(light);

    // Ambient light (much darker)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    // Directional lights (dimmer)
    const mainLight = new THREE.DirectionalLight(0x9d4edd, 1.5);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xff00ff, 1.0);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Rim light for souls - purple/magenta from behind to make them pop
    const soulRimLight = new THREE.DirectionalLight(0xcc44ff, 3.0);
    soulRimLight.position.set(0, 2, -5); // From behind and above
    scene.add(soulRimLight);

    // Store scene data
    this.voidScene = { scene, camera, renderer, composer, renderPass, pixelPass, halftonePass, portalLayers, light, particles, background, soulRimLight };

    // Listen for post-processing changes
    const ppHandler = (e) => {
      if (!this.voidScene) return;
      const { mode } = e.detail;
      
      // Remove effect passes (keep render pass)
      composer.passes = [renderPass];
      
      // Add appropriate pass
      if (mode === 'pixelation') {
        pixelPass.renderToScreen = true;
        composer.addPass(pixelPass);
      } else if (mode === 'halftone') {
        halftonePass.renderToScreen = true;
        composer.addPass(halftonePass);
      } else {
        renderPass.renderToScreen = true;
      }
    };
    window.addEventListener('postProcessingChanged', ppHandler);
    this.voidScene.ppHandler = ppHandler;

    // Animate
    const animate = () => {
      if (!this.voidScene) return;
      
      const time = Date.now() * 0.001;
      
      // Rotate each portal layer at different speeds for frenetic effect
      portalLayers.forEach(layer => {
        layer.rotation.z += layer.userData.rotationSpeed;
      });
      
      // Pulse light slowly and eerily
      light.intensity = 2 + Math.sin(time * 0.5) * 0.5;
      
      // Very slow eerie particle drift
      particles.forEach((particle, i) => {
        particle.position.x += particle.userData.velocity.x;
        particle.position.y += particle.userData.velocity.y;
        particle.position.z += particle.userData.velocity.z;
        
        // Wrap around if they drift too far
        if (Math.abs(particle.position.x) > 4) particle.position.x *= -0.9;
        if (Math.abs(particle.position.z) > 4) particle.position.z *= -0.9;
        if (particle.position.y > 3) particle.position.y = -0.5;
        if (particle.position.y < -1) particle.position.y = 3;
        
        // Very slow, eerie pulsing opacity
        particle.material.opacity = 0.3 + Math.sin(time * 0.3 + i * 0.5) * 0.3;
      });
      
      composer.render();
      this.voidAnimationId = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      if (!this.voidScene) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
      halftonePass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    });
  }

  disposeVoidScene() {
    if (this.voidAnimationId) {
      cancelAnimationFrame(this.voidAnimationId);
      this.voidAnimationId = null;
    }
    if (this.voidScene) {
      if (this.voidScene.ppHandler) {
        window.removeEventListener('postProcessingChanged', this.voidScene.ppHandler);
      }
      this.voidScene.renderer.dispose();
      this.voidScene = null;
    }
  }

  summonSoulFromVoid() {
    sfx.buttonClick();
    const result = this.game.summonSoul();
    if (!result.success) {
      sfx.error();
      alert(result.error);
      return;
    }
    
    this.pendingSoul = result.soul;
    
    // Hide UI elements including souls bar
    const voidUI = document.getElementById('void-ui');
    const summonBtn = document.querySelector('.void-summon-btn');
    const leaveBtn = document.querySelector('.void-leave-btn');
    const soulsBar = document.querySelector('.souls-bar');
    if (voidUI) voidUI.style.display = 'none';
    if (summonBtn) summonBtn.style.display = 'none';
    if (leaveBtn) leaveBtn.style.display = 'none';
    if (soulsBar) soulsBar.style.display = 'none';
    
    // Trigger summoning animation in the existing void scene
    if (this.voidScene) {
      this.startVoidSummonAnimation();
    }
  }
  
  startVoidSummonAnimation() {
    const { scene, portalLayers, light, particles, background } = this.voidScene;
    
    // Start the swelling sound that builds during particle acceleration
    const swellSound = sfx.startVoidSwell(1.2);
    
    // Create flash overlay
    const flashOverlay = document.createElement('div');
    flashOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #9d4edd;
      opacity: 0;
      z-index: 5;
      pointer-events: none;
    `;
    document.body.appendChild(flashOverlay);
    
    // Load soul mesh
    const soulMesh = this.prefabManager.instantiate(`soul_${this.pendingSoul.type}`);
    if (soulMesh) {
      soulMesh.position.set(0, 0.3, 0);
      soulMesh.scale.set(0, 0, 0);
      scene.add(soulMesh);
    }
    
    // Store initial particle positions for slam effect
    const particleInitialPositions = particles.map(p => ({
      x: p.position.x,
      y: p.position.y,
      z: p.position.z
    }));
    
    // Animation phases
    let phase = 'light_building'; // light_building -> flash -> reveal -> slam -> idle
    let time = 0;
    const startTime = Date.now();
    let slamStarted = false;
    
    // Update animation loop to handle summoning
    const originalAnimate = this.voidAnimationId;
    cancelAnimationFrame(originalAnimate);
    
    const animateSummoning = () => {
      if (!this.voidScene) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      time += 0.016;
      
      // Rotate portal layers
      portalLayers.forEach(layer => {
        layer.rotation.z += layer.userData.rotationSpeed * 1.5; // Faster during summoning
      });
      
      // Phase 1: Light building with ramping particles (1.2 seconds)
      if (phase === 'light_building' && elapsed < 1.2) {
        const progress = elapsed / 1.2;
        const rampSpeed = progress * progress * progress; // Cubic ramp - faster at end
        
        light.intensity = 2 + progress * 13;
        
        // Particles zoom into the center point (0, 0.3, 0) - converge faster as time goes on
        particles.forEach(particle => {
          const targetX = 0;
          const targetY = 0.3;
          const targetZ = 0;
          
          const dx = (targetX - particle.position.x) * 0.05 * (1 + rampSpeed * 8);
          const dy = (targetY - particle.position.y) * 0.05 * (1 + rampSpeed * 8);
          const dz = (targetZ - particle.position.z) * 0.05 * (1 + rampSpeed * 8);
          
          particle.position.x += dx;
          particle.position.y += dy;
          particle.position.z += dz;
          particle.material.opacity = 0.5 + rampSpeed * 0.5;
        });
      }
      // Phase 2: Flash (0.2 seconds)
      else if (phase === 'light_building' || (phase === 'flash' && elapsed < 1.4)) {
        if (phase === 'light_building') {
          phase = 'flash';
          
          // Particles continue converging into the exact center during flash
          particles.forEach(particle => {
            particle.position.set(0, 0.3, 0);
          });
          
          // Start flash
          flashOverlay.style.transition = 'opacity 0.2s';
          flashOverlay.style.opacity = '0.9';
          
          // Play flash sound - high pitch impact
          sfx.playTone(800, 0.2, 0.4, 'square');
          setTimeout(() => sfx.playTone(600, 0.2, 0.3, 'square'), 50);
        }
        light.intensity = 20;
      }
      // Phase 3: Reveal soul with rumble (0.8 seconds)
      else if (phase === 'flash' || (phase === 'reveal' && elapsed < 2.2)) {
        if (phase === 'flash') {
          phase = 'reveal';
          // Fade out flash
          flashOverlay.style.transition = 'opacity 0.3s';
          flashOverlay.style.opacity = '0';
          setTimeout(() => flashOverlay.remove(), 300);
          
          // Play rumble sound - low bass rumble
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              sfx.playTone(60 + Math.random() * 20, 0.1, 0.3, 'sawtooth');
            }, i * 100);
          }
        }
        
        const revealProgress = (elapsed - 1.4) / 0.8;
        const easeOut = 1 - Math.pow(1 - revealProgress, 3);
        
        if (soulMesh) {
          // Rumble effect - shake while growing
          const rumble = Math.sin(revealProgress * 40) * 0.05 * (1 - revealProgress);
          soulMesh.scale.set(easeOut, easeOut, easeOut);
          soulMesh.position.x = rumble;
          soulMesh.rotation.z = rumble * 0.5;
        }
        light.intensity = 20 - (revealProgress * 18);
        
        // Particles stay near portal during reveal
        particles.forEach(particle => {
          particle.material.opacity = 0.8;
        });
      }
      // Phase 4: SLAM particles outward (0.6 seconds)
      else if (phase === 'reveal' || (phase === 'slam' && elapsed < 2.8)) {
        if (phase === 'reveal') {
          phase = 'slam';
          slamStarted = true;
          
          // Lighten background gradient to medium dark purple
          const ctx = background.material.map.image.getContext('2d');
          const newGradient = ctx.createLinearGradient(0, 0, 0, 256);
          newGradient.addColorStop(0, '#6a4a7a'); // Lighter purple at top
          newGradient.addColorStop(1, '#2a1a3a'); // Medium purple at bottom
          ctx.fillStyle = newGradient;
          ctx.fillRect(0, 0, 2, 256);
          background.material.map.needsUpdate = true;
          scene.fog.color.set(0x4a2a5a);
          
          // Play slam sound - explosive burst
          sfx.playTone(400, 0.3, 0.5, 'sawtooth');
          setTimeout(() => sfx.playTone(200, 0.4, 0.4, 'square'), 50);
          setTimeout(() => sfx.playTone(100, 0.5, 0.3, 'triangle'), 100);
          
          // Give particles explosive outward velocity
          particles.forEach(particle => {
            const angle = Math.random() * Math.PI * 2;
            const upAngle = Math.random() * Math.PI * 0.5 - 0.2;
            const speed = 0.15 + Math.random() * 0.1;
            
            particle.userData.slamVelocity = {
              x: Math.cos(angle) * Math.cos(upAngle) * speed,
              y: Math.sin(upAngle) * speed * 0.5,
              z: Math.sin(angle) * Math.cos(upAngle) * speed
            };
          });
        }
        
        const slamProgress = (elapsed - 2.2) / 0.6;
        const damping = Math.pow(0.95, slamProgress * 60); // Slow down over time
        
        if (soulMesh) {
          // Soul settles into position
          soulMesh.position.x = 0;
          soulMesh.rotation.z = 0;
        }
        
        // Particles blast outward then slow down
        particles.forEach(particle => {
          if (particle.userData.slamVelocity) {
            particle.position.x += particle.userData.slamVelocity.x * damping;
            particle.position.y += particle.userData.slamVelocity.y * damping;
            particle.position.z += particle.userData.slamVelocity.z * damping;
            particle.material.opacity = 0.8 * (1 - slamProgress * 0.5);
          }
        });
        
        light.intensity = 2 + (1 - slamProgress) * 3;
      }
      // Phase 5: Idle - show speech bubble and naming UI together
      else if (phase === 'slam') {
        phase = 'idle';
        
        // Show speech bubble and naming UI at the same time
        if (this.pendingSoul.quote) {
          this.showSoulSpeechBubble(this.pendingSoul.quote);
        }
        this.showVoidNamingUI();
        
        // Reset particles to normal drift
        particles.forEach((particle, i) => {
          particle.userData.slamVelocity = null;
        });
      }
      
      // Continue idle animation
      if (phase === 'idle') {
        if (soulMesh) {
          soulMesh.position.y = 0.3 + Math.sin(time * 2) * 0.1;
          soulMesh.rotation.y += 0.01;
        }
        light.intensity = 2 + Math.sin(time * 0.5) * 0.5;
        
        particles.forEach((particle, i) => {
          particle.position.x += particle.userData.velocity.x;
          particle.position.y += particle.userData.velocity.y;
          particle.position.z += particle.userData.velocity.z;
          
          if (Math.abs(particle.position.x) > 4) particle.position.x *= -0.9;
          if (Math.abs(particle.position.z) > 4) particle.position.z *= -0.9;
          if (particle.position.y > 3) particle.position.y = -0.5;
          if (particle.position.y < -1) particle.position.y = 3;
          
          particle.material.opacity = 0.3 + Math.sin(time * 0.3 + i * 0.5) * 0.3;
        });
      }
      
      this.voidScene.composer.render();
      this.voidAnimationId = requestAnimationFrame(animateSummoning);
    };
    
    animateSummoning();
  }
  
  showSoulSpeechBubble(text, onComplete) {
    // Randomly choose left or right side
    const isLeft = Math.random() < 0.5;
    
    const speechBubble = document.createElement('div');
    speechBubble.id = 'soul-speech-bubble';
    speechBubble.style.cssText = `
      position: fixed;
      top: 50%;
      ${isLeft ? 'left: 15%' : 'right: 15%'};
      transform: translateY(-50%);
      z-index: 15;
      background: #000000;
      padding: 15px 20px;
      border-radius: 15px;
      max-width: 250px;
      pointer-events: none;
    `;
    
    // Add pointer triangle
    const pointer = document.createElement('div');
    pointer.style.cssText = `
      position: absolute;
      top: 50%;
      ${isLeft ? 'right: -15px' : 'left: -15px'};
      transform: translateY(-50%);
      width: 0;
      height: 0;
      border-top: 15px solid transparent;
      border-bottom: 15px solid transparent;
      ${isLeft ? 'border-left: 15px solid #000000' : 'border-right: 15px solid #000000'};
    `;
    speechBubble.appendChild(pointer);
    
    const textElement = document.createElement('p');
    textElement.style.cssText = `
      margin: 0;
      color: #fff;
      font-size: 14px;
      font-style: italic;
      text-align: center;
      line-height: 1.4;
    `;
    speechBubble.appendChild(textElement);
    document.body.appendChild(speechBubble);
    
    // Typewriter effect with sound
    let charIndex = 0;
    const typeSpeed = 50; // milliseconds per character
    
    const typeNextChar = () => {
      if (charIndex < text.length) {
        textElement.textContent += text[charIndex];
        
        // Play MIDI sound for each character (skip spaces)
        if (text[charIndex] !== ' ') {
          const pitch = 200 + Math.random() * 200; // Random pitch for variety
          sfx.playTone(pitch, 0.05, 0.15, 'square');
        }
        
        charIndex++;
        setTimeout(typeNextChar, typeSpeed);
      } else {
        // Text complete, wait a bit then fade out
        setTimeout(() => {
          speechBubble.style.transition = 'opacity 0.5s';
          speechBubble.style.opacity = '0';
          setTimeout(() => {
            speechBubble.remove();
            if (onComplete) onComplete();
          }, 500);
        }, 1500); // Show complete text for 1.5 seconds
      }
    };
    
    typeNextChar();
  }

  showVoidNamingUI() {
    const isResurrected = this.pendingSoul.isResurrected;
    const originalName = this.pendingSoul.originalName;
    
    const nameForm = document.createElement('div');
    nameForm.id = 'void-name-form';
    nameForm.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 10;
      background: rgba(10, 10, 10, 0.95);
      border: 2px solid #9d4edd;
      padding: 20px 30px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
    `;
    
    const headerText = isResurrected 
      ? `${this.pendingSoul.type} Soul Resurrected` 
      : `${this.pendingSoul.type} Soul Summoned`;
    
    nameForm.innerHTML = `
      <h3 style="margin: 0; text-align: center; color: ${isResurrected ? '#ff6b6b' : '#9d4edd'};">${headerText}</h3>
      ${isResurrected ? '<p style="margin: 0; color: #999; font-size: 0.9em; text-align: center;">This soul has returned from the void...</p>' : ''}
      <input type="text" id="void-soul-name-input" placeholder="Name your soul..." maxlength="20" value="${isResurrected ? originalName : ''}" style="width: 300px; padding: 10px; background: #1a1a1a; border: 2px solid #666; color: #fff; border-radius: 4px; text-align: center; font-family: 'IM Fell DW Pica SC', serif; font-size: 1.17em;" />
      <button id="void-confirm-soul-name-btn" ${isResurrected ? '' : 'disabled'} style="padding: 10px 20px; background: #9d4edd; border: 2px solid #fff; color: #fff; cursor: ${isResurrected ? 'pointer' : 'not-allowed'}; border-radius: 4px; opacity: ${isResurrected ? '1' : '0.5'};">Confirm</button>
      <div id="rename-sass" style="color: #ff6b6b; font-size: 0.85em; min-height: 20px; text-align: center; font-style: italic;"></div>
    `;
    document.body.appendChild(nameForm);
    
    const input = document.getElementById('void-soul-name-input');
    const confirmBtn = document.getElementById('void-confirm-soul-name-btn');
    const sassDiv = document.getElementById('rename-sass');
    
    let nameChanged = false;
    
    // Enable button when text is entered
    input.addEventListener('input', () => {
      if (input.value.trim().length > 0) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = '1';
        confirmBtn.style.cursor = 'pointer';
        
        // Show sass if resurrected and name changed
        if (isResurrected && input.value.trim() !== originalName && !nameChanged) {
          import('./core/SoulMemory.js').then(module => {
            sassDiv.textContent = module.SoulMemory.getRenameQuote();
          });
          nameChanged = true;
        } else if (isResurrected && input.value.trim() === originalName) {
          sassDiv.textContent = '';
          nameChanged = false;
        }
      } else {
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = '0.5';
        confirmBtn.style.cursor = 'not-allowed';
      }
    });
    
    const confirmHandler = () => {
      const name = input.value.trim();
      if (!name) return;
      
      this.pendingSoul.name = name;
      console.log('Summoned:', this.pendingSoul.name);
      
      // Save to soul memory (store reference before clearing pendingSoul)
      const soulToRemember = this.pendingSoul;
      import('./core/SoulMemory.js').then(module => {
        module.SoulMemory.rememberSoul(soulToRemember);
      });
      
      // Remove naming UI
      nameForm.remove();
      
      // Dispose void scene and return to map
      this.disposeVoidScene();
      this.pendingSoul = null;
      
      // Mark void as complete and go back to map
      this.game.state.completeCurrentNode();
      this.renderMap();
    };
    
    confirmBtn.onclick = confirmHandler;
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && input.value.trim().length > 0) {
        confirmHandler();
      }
    });
    
    // Auto-focus input
    setTimeout(() => {
      input.focus();
      if (isResurrected) {
        input.select(); // Select the text so they can easily change it
      }
    }, 100);
  }

  renderMaskShop(fullRender = true) {
    const offering = this.game.state.maskShopOffering;
    const costs = this.game.config.maskConfig.costs;
    const tempMask = this.game.tempMask;
    const souls = this.game.getSouls();
    const coins = this.game.state.coins;
    const soldMasks = this.game.state.soldMasks;

    this.updateCurrencyHUD();

    // If we're just updating (not full render), only update the mask grid
    if (!fullRender) {
      this.updateMaskShopGrid();
      return;
    }

    // Combine all masks into one array with rarity info
    const allMasks = [
      ...offering.legendary.map((m, i) => ({ ...m, rarity: 'legendary', index: i, cost: costs.legendary, sold: soldMasks.legendary.includes(i) })),
      ...offering.rare.map((m, i) => ({ ...m, rarity: 'rare', index: i, cost: costs.rare, sold: soldMasks.rare.includes(i) })),
      ...offering.common.map((m, i) => ({ ...m, rarity: 'common', index: i, cost: costs.common, sold: soldMasks.common.includes(i) }))
    ];

    // Show the mask shop screen with 3D scene
    const summoningScreen = document.getElementById('summoning-screen');
    summoningScreen.innerHTML = `
      <div id="summoning-canvas-container"></div>
      <div id="shop-ui">
        <h2 style="margin: 0 0 8px 0; text-align: center; font-size: 18px;">🎭 Mask Vendor</h2>
        <p style="margin: 0; text-align: center; color: #ccc; font-size: 12px;">Purchase masks to empower your souls</p>
      </div>

      ${tempMask ? `
        <div id="shop-instruction">
          <strong style="color: #ffd700;">Choose a soul to equip "${tempMask.name}" ↓</strong>
        </div>
      ` : ''}

      <div class="mask-shop-grid">
        ${allMasks.map(mask => {
          // Fix texture path for HTML img src - use base URL for deployed builds
          const base = import.meta.env.BASE_URL || './';
          let texturePath;
          if (mask.texture) {
            // Strip leading ./ and prepend base URL
            const cleanPath = mask.texture.startsWith('./') 
              ? mask.texture.slice(2)
              : mask.texture;
            texturePath = base + cleanPath;
          } else {
            texturePath = base + 'masks/fallback_mask.png';
          }
          
          return `
          <div class="mask-shop-card ${mask.rarity} ${mask.sold ? 'sold-out' : ''}" style="position: relative;">
            <button class="deck-preview-btn" onclick="window.ui.showMaskDeck('${mask.id}')" title="View Cards" style="
              position: absolute;
              top: 0;
              right: 0;
              padding: 0;
              margin: 0;
              width: 30px;
              height: 30px;
              font-size: 16px;
              z-index: 10;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              🃏
            </button>
            <img src="${texturePath}" alt="${mask.name}" class="mask-image">
            <div class="mask-card-info">
              <strong style="display: block; margin-bottom: 4px;">${mask.name}</strong>
              <div class="mask-description" style="font-size: 10px; color: #aaa; font-style: italic; margin-bottom: 8px;">${mask.description || ''}</div>
              <div class="mask-shop-actions">
                ${mask.sold ? `
                  <button class="buy-btn sold-btn" disabled>SOLD OUT</button>
                ` : `
                  <button class="buy-btn" onclick="window.ui.buyMask('${mask.rarity}', ${mask.index})" ${coins < mask.cost ? 'disabled' : ''}>
                    ${mask.cost} 💰
                  </button>
                `}
              </div>
            </div>
          </div>
        `;
        }).join('')}
      </div>

      <button class="shop-leave-btn" onclick="window.ui.backToMap()">Leave</button>
    `;

    this.showScreen('summoning');
    
    // Initialize the mask shop scene after DOM is ready (only if not already initialized)
    if (!this.summoningScene || !this.summoningScene.scene) {
      setTimeout(() => this.initMaskShopScene(), 50);
    }

    // If there's a temp mask, make soul cards clickable
    if (tempMask) {
      setTimeout(() => {
        const soulCards = document.querySelectorAll('.souls-bar .soul-card-mini');
        soulCards.forEach(card => {
          card.style.cursor = 'pointer';
          card.style.border = '2px solid #ffd700';
          card.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
          card.addEventListener('click', () => {
            const soulId = parseInt(card.dataset.soulId);
            this.equipTempMaskTo(soulId);
          });
        });
      }, 50);
    }
  }

  updateMaskShopGrid() {
    const offering = this.game.state.maskShopOffering;
    const costs = this.game.config.maskConfig.costs;
    const coins = this.game.state.coins;
    const soldMasks = this.game.state.soldMasks;

    const allMasks = [
      ...offering.legendary.map((m, i) => ({ ...m, rarity: 'legendary', index: i, cost: costs.legendary, sold: soldMasks.legendary.includes(i) })),
      ...offering.rare.map((m, i) => ({ ...m, rarity: 'rare', index: i, cost: costs.rare, sold: soldMasks.rare.includes(i) })),
      ...offering.common.map((m, i) => ({ ...m, rarity: 'common', index: i, cost: costs.common, sold: soldMasks.common.includes(i) }))
    ];

    const maskShopGrid = document.querySelector('.mask-shop-grid');
    if (!maskShopGrid) return;

    const base = import.meta.env.BASE_URL || './';
    maskShopGrid.innerHTML = allMasks.map(mask => {
      let texturePath;
      if (mask.texture) {
        const cleanPath = mask.texture.startsWith('./') 
          ? mask.texture.slice(2)
          : mask.texture;
        texturePath = base + cleanPath;
      } else {
        texturePath = base + 'masks/fallback_mask.png';
      }
      
      return `
        <div class="mask-shop-card ${mask.rarity} ${mask.sold ? 'sold-out' : ''}" style="position: relative;">
          <button class="deck-preview-btn" onclick="window.ui.showMaskDeck('${mask.id}')" title="View Cards" style="
            position: absolute;
            top: 0;
            right: 0;
            padding: 0;
            margin: 0;
            width: 30px;
            height: 30px;
            font-size: 16px;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            🃏
          </button>
          <img src="${texturePath}" alt="${mask.name}" class="mask-image">
          <div class="mask-card-info">
            <strong style="display: block; margin-bottom: 4px;">${mask.name}</strong>
            <div class="mask-description" style="font-size: 10px; color: #aaa; font-style: italic; margin-bottom: 8px;">${mask.description || ''}</div>
            <div class="mask-shop-actions">
              ${mask.sold ? `
                <button class="buy-btn sold-btn" disabled>SOLD OUT</button>
              ` : `
                <button class="buy-btn" onclick="window.ui.buyMask('${mask.rarity}', ${mask.index})" ${coins < mask.cost ? 'disabled' : ''}>
                  ${mask.cost} 💰
                </button>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  initMaskShopScene() {
    const container = document.getElementById('summoning-canvas-container');
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    
    // Gradient background (dark cyan at bottom, lighter at top)
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a3a3a'); // Lighter cyan at top
    gradient.addColorStop(1, '#0a0a0a'); // Dark at bottom
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
    
    const bgTexture = new THREE.CanvasTexture(canvas);
    scene.background = bgTexture;
    scene.fog = new THREE.Fog(0x0a0a0a, 5, 15);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1.5, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

    const halftonePass = new ShaderPass(HalftoneShader);
    halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

    if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
      pixelPass.renderToScreen = true;
      composer.addPass(pixelPass);
    } else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
      halftonePass.renderToScreen = true;
      composer.addPass(halftonePass);
    } else {
      renderPass.renderToScreen = true;
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0x88cccc, 1.2);
    scene.add(ambientLight);

    // Key light on vendor (magenta/purple)
    const mainLight = new THREE.DirectionalLight(0xff44ff, 3.0);
    mainLight.position.set(0, 5, 2);
    scene.add(mainLight);

    // Rim light (cyan)
    const fillLight = new THREE.DirectionalLight(0x44ffff, 2.5);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);
    
    // Back light for dramatic effect
    const backLight = new THREE.DirectionalLight(0xaa44ff, 2.0);
    backLight.position.set(0, 4, -3);
    scene.add(backLight);

    // Ground
    const groundGeom = new THREE.CircleGeometry(10, 32);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Create creepy vendor (floating hooded figure)
    const vendorGroup = new THREE.Group();
    
    // Hood/head
    const headGeom = new THREE.SphereGeometry(0.4, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x330033, emissiveIntensity: 0.3 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 2.2;
    vendorGroup.add(head);
    
    // Robe body
    const bodyGeom = new THREE.ConeGeometry(0.6, 1.5, 6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a0a1a, roughness: 0.8 });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 1.2;
    vendorGroup.add(body);
    
    // Glowing eyes
    const eyeGeom = new THREE.SphereGeometry(0.05, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, fog: false });
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.12, 2.25, 0.35);
    vendorGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.12, 2.25, 0.35);
    vendorGroup.add(rightEye);
    
    vendorGroup.position.set(0, 0.5, -1);
    scene.add(vendorGroup);

    // Stall counter (no masks)
    const stallGroup = new THREE.Group();
    
    // Counter
    const counterGeom = new THREE.BoxGeometry(3, 0.1, 1);
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x332211 });
    const counter = new THREE.Mesh(counterGeom, counterMat);
    counter.position.set(0, 1, 0);
    stallGroup.add(counter);
    
    scene.add(stallGroup);

    // Rainbow heat wave particles
    const particleCount = 100;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
      
      // Rainbow colors
      const hue = Math.random();
      const color = new THREE.Color().setHSL(hue, 1.0, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: 0.01 + Math.random() * 0.02,
        wobble: Math.random() * Math.PI * 2
      });
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      fog: false
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // Store scene data
    this.maskShopScene = {
      scene,
      camera,
      renderer,
      composer,
      renderPass,
      pixelPass,
      halftonePass,
      vendorGroup,
      stallGroup,
      particles,
      particleVelocities: velocities,
      time: 0
    };

    // Handle resize
    const resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
      halftonePass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);
    this.maskShopScene.resizeHandler = resizeHandler;

    // Start animation
    this.animateMaskShopScene();
  }

  animateMaskShopScene() {
    if (!this.maskShopScene) return;

    this.maskShopAnimationId = requestAnimationFrame(() => this.animateMaskShopScene());

    const { scene, camera, composer, vendorGroup, stallGroup, particles, particleVelocities, time } = this.maskShopScene;
    
    this.maskShopScene.time += 0.016;

    // Vendor bobbing
    if (vendorGroup) {
      vendorGroup.position.y = 0.5 + Math.sin(time * 1.5) * 0.1;
      vendorGroup.rotation.y = Math.sin(time * 0.5) * 0.1;
    }

    // Animate particles (heat waves)
    if (particles) {
      const positions = particles.geometry.attributes.position.array;
      
      for (let i = 0; i < particleVelocities.length; i++) {
        const vel = particleVelocities[i];
        
        // Move particle up
        positions[i * 3 + 1] += vel.y;
        
        // Wobble side to side (heat wave effect)
        vel.wobble += 0.05;
        positions[i * 3] += Math.sin(vel.wobble) * 0.015;
        positions[i * 3 + 2] += Math.cos(vel.wobble * 0.7) * 0.01;
        
        // Reset if too high
        if (positions[i * 3 + 1] > 4) {
          positions[i * 3] = (Math.random() - 0.5) * 6;
          positions[i * 3 + 1] = 0;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 4;
        }
      }
      
      particles.geometry.attributes.position.needsUpdate = true;
    }

    // Camera gentle sway
    camera.position.x = Math.sin(time * 0.3) * 0.5;
    camera.lookAt(0, 1.5, 0);

    composer.render();
  }

  disposeMaskShopScene() {
    if (!this.maskShopScene) return;

    cancelAnimationFrame(this.maskShopAnimationId);
    
    if (this.maskShopScene.resizeHandler) {
      window.removeEventListener('resize', this.maskShopScene.resizeHandler);
    }

    if (this.maskShopScene.renderer) {
      this.maskShopScene.renderer.domElement.remove();
      this.maskShopScene.renderer.dispose();
    }
    
    this.maskShopScene = null;
  }

  renderShrine() {
    const shrine = this.game.state.currentShrine;
    const souls = this.game.getSouls();

    this.updateCurrencyHUD();

    // Check if this is a resource shrine (doesn't require soul selection)
    const isResourceShrine = shrine.effect === 'dark_energy' || shrine.effect === 'coins';
    
    // Check if this is a mark shrine (requires souls with masks)
    const isMarkShrine = shrine.effect === 'add_mark';
    const soulsWithMasks = souls.filter(s => s.mask);
    const canTakeMark = soulsWithMasks.length > 0;

    // Show the shrine screen with 3D scene
    const summoningScreen = document.getElementById('summoning-screen');
    summoningScreen.innerHTML = `
      <div id="summoning-canvas-container"></div>
      <div id="shrine-ui">
        <h2 style="margin: 0 0 8px 0; text-align: center; font-size: 18px;">✨ ${shrine.name}</h2>
        <p style="margin: 0; text-align: center; color: #ccc; font-size: 12px;">${shrine.description}</p>
      </div>
      ${isResourceShrine ? `
        <div id="shrine-instruction" style="position: fixed; bottom: 160px; left: 50%; transform: translateX(-50%); z-index: 100;">
          <button class="shrine-take-btn" onclick="window.ui.takeResourceShrine()" style="
            padding: 8px 20px;
            font-size: 13px;
            background: linear-gradient(135deg, #4a9eff, #3a7ecc);
            border: 2px solid #ffd700;
            border-radius: 8px;
            color: #fff;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 4px 15px rgba(74, 158, 255, 0.4);
          ">
            Take
          </button>
        </div>
        <button class="shrine-skip-btn" onclick="window.ui.skipShrine()" style="
          position: fixed;
          bottom: 160px;
          right: 20px;
          padding: 8px 20px;
          font-size: 13px;
          z-index: 100;
        ">
          Leave
        </button>
      ` : isMarkShrine && !canTakeMark ? `
        <div id="shrine-instruction">
          <span style="color: #999;">No souls have masks to imbue</span>
        </div>
        <button class="shrine-skip-btn" onclick="window.ui.skipShrine()" style="
          position: fixed;
          bottom: 160px;
          right: 20px;
          padding: 8px 20px;
          font-size: 13px;
          z-index: 100;
        ">Leave</button>
      ` : `
        <div id="shrine-instruction">
          ${souls.length > 0 ? 
            `<strong style="color: #ffd700;">Choose a soul ${isMarkShrine ? 'with a mask' : 'to bless'} ↓</strong>` : 
            '<span style="color: #999;">No souls to bless</span>'
          }
        </div>
        <button class="shrine-skip-btn" onclick="window.ui.skipShrine()">Skip</button>
      `}
    `;

    this.showScreen('summoning');
    
    // Initialize the shrine scene after DOM is ready
    setTimeout(() => this.initShrineScene(), 50);
    
    // Only set up soul selection if not a resource shrine
    if (!isResourceShrine) {
      // Store the shrine effect details for when a soul is clicked
      this.pendingShrineEffect = {
        effect: shrine.effect,
        value: shrine.value || 0
      };
      
      // Make soul cards clickable for blessing
      setTimeout(() => {
        document.querySelectorAll('.souls-bar .soul-card-mini').forEach((card) => {
          const soulId = parseInt(card.dataset.soulId);
          const soul = souls.find(s => s.id === soulId);
          
          // For mark shrines, only make souls with masks clickable
          if (isMarkShrine && (!soul || !soul.mask)) {
            card.style.opacity = '0.3';
            return;
          }
          
          card.style.cursor = 'pointer';
          card.style.border = '2px solid #ffd700';
          card.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
          card.addEventListener('click', () => {
            if (this.pendingShrineEffect) {
              this.applyShrineEffect(soulId, this.pendingShrineEffect.effect, this.pendingShrineEffect.value);
            }
          });
        });
      }, 100);
    }
  }

  skipShrine() {
    sfx.buttonClick();
    this.disposeShrineScene();
    this.game.state.completeCurrentNode();
    this.renderMap();
  }

  takeResourceShrine() {
    sfx.shrineTwinkle();
    
    const shrine = this.game.state.currentShrine;
    
    // Apply the resource effect directly (no soul required)
    let effectText = '';
    switch(shrine.effect) {
      case 'dark_energy':
        this.game.state.darkEnergy += shrine.value;
        effectText = `+${shrine.value} ⚡ Dark Energy`;
        console.log(`Gained ${shrine.value} dark energy`);
        break;
      case 'coins':
        this.game.state.coins += shrine.value;
        effectText = `+${shrine.value} 💰 Coins`;
        console.log(`Gained ${shrine.value} coins`);
        break;
    }
    
    // Update currency display
    this.updateCurrencyHUD();
    
    // Show floating effect text
    const instructionElement = document.getElementById('shrine-instruction');
    if (instructionElement) {
      instructionElement.innerHTML = `
        <div style="
          background: rgba(74, 158, 255, 0.2);
          border: 2px solid #ffd700;
          padding: 20px;
          border-radius: 10px;
          font-size: 18px;
          font-weight: bold;
          color: #ffd700;
          text-align: center;
          animation: pulse 0.5s ease-out;
        ">
          ${effectText}
        </div>
      `;
    }
    
    // Wait a moment then return to map
    setTimeout(() => {
      this.disposeShrineScene();
      this.game.state.completeCurrentNode();
      this.renderMap();
    }, 1500);
  }

  getShrineTheme(effect) {
    switch(effect) {
      case 'remove_tired':
        return {
          color: 0x88ccff,
          particleColor: 0xaaddff,
          geometry: () => {
            // Soft pillow/cloud shape
            const group = new THREE.Group();
            const pillow = new THREE.Mesh(
              new THREE.SphereGeometry(0.3, 8, 8),
              new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.3 })
            );
            pillow.scale.set(1, 0.6, 1.2);
            group.add(pillow);
            return group;
          },
          lightColor: 0x88ccff
        };
      case 'heal_full':
      case 'increase_max_hp':
        return {
          color: 0xff3333,
          particleColor: 0xff0000,
          geometry: () => new THREE.SphereGeometry(0.25, 6, 6), // Blood drop shape
          lightColor: 0xff3333
        };
      case 'coins':
        return {
          color: 0xffd700,
          particleColor: 0xffaa00,
          geometry: () => {
            // Pile of coins (cylinders)
            const group = new THREE.Group();
            for (let i = 0; i < 3; i++) {
              const coin = new THREE.Mesh(
                new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12),
                new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 })
              );
              coin.position.y = i * 0.06;
              coin.rotation.x = Math.random() * 0.3;
              group.add(coin);
            }
            return group;
          },
          lightColor: 0xffd700
        };
      case 'add_positive_trait':
        return {
          color: 0x00ffff,
          particleColor: 0x00ddff,
          geometry: () => new THREE.TetrahedronGeometry(0.3), // Triangle/pyramid
          lightColor: 0x00ffff
        };
      case 'remove_negative_trait':
        return {
          color: 0xccff00,
          particleColor: 0xffff00,
          geometry: () => {
            // Stack of oblong stones
            const group = new THREE.Group();
            for (let i = 0; i < 3; i++) {
              const stone = new THREE.Mesh(
                new THREE.BoxGeometry(0.2, 0.15, 0.1),
                new THREE.MeshStandardMaterial({ color: 0xccff00, roughness: 0.8 })
              );
              stone.position.y = i * 0.16;
              stone.rotation.y = i * 0.5;
              group.add(stone);
            }
            return group;
          },
          lightColor: 0xccff00
        };
      case 'dark_energy':
        return {
          color: 0x9d4edd,
          particleColor: 0x6a0dad,
          geometry: () => new THREE.OctahedronGeometry(0.25), // Crystal
          lightColor: 0x9d4edd
        };
      default:
        // Default gold/green theme
        return {
          color: 0xffd700,
          particleColor: 0x00ff88,
          geometry: () => new THREE.ConeGeometry(0.2, 0.6, 8),
          lightColor: 0xffd700
        };
    }
  }

  initShrineScene() {
    console.log('🏛️ initShrineScene() called');
    sfx.startShrineAmbience();
    const container = document.getElementById('summoning-canvas-container');
    if (!container) {
      console.error('❌ summoning-canvas-container not found!');
      return;
    }
    console.log('✓ Container found:', container);

    // Get shrine theme based on effect
    const shrine = this.game.state.currentShrine;
    const theme = this.getShrineTheme(shrine.effect);

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 5, 15);

    // Camera
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.style.pointerEvents = 'auto'; // Allow canvas interaction
    container.appendChild(renderer.domElement);

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

    const halftonePass = new ShaderPass(HalftoneShader);
    halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

    // Add appropriate pass based on current mode
    if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
      pixelPass.renderToScreen = true;
      composer.addPass(pixelPass);
    } else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
      halftonePass.renderToScreen = true;
      composer.addPass(halftonePass);
    } else {
      renderPass.renderToScreen = true;
    }

    // Create altar (pedestal)
    const altarBase = new THREE.BoxGeometry(1.5, 0.2, 1.5);
    const altarMid = new THREE.BoxGeometry(1.2, 0.6, 1.2);
    const altarTop = new THREE.BoxGeometry(1.4, 0.1, 1.4);
    const altarMat = new THREE.MeshStandardMaterial({ 
      color: 0x4a4a4a,
      roughness: 0.7,
      metalness: 0.3
    });
    
    const altar1 = new THREE.Mesh(altarBase, altarMat);
    altar1.position.set(0, 0.1, 0);
    scene.add(altar1);
    
    const altar2 = new THREE.Mesh(altarMid, altarMat);
    altar2.position.set(0, 0.5, 0);
    scene.add(altar2);
    
    const altar3 = new THREE.Mesh(altarTop, altarMat);
    altar3.position.set(0, 0.85, 0);
    scene.add(altar3);

    // Create themed statue/idol on altar
    const statueObj = theme.geometry();
    let statue;
    
    if (statueObj.type === 'Group') {
      statue = statueObj;
    } else {
      const statueMat = new THREE.MeshStandardMaterial({ 
        color: theme.color,
        roughness: 0.3,
        metalness: 0.7,
        emissive: theme.color,
        emissiveIntensity: 0.3
      });
      statue = new THREE.Mesh(statueObj, statueMat);
    }
    
    statue.position.set(0, 1.25, 0);
    scene.add(statue);

    // Create particle system with themed colors
    const particleCount = 100;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const isPrimary = Math.random() > 0.4;
      const particleGeom = new THREE.SphereGeometry(0.03, 4, 4);
      const particleMat = new THREE.MeshBasicMaterial({ 
        color: isPrimary ? theme.color : theme.particleColor,
        transparent: true,
        opacity: 0.8
      });
      const particle = new THREE.Mesh(particleGeom, particleMat);
      
      // Random position around the altar
      particle.position.x = (Math.random() - 0.5) * 4;
      particle.position.y = Math.random() * 4;
      particle.position.z = (Math.random() - 0.5) * 4;
      
      // Store velocity for drifting
      particle.userData.velocity = {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      };
      particle.userData.initialY = particle.position.y;
      
      scene.add(particle);
      particles.push(particle);
    }

    // Themed point light from statue
    const statueLight = new THREE.PointLight(theme.lightColor, 3, 10);
    statueLight.position.set(0, 1.25, 0);
    scene.add(statueLight);

    // Themed accent light
    const accentLight = new THREE.PointLight(theme.particleColor, 2, 8);
    accentLight.position.set(2, 2, 2);
    scene.add(accentLight);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    // Directional lights
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(theme.lightColor, 1.5);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Store scene data
    this.shrineScene = { 
      scene, 
      camera, 
      renderer, 
      composer, 
      renderPass, 
      pixelPass, 
      halftonePass, 
      particles, 
      statue,
      statueLight 
    };

    // Listen for post-processing changes
    const ppHandler = (e) => {
      if (!this.shrineScene) return;
      const { mode } = e.detail;
      
      // Remove effect passes (keep render pass)
      composer.passes = [renderPass];
      
      // Add appropriate pass
      if (mode === 'pixelation') {
        pixelPass.renderToScreen = true;
        composer.addPass(pixelPass);
      } else if (mode === 'halftone') {
        halftonePass.renderToScreen = true;
        composer.addPass(halftonePass);
      } else {
        renderPass.renderToScreen = true;
      }
    };
    window.addEventListener('postProcessingChanged', ppHandler);
    this.shrineScene.ppHandler = ppHandler;

    // Animate
    const animate = () => {
      if (!this.shrineScene) return;
      
      // Rotate statue slowly
      statue.rotation.y += 0.005;
      
      // Pulse statue light
      const time = Date.now() * 0.001;
      statueLight.intensity = 3 + Math.sin(time * 2) * 0.5;
      
      // Drift particles
      particles.forEach(particle => {
        particle.position.x += particle.userData.velocity.x;
        particle.position.y += particle.userData.velocity.y;
        particle.position.z += particle.userData.velocity.z;
        
        // Wrap around if they drift too far
        if (Math.abs(particle.position.x) > 3) particle.position.x *= -0.9;
        if (Math.abs(particle.position.z) > 3) particle.position.z *= -0.9;
        if (particle.position.y > 5) particle.position.y = 0;
        if (particle.position.y < 0) particle.position.y = 5;
        
        // Gentle pulsing opacity
        particle.material.opacity = 0.6 + Math.sin(time * 3 + particle.position.x * 10) * 0.3;
      });
      
      composer.render();
      this.shrineAnimationId = requestAnimationFrame(animate);
    };
    animate();

    // Handle resize
    window.addEventListener('resize', () => {
      if (!this.shrineScene) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
      halftonePass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    });
  }

  disposeShrineScene() {
    sfx.stopShrineAmbience();
    if (this.shrineAnimationId) {
      cancelAnimationFrame(this.shrineAnimationId);
      this.shrineAnimationId = null;
    }
    if (this.shrineScene) {
      if (this.shrineScene.ppHandler) {
        window.removeEventListener('postProcessingChanged', this.shrineScene.ppHandler);
      }
      this.shrineScene.renderer.dispose();
      this.shrineScene = null;
    }
  }

  renderBattlePrep() {
    const enemy = this.game.getCurrentEnemy();
    
    if (!enemy) {
      console.error('❌ No enemy found for current node');
      const node = this.game.getCurrentNode();
      console.error('Node:', JSON.stringify(node, null, 2));
      console.error('Enemy config available:', !!this.game.config.enemyConfig);
      console.error('Enemies in config:', this.game.config.enemyConfig?.enemies?.length);
      alert('Error: Enemy not found. The map may have been generated before the new enemy system loaded. Please refresh the page and start a new run.');
      return;
    }
    
    // Reset any previous soul card styling first
    document.querySelectorAll('.soul-card-mini').forEach(card => {
      card.style.cursor = '';
      card.style.border = '';
      card.style.transform = '';
      card.style.boxShadow = '';
      card.style.opacity = '';
      card.onclick = null;
    });
    
    // Enter battle immediately but without soul selected yet
    this.initBattleSceneWithEnemy(enemy);
    
    // Show battle screen with soul selection prompt
    const battleScreen = document.getElementById('battle-screen');
    battleScreen.innerHTML = `
      <div class="combat-info">
        <div class="combatant" style="opacity: 0.3; pointer-events: none;">
          <div class="health-bar-floating">
            <strong>Choose Your Fighter</strong>
          </div>
        </div>

        <div class="combatant" style="text-align: right;">
          <div class="health-bar-floating">
            <strong>${enemy.name}</strong>
            <div class="health-bar">
              <div class="health-fill-back" style="width: 100%; background: #8b0000;"></div>
              <div class="health-fill" style="width: 100%; background: #ff0033;"></div>
            </div>
            <div style="font-size: 11px;">❤️ ${enemy.blood}/${enemy.blood} | ⚔️ ${enemy.attack} | 🛡️ ${enemy.defense}</div>
          </div>
        </div>
      </div>

      <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; z-index: 200; pointer-events: none;">
        <div style="background: rgba(10, 10, 10, 0.95); border: 3px solid #ff0033; padding: 30px; border-radius: 8px;">
          <h2 style="margin: 0 0 10px 0; color: #ff0033;">⚔️ Choose Your Fighter</h2>
          <p style="margin: 0; color: #ccc;">Select a soul from below to enter battle</p>
        </div>
      </div>
    `;
    
    this.showScreen('battle');
    
    // Show souls bar and make cards clickable
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'flex';
    }
    
    setTimeout(() => {
      document.querySelectorAll('.soul-card-mini').forEach((card, idx) => {
        const souls = this.game.getSouls();
        if (souls[idx]) {
          card.style.cursor = 'pointer';
          card.style.border = '2px solid #0f0';
          card.style.transform = 'scale(1.05)';
          card.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
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
          <h3 style="margin: 0 0 15px 0; text-align: center;">${this.pendingSoul.type} Soul Summoned</h3>
          <input type="text" id="soul-name-input" placeholder="Name your soul..." maxlength="20" style="width: 300px; padding: 10px; background: #1a1a1a; border: 2px solid #666; color: #fff; border-radius: 4px; text-align: center; font-family: 'IM Fell DW Pica SC', serif; font-size: 1.17em;" />
          <button id="confirm-soul-name-btn" style="margin-left: 10px; padding: 10px 20px; background: #9d4edd; border: 2px solid #fff; color: #fff; cursor: pointer; border-radius: 4px;">Confirm</button>
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

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

    const halftonePass = new ShaderPass(HalftoneShader);
    halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

    // Add appropriate pass based on current mode
    if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
      pixelPass.renderToScreen = true;
      composer.addPass(pixelPass);
    } else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
      halftonePass.renderToScreen = true;
      composer.addPass(halftonePass);
    } else {
      renderPass.renderToScreen = true;
    }

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

    // Listen for post-processing changes
    const ppHandler = (e) => {
      if (!composer) return;
      const { mode } = e.detail;
      
      // Remove effect passes (keep render pass)
      composer.passes = [renderPass];
      
      // Add appropriate pass
      if (mode === 'pixelation') {
        pixelPass.renderToScreen = true;
        composer.addPass(pixelPass);
      } else if (mode === 'halftone') {
        halftonePass.renderToScreen = true;
        composer.addPass(halftonePass);
      } else {
        renderPass.renderToScreen = true;
      }
    };
    window.addEventListener('postProcessingChanged', ppHandler);

    // Store reference for cleanup
    this.summoningScene = {
      renderer,
      composer,
      animId,
      container,
      ppHandler
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
    if (this.summoningScene.ppHandler) {
      window.removeEventListener('postProcessingChanged', this.summoningScene.ppHandler);
    }
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
      sfx.purchase();
      console.log('Bought mask:', result.mask.name);
      
      // Update mask grid to reflect purchase
      this.updateMaskShopGrid();
      
      // Add instruction and make soul cards in the souls bar clickable
      const tempMask = this.game.tempMask;
      
      // Add instruction if not present
      if (!document.getElementById('shop-instruction')) {
        const shopUi = document.getElementById('shop-ui');
        const instructionDiv = document.createElement('div');
        instructionDiv.id = 'shop-instruction';
        instructionDiv.innerHTML = `<strong style="color: #ffd700;">Choose a soul to equip "${tempMask.name}" ↓</strong>`;
        shopUi.after(instructionDiv);
      }
      
      // Make soul cards in the souls bar clickable
      const soulCards = document.querySelectorAll('.souls-bar .soul-card-mini');
      soulCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.style.border = '2px solid #ffd700';
        card.style.boxShadow = '0 0 10px rgba(255, 215, 0, 0.5)';
        card.addEventListener('click', () => {
          const soulId = parseInt(card.dataset.soulId);
          this.equipTempMaskTo(soulId);
        });
      });
    } else {
      sfx.error();
      alert(result.error);
    }
  }

  showMaskDeck(maskId) {
    sfx.buttonClick();
    const mask = this.game.config.getMask(maskId);
    if (!mask) return;

    // Build card array with mask source
    const cards = mask.cards.map(cardId => {
      const card = this.game.config.getCard(cardId);
      if (card) {
        return { ...card, source: 'mask' };
      }
      return null;
    }).filter(card => card !== null);

    // Use the same modal as soul deck viewer
    this.showPileModal(`${mask.name} Cards`, cards);
  }

  equipTempMaskTo(soulId) {
    const soul = this.game.state.souls.find(m => m.id === soulId);
    const tempMask = this.game.tempMask;
    if (!soul || !tempMask) return;
    
    // Get binding quote based on mask type
    const soulType = this.game.config.soulConfig.types.find(t => t.id === soul.type);
    const maskType = tempMask.type || 'universal';
    const bindingQuote = soulType?.mask_binding_quotes?.[maskType] || "Agh! It binds to me!";
    
    // Play twinkle sound and show binding animation
    sfx.shrineTwinkle();
    
    const result = this.game.equipTempMask(soulId);
    if (result.success) {
      console.log('Mask equipped!');
      
      // Immediately update the soul card in the souls bar to show mask health
      this.updateSoulCardInBar(soul);
      
      // Immediately re-render the soul 3D preview to show the mask
      setTimeout(() => this.renderSoulPreview(soul, true), 50);
      
      // Show mask binding reaction (shake + quote)
      this.showMaskBindingReaction(soulId, tempMask.name, bindingQuote);
      
      // Wait for animation to complete before cleaning up UI
      setTimeout(() => {
        // Remove instruction and souls section
        const instruction = document.getElementById('shop-instruction');
        const soulsSection = document.getElementById('souls-section');
        if (instruction) instruction.remove();
        if (soulsSection) soulsSection.remove();
        
        // Update the mask grid to show temp mask is gone
        this.updateMaskShopGrid();
      }, 2000);
    } else {
      alert(result.error);
    }
  }

  updateSoulCardInBar(soul) {
    // Update the soul card HTML to include mask health
    const soulCard = document.querySelector(`.soul-card-mini[data-soul-id="${soul.id}"]`);
    if (!soulCard) return;
    
    // Check if mask health display already exists
    let maskHealthDiv = soulCard.querySelector('.mask-health');
    
    if (soul.mask && soul.maskBlood !== undefined && soul.maskMaxBlood !== undefined) {
      const maskHealthPercent = (soul.maskBlood / soul.maskMaxBlood) * 100;
      
      // Create or update mask health display
      if (!maskHealthDiv) {
        maskHealthDiv = document.createElement('div');
        maskHealthDiv.className = 'mask-health';
        // Insert after soul-stats
        const statsDiv = soulCard.querySelector('.soul-stats');
        if (statsDiv) {
          statsDiv.after(maskHealthDiv);
        }
      }
      maskHealthDiv.innerHTML = `
        <span class="stat-icon">🎭</span>
        <span class="stat-values">${soul.maskBlood}/${soul.maskMaxBlood}</span>
        <div class="health-bar"><div class="health-bar-fill" style="width: ${maskHealthPercent}%"></div></div>
      `;
    } else if (maskHealthDiv) {
      // Clear mask health display if no mask, but keep the div for spacing
      maskHealthDiv.innerHTML = '';
    }
  }

  showMaskBindingReaction(soulId, maskName, quote) {
    // Find the soul card in the souls bar
    const soulCard = document.querySelector(`.soul-card-mini[data-soul-id="${soulId}"]`);
    if (!soulCard) return;
    
    // Add shake animation
    soulCard.style.animation = 'soul-card-shake 0.5s ease-in-out';
    setTimeout(() => {
      soulCard.style.animation = '';
    }, 500);
    
    // Show floating mask name
    const maskText = document.createElement('div');
    maskText.style.cssText = `
      position: fixed;
      left: 50%;
      top: 40%;
      transform: translate(-50%, -50%);
      z-index: 200;
      background: rgba(10, 10, 10, 0.95);
      border: 2px solid #ffd700;
      padding: 15px 25px;
      border-radius: 12px;
      font-size: 18px;
      font-weight: bold;
      color: #ffd700;
      text-align: center;
      pointer-events: none;
      opacity: 0;
      animation: fade-in-out 2s ease-in-out;
    `;
    maskText.textContent = `🎭 ${maskName} Bound!`;
    document.body.appendChild(maskText);
    
    setTimeout(() => maskText.remove(), 2000);
    
    // Show soul's binding quote with typewriter effect
    setTimeout(() => {
      const quoteDiv = document.createElement('div');
      quoteDiv.style.cssText = `
        position: fixed;
        left: 50%;
        bottom: 200px;
        transform: translateX(-50%);
        z-index: 200;
        background: #000000;
        padding: 15px 20px;
        border-radius: 15px;
        max-width: 300px;
        color: #fff;
        font-size: 14px;
        font-style: italic;
        text-align: center;
        line-height: 1.4;
        pointer-events: none;
      `;
      document.body.appendChild(quoteDiv);
      
      // Typewriter effect
      let charIndex = 0;
      const typeSpeed = 50;
      
      const typeNextChar = () => {
        if (charIndex < quote.length) {
          quoteDiv.textContent += quote[charIndex];
          
          if (quote[charIndex] !== ' ') {
            const pitch = 200 + Math.random() * 200;
            sfx.playTone(pitch, 0.05, 0.15, 'square');
          }
          
          charIndex++;
          setTimeout(typeNextChar, typeSpeed);
        } else {
          setTimeout(() => {
            quoteDiv.style.transition = 'opacity 0.5s';
            quoteDiv.style.opacity = '0';
            setTimeout(() => quoteDiv.remove(), 500);
          }, 800);
        }
      };
      
      typeNextChar();
    }, 300);
  }

  applyShrineEffect(soulId, effect, value) {
    const soul = this.game.state.souls.find(m => m.id === soulId);
    if (!soul) return;
    
    // Special handling for mark selection
    if (effect === 'add_mark') {
      this.showMarkSelectionForShrine(soulId);
      return;
    }
    
    sfx.shrineTwinkle();
    
    // Hide the instruction text
    const instructionElement = document.getElementById('shrine-instruction');
    if (instructionElement) {
      instructionElement.style.display = 'none';
    }

    let effectText = '';
    let affectionQuote = null;
    
    switch(effect) {
      case 'remove_tired':
        if (soul.tiredCount > 0) {
          const removedCount = soul.tiredCount;
          soul.tiredCount = 0;
          effectText = `${removedCount} Tired Card${removedCount > 1 ? 's' : ''} Removed! 💤`;
          affectionQuote = soul.changeAffection(5); // +5 for rest
          console.log(`Removed ${removedCount} tired cards`);
        } else {
          effectText = 'Already Rested! 😊';
        }
        break;
      case 'remove_negative_trait':
        if (soul.negativeCards.length > 0) {
          const removedCard = soul.negativeCards[soul.negativeCards.length - 1];
          const cardData = this.game.config.getCard(removedCard);
          soul.negativeCards.pop();
          effectText = `${cardData ? cardData.name : 'Curse'} Removed!`;
          affectionQuote = soul.changeAffection(8); // +8 for removing curse
          console.log('Negative card removed');
        }
        break;
      case 'add_positive_trait':
        if (soul.mask) {
          const cards = this.game.getRandomPositiveCards(1);
          const cardData = this.game.config.getCard(cards[0]);
          soul.addPositiveCardToMask(cards[0]);
          effectText = `${cardData ? cardData.name : 'New Card'}!`;
          affectionQuote = soul.changeAffection(6); // +6 for positive card
          console.log('Positive card added');
        }
        break;
      case 'dark_energy':
        this.game.state.darkEnergy += value;
        effectText = `+${value} ⚡ Dark Energy`;
        console.log(`Gained ${value} dark energy`);
        break;
      case 'coins':
        this.game.state.coins += value;
        effectText = `+${value} 💰 Coins`;
        console.log(`Gained ${value} coins`);
        break;
      case 'heal_full':
        const healAmount = soul.maxBlood - soul.blood;
        soul.blood = soul.maxBlood;
        effectText = `+${healAmount} ❤️ Fully Healed!`;
        affectionQuote = soul.changeAffection(7); // +7 for full heal
        console.log('Soul fully healed');
        break;
      case 'increase_max_hp':
        soul.maxBlood += value;
        soul.blood += value;
        effectText = `+${value} ❤️ Max HP`;
        console.log(`Max HP increased by ${value}`);
        break;
    }

    // Show floating effect text and soul quote
    // If affection quote exists, show that; otherwise show blessing quote
    const quoteToShow = affectionQuote || soul.getBlessingQuote();
    this.showShrineReaction(soulId, effectText, quoteToShow);
  }
  
  showMarkSelectionForShrine(soulId) {
    sfx.buttonClick();
    
    const soul = this.game.state.souls.find(s => s.id === soulId);
    if (!soul || !soul.mask) return;
    
    // Get all available marks
    const allMarks = Object.values(this.game.config.marks);
    
    // Pick 3 random marks
    const shuffled = [...allMarks].sort(() => Math.random() - 0.5);
    const offeredMarks = shuffled.slice(0, 3);
    
    // Hide instruction and skip button
    const instructionElement = document.getElementById('shrine-instruction');
    const skipButton = document.querySelector('.shrine-skip-btn');
    if (instructionElement) instructionElement.style.display = 'none';
    if (skipButton) skipButton.style.display = 'none';
    
    // Show mark selection UI
    const shrineUi = document.getElementById('shrine-ui');
    const markSelection = document.createElement('div');
    markSelection.id = 'mark-selection';
    markSelection.innerHTML = `
      <div style="
        position: fixed;
        bottom: 200px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 10, 10, 0.95);
        border: 2px solid #ffd700;
        padding: 20px;
        border-radius: 8px;
        max-width: 600px;
        z-index: 150;
      ">
        <h3 style="margin: 0 0 15px 0; text-align: center; color: #ffd700;">Choose a Mark for ${soul.name}</h3>
        <div style="display: flex; gap: 15px; justify-content: center;">
          ${offeredMarks.map(mark => {
            const rarity = soul.mask.rarity || 'common';
            const effect = mark.effects[rarity];
            return `
              <div class="mark-choice" data-mark-id="${mark.id}" style="
                flex: 1;
                background: rgba(74, 158, 255, 0.1);
                border: 2px solid #4a9eff;
                border-radius: 8px;
                padding: 15px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
              ">
                <div style="font-size: 24px; margin-bottom: 8px;">${mark.icon}</div>
                <div style="font-weight: bold; color: #ffd700; margin-bottom: 8px;">${mark.name}</div>
                <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">${mark.description}</div>
                <div style="font-size: 10px; color: #4a9eff;">${rarity}: ${effect}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    shrineUi.after(markSelection);
    
    // Bind click handlers
    document.querySelectorAll('.mark-choice').forEach(choice => {
      choice.addEventListener('mouseenter', () => {
        choice.style.background = 'rgba(74, 158, 255, 0.3)';
        choice.style.transform = 'scale(1.05)';
      });
      choice.addEventListener('mouseleave', () => {
        choice.style.background = 'rgba(74, 158, 255, 0.1)';
        choice.style.transform = 'scale(1)';
      });
      choice.addEventListener('click', () => {
        const markId = choice.getAttribute('data-mark-id');
        this.applyMarkFromShrine(soulId, markId);
      });
    });
  }
  
  applyMarkFromShrine(soulId, markId) {
    sfx.shrineTwinkle();
    
    const soul = this.game.state.souls.find(s => s.id === soulId);
    if (!soul || !soul.mask) return;
    
    // Add mark to mask
    soul.addMarkToMask(markId);
    
    // Remove mark selection UI
    const markSelection = document.getElementById('mark-selection');
    if (markSelection) markSelection.remove();
    
    // Show effect
    const mark = this.game.config.getMark(markId);
    const effectText = `${mark.icon} ${mark.name} Imbued!`;
    const affectionQuote = soul.changeAffection(8); // +8 for mark
    const quoteToShow = affectionQuote || soul.getBlessingQuote();
    
    this.showShrineReaction(soulId, effectText, quoteToShow);
  }
  
  showShrineReaction(soulId, effectText, quote) {
    // Find the soul card in the souls bar
    const soulCard = document.querySelector(`.soul-card-mini[data-soul-id="${soulId}"]`);
    if (!soulCard) return;
    
    const rect = soulCard.getBoundingClientRect();
    
    // Show floating effect text (higher z-index, above the quote)
    if (effectText) {
      const floatingText = document.createElement('div');
      floatingText.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top - 40}px;
        transform: translateX(-50%);
        z-index: 22;
        color: #ffd700;
        font-size: 20px;
        font-weight: bold;
        pointer-events: none;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
        animation: floatUp 1.5s ease-out forwards;
      `;
      floatingText.textContent = effectText;
      document.body.appendChild(floatingText);
      
      // Add keyframe animation if not exists
      if (!document.getElementById('float-up-animation')) {
        const style = document.createElement('style');
        style.id = 'float-up-animation';
        style.textContent = `
          @keyframes floatUp {
            0% { opacity: 1; transform: translateX(-50%) translateY(0); }
            100% { opacity: 0; transform: translateX(-50%) translateY(-50px); }
          }
        `;
        document.head.appendChild(style);
      }
      
      setTimeout(() => floatingText.remove(), 1500);
    }
    
    // Show soul quote in speech bubble (lower z-index, below the effect text)
    if (quote) {
      const speechBubble = document.createElement('div');
      speechBubble.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top - 120}px;
        transform: translateX(-50%);
        z-index: 21;
        background: #000000;
        padding: 10px 15px;
        border-radius: 10px;
        max-width: 250px;
        pointer-events: none;
      `;
      
      // Add pointer triangle pointing down toward soul
      const pointer = document.createElement('div');
      pointer.style.cssText = `
        position: absolute;
        left: 50%;
        bottom: -10px;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-top: 10px solid #000000;
      `;
      speechBubble.appendChild(pointer);
      
      const textElement = document.createElement('p');
      textElement.style.cssText = `
        margin: 0;
        color: #fff;
        font-size: 12px;
        font-style: italic;
        line-height: 1.3;
        text-align: center;
      `;
      speechBubble.appendChild(textElement);
      document.body.appendChild(speechBubble);
      
      // Typewriter effect
      let charIndex = 0;
      const typeSpeed = 40;
      
      const typeNextChar = () => {
        if (charIndex < quote.length) {
          textElement.textContent += quote[charIndex];
          
          if (quote[charIndex] !== ' ') {
            const pitch = 300 + Math.random() * 150;
            sfx.playTone(pitch, 0.04, 0.12, 'sine');
          }
          
          charIndex++;
          setTimeout(typeNextChar, typeSpeed);
        } else {
          // Wait then remove and proceed
          setTimeout(() => {
            speechBubble.style.transition = 'opacity 0.3s';
            speechBubble.style.opacity = '0';
            setTimeout(() => {
              speechBubble.remove();
              
              // Now mark shrine as complete and return to map
              this.disposeShrineScene();
              this.game.state.completeCurrentNode();
              this.renderMap();
            }, 300);
          }, 1000);
        }
      };
      
      typeNextChar();
    } else {
      // No quote, just wait a moment then proceed
      setTimeout(() => {
        this.disposeShrineScene();
        this.game.state.completeCurrentNode();
        this.renderMap();
      }, 1500);
    }
  }

  startBattleWith(soulId) {
    const result = this.game.startBattle(soulId);
    if (result.success) {
      // Reset defeat sequence flag for this battle
      this.defeatSequenceShown = false;
      this.maskBreakSequenceShown = false;
      
      // Add soul to existing battle scene and animate in
      this.addSoulToBattleScene(result.combatState);
      
      // Hide souls bar
      const soulsBar = document.querySelector('.souls-bar');
      if (soulsBar) {
        soulsBar.style.display = 'none';
      }
      
      // Reset soul card styling
      document.querySelectorAll('.soul-card-mini').forEach(card => {
        card.style.cursor = '';
        card.style.border = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.opacity = '';
        card.onclick = null;
      });
      
      // Render battle UI with animation
      this.renderBattleStart(result.combatState);
    } else {
      alert(result.error);
    }
  }

  backToMap() {
    sfx.buttonClick();
    // Mark node as complete when leaving void/shop
    const node = this.game.getCurrentNode();
    const actualType = node.type === 'mystery' ? this.game.state.mysteryRevealed : node.type;
    
    if (actualType === 'void' || actualType === 'mask_shop') {
      this.game.state.completeCurrentNode();
    }
    
    // Dispose scenes if active
    this.disposeBattleScene();
    this.disposeMaskShopScene();
    
    // Show souls bar again when leaving battle
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'flex';
    }
    
    this.renderMap();
  }

  renderBattle(state) {
    const battleScreen = document.getElementById('battle-screen');
    
    // Debug: Log health values
    console.log('renderBattle - Enemy health:', state.enemy.blood, '/', state.enemy.maxBlood, '=', ((state.enemy.blood / state.enemy.maxBlood) * 100).toFixed(1) + '%');
    console.log('renderBattle - Soul health:', state.soul.blood, '/', state.soul.maxBlood, '=', ((state.soul.blood / state.soul.maxBlood) * 100).toFixed(1) + '%');
    
    // Hide souls bar during battle
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'none';
    }
    
    // Check if we have an active health bar animation to preserve
    const activeHealthAnim = this.battleScene ? this.battleScene.healthBarAnim : null;
    
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
            <strong>${state.soul.name || 'Your Soul'}</strong>
            <div class="health-bar">
              <div class="health-fill-back" id="soul-health-bar-back" style="width: ${Math.max(0, Math.min(100, (state.soul.blood / state.soul.maxBlood) * 100))}%"></div>
              <div class="health-fill" id="soul-health-bar-fill" style="width: ${Math.max(0, Math.min(100, (state.soul.blood / state.soul.maxBlood) * 100))}%"></div>
            </div>
            <div style="font-size: 11px;">
              ❤️ ${Math.max(0, state.soul.blood)}/${state.soul.maxBlood} 
              ${state.soul.block > 0 ? `🛡️ ${state.soul.block}` : ''}
              ${state.soul.statusEffects?.poison > 0 ? `☠️ ${state.soul.statusEffects.poison}` : ''}
            </div>
            ${state.soul.mask && state.soul.maskBlood > 0 ? `
              <div style="margin-top: 6px; font-size: 10px; color: #ffd700;">${state.soul.mask.name}</div>
              <div class="health-bar" style="height: 8px;">
                <div class="health-fill-back" id="mask-health-bar-back" style="width: ${Math.max(0, Math.min(100, (state.soul.maskBlood / state.soul.maskMaxBlood) * 100))}%; background: #ffa500;"></div>
                <div class="health-fill" id="mask-health-bar-fill" style="width: ${Math.max(0, Math.min(100, (state.soul.maskBlood / state.soul.maskMaxBlood) * 100))}%; background: #ffd700;"></div>
              </div>
              <div style="font-size: 10px; color: #ffd700;">🎭 ${Math.max(0, state.soul.maskBlood)}/${state.soul.maskMaxBlood}</div>
            ` : ''}
            ${state.soul.maskBroken ? '<div style="font-size: 10px; color: #ff0000; margin-top: 4px;">💔 Mask Broken!</div>' : ''}
          </div>
        </div>

        <div class="combatant" style="text-align: right;">
          <div class="health-bar-floating">
            <strong>${state.enemy.name}</strong>
            <div class="health-bar">
              <div class="health-fill-back" id="enemy-health-bar-back" style="width: ${Math.max(0, Math.min(100, (state.enemy.blood / state.enemy.maxBlood) * 100))}%"></div>
              <div class="health-fill" id="enemy-health-bar-fill" style="width: ${Math.max(0, Math.min(100, (state.enemy.blood / state.enemy.maxBlood) * 100))}%"></div>
            </div>
            <div style="font-size: 11px;">
              ❤️ ${Math.max(0, state.enemy.blood)}/${state.enemy.maxBlood} 
              ${state.enemy.block > 0 ? `🛡️ ${state.enemy.block}` : ''}
              ${state.enemy.statusEffects?.poison > 0 ? `☠️ ${state.enemy.statusEffects.poison}` : ''}
              ${state.enemy.statusEffects?.stunned ? `💫` : ''}
            </div>
          </div>
        </div>
      </div>

      <div class="energy-display-left">
        ⚡ ${state.energy}/${state.maxEnergy}
      </div>

      <button class="pile-viewer-btn left" onclick="window.ui.viewDrawPile()">
        📚 ${state.deckCount}
      </button>

      <button class="pile-viewer-btn right-top" onclick="window.ui.viewDiscardPile()">
        🗑️ ${state.discardCount}
      </button>

      ${state.voidCount > 0 ? `
        <button class="pile-viewer-btn right-middle" onclick="window.ui.viewVoidPile()">
          🌀 ${state.voidCount}
        </button>
      ` : ''}

      <button class="end-turn-btn" onclick="window.ui.endTurn()">End Turn</button>

      <div class="hand">
        ${state.hand.map((card, i) => {
          let sourceIcon = '👿'; // soul default
          if (card.source === 'mask') sourceIcon = '👺';
          if (card.source === 'scar') sourceIcon = '🩹';
          
          return `
            <div class="card ${card.type} ${card.source === 'scar' ? 'scar' : ''} ${card.unplayable ? 'unplayable' : ''}" 
                 onclick="window.ui.playCard(${i})"
                 onmouseenter="window.ui.previewCardEffect(${i})"
                 onmouseleave="window.ui.clearCardPreview()">
              <div class="card-cost-circle">${card.cost}</div>
              <div class="card-source-icon">${sourceIcon}</div>
              <div class="card-header">
                <div class="card-name">${card.name}</div>
              </div>
              <div class="card-illustration">
                ${card.source === 'scar' ? '💔' : card.type === 'attack' ? '⚔️' : card.type === 'defend' ? '🛡️' : '✨'}
              </div>
              <div class="card-footer">
                <div class="card-desc">${card.description || ''}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.showScreen('battle');
    
    // If there was an active health bar animation, restore it with new DOM references
    if (activeHealthAnim && this.battleScene) {
      const frontId = activeHealthAnim.attacker === 'soul' ? 'enemy-health-bar-fill' : 'soul-health-bar-fill';
      const backId = activeHealthAnim.attacker === 'soul' ? 'enemy-health-bar-back' : 'soul-health-bar-back';
      const newFrontBar = document.getElementById(frontId);
      const newBackBar = document.getElementById(backId);
      
      if (newFrontBar && newBackBar) {
        // Update references
        activeHealthAnim.frontBar = newFrontBar;
        activeHealthAnim.backBar = newBackBar;
        this.battleScene.healthBarAnim = activeHealthAnim;
        
        // Restore the bar widths to their animated state (don't let HTML reset override)
        const newPercentage = Math.max(0, (activeHealthAnim.newHealth / activeHealthAnim.maxHealth) * 100);
        newFrontBar.style.width = newPercentage + '%';
        
        // Back bar should be at the current animated position
        const elapsed = Date.now() - activeHealthAnim.startTime;
        if (elapsed < activeHealthAnim.shakeDuration + activeHealthAnim.stallDuration) {
          // Still in stall period - keep at previous health
          const prevPercentage = Math.max(0, (activeHealthAnim.prevHealth / activeHealthAnim.maxHealth) * 100);
          newBackBar.style.width = prevPercentage + '%';
        } else if (elapsed < activeHealthAnim.shakeDuration + activeHealthAnim.stallDuration + activeHealthAnim.lerpDuration) {
          // In lerp period - calculate current lerp position
          const lerpElapsed = elapsed - activeHealthAnim.shakeDuration - activeHealthAnim.stallDuration;
          const lerpProgress = Math.min(lerpElapsed / activeHealthAnim.lerpDuration, 1);
          const eased = 1 - Math.pow(1 - lerpProgress, 3);
          const currentHealth = activeHealthAnim.prevHealth - (activeHealthAnim.damage * eased);
          const percentage = Math.max(0, (currentHealth / activeHealthAnim.maxHealth) * 100);
          newBackBar.style.width = percentage + '%';
        } else {
          // Animation should be done, set to final
          newBackBar.style.width = newPercentage + '%';
        }
        
        // Reapply shake class if still in shake period
        if (elapsed < activeHealthAnim.shakeDuration) {
          newFrontBar.parentElement.classList.add('health-bar-shake');
        }
      }
    }

    if (state.result) {
      // Check if there are more souls alive
      const aliveSouls = this.game.state.souls.filter(s => s.blood > 0);
      
      // If this is a defeat and we haven't shown the defeat sequence yet
      if (state.result === 'defeat' && !this.defeatSequenceShown) {
        this.defeatSequenceShown = true;
        
        if (aliveSouls.length > 0) {
          // More souls alive - show defeat sequence then let them choose another soul
          setTimeout(() => this.showDefeatSequenceAndContinue(), 500);
        } else {
          // No souls left - show defeat sequence then game over
          setTimeout(() => this.showDefeatSequence(), 500);
        }
      } else if (state.result === 'victory') {
        setTimeout(() => this.handleBattleEnd(), 1000);
      }
    }
  }

  initBattleSceneWithEnemy(enemy) {
    console.log('Initializing battle scene with enemy only:', enemy);
    const container = document.getElementById('battle-canvas-container');
    container.classList.add('active');

    // Scene setup (same as initBattleScene but without soul)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7a5555);
    scene.fog = new THREE.Fog(0x7a5555, 8, 20); // Pushed back fog so mountains are visible

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(3, 2, 3);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    // Post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

    const halftonePass = new ShaderPass(HalftoneShader);
    halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

    if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
      pixelPass.renderToScreen = true;
      composer.addPass(pixelPass);
    } else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
      halftonePass.renderToScreen = true;
      composer.addPass(halftonePass);
    } else {
      renderPass.renderToScreen = true;
    }

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

    // Ground and environment (same as before)
    const groundGeom = new THREE.CircleGeometry(5, 32);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    // Grid removed for cleaner look

    // Add spiky black mountains at the edges
    const mountainMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a, // Dark gray
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
      emissive: 0x0a0a0a,
      emissiveIntensity: 0.3
    });

    const createMountain = (scale) => {
      const group = new THREE.Group();
      
      const mainGeom = new THREE.ConeGeometry(1, 2.5, 5, 1);
      const posAttr = mainGeom.attributes.position;
      
      for (let i = 0; i < posAttr.count; i++) {
        if (posAttr.getY(i) > 0) {
          posAttr.setX(i, posAttr.getX(i) * (0.5 + Math.random() * 0.8));
          posAttr.setZ(i, posAttr.getZ(i) * (0.5 + Math.random() * 0.8));
          posAttr.setY(i, posAttr.getY(i) * (0.8 + Math.random() * 0.5));
        }
      }
      mainGeom.computeVertexNormals();
      const mainMesh = new THREE.Mesh(mainGeom, mountainMat);
      mainMesh.position.y = 1.25;
      group.add(mainMesh);
      
      const spikeCount = 2 + Math.floor(Math.random() * 2);
      for (let s = 0; s < spikeCount; s++) {
        const spikeGeom = new THREE.ConeGeometry(0.4, 1.8, 4, 1);
        const spikeAttr = spikeGeom.attributes.position;
        for (let i = 0; i < spikeAttr.count; i++) {
          if (spikeAttr.getY(i) > 0) {
            spikeAttr.setX(i, spikeAttr.getX(i) * (0.6 + Math.random() * 0.6));
            spikeAttr.setZ(i, spikeAttr.getZ(i) * (0.6 + Math.random() * 0.6));
          }
        }
        spikeGeom.computeVertexNormals();
        const spike = new THREE.Mesh(spikeGeom, mountainMat);
        spike.position.x = (Math.random() - 0.5) * 1.2;
        spike.position.z = (Math.random() - 0.5) * 1.2;
        spike.position.y = 1.2 + Math.random() * 0.5;
        spike.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(spike);
      }
      
      group.scale.set(scale, scale, scale);
      return group;
    };

    const mountainPositions = [
      { x: -6, z: -4, scale: 1.2 },
      { x: -5.5, z: -2, scale: 1.0 },
      { x: -6.5, z: 0, scale: 1.1 },
      { x: -5.8, z: 2, scale: 0.9 },
      { x: -6, z: 4, scale: 1.0 },
      { x: 6, z: -4, scale: 1.1 },
      { x: 5.8, z: -2, scale: 0.95 },
      { x: 6.2, z: 0, scale: 1.3 },
      { x: 5.5, z: 2, scale: 1.0 },
      { x: 6, z: 4, scale: 1.1 },
      { x: -3, z: -5.5, scale: 0.9 },
      { x: -1, z: -5.8, scale: 0.8 },
      { x: 1, z: -6, scale: 0.9 },
      { x: 3, z: -5.5, scale: 0.85 },
    ];

    mountainPositions.forEach(pos => {
      const mountain = createMountain(pos.scale);
      mountain.position.set(pos.x, 0, pos.z);
      scene.add(mountain);
    });
    
    console.log(`✓ Added ${mountainPositions.length} mountains to battle scene`);

    // Add small rocks scattered near mountains
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 1.0,
      flatShading: true
    });

    for (let i = 0; i < 30; i++) {
      const size = 0.1 + Math.random() * 0.15;
      const rockGeom = new THREE.DodecahedronGeometry(size, 0);
      
      // Randomize vertices for irregular rocks
      const posAttr = rockGeom.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        posAttr.setX(j, posAttr.getX(j) * (0.8 + Math.random() * 0.4));
        posAttr.setY(j, posAttr.getY(j) * (0.8 + Math.random() * 0.4));
        posAttr.setZ(j, posAttr.getZ(j) * (0.8 + Math.random() * 0.4));
      }
      rockGeom.computeVertexNormals();
      
      const rock = new THREE.Mesh(rockGeom, rockMat);
      
      // Scatter near edges
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 2;
      rock.position.x = Math.cos(angle) * dist;
      rock.position.z = Math.sin(angle) * dist;
      rock.position.y = size * 0.5;
      
      rock.rotation.x = Math.random() * Math.PI;
      rock.rotation.y = Math.random() * Math.PI;
      rock.rotation.z = Math.random() * Math.PI;
      
      scene.add(rock);
    }

    // Load enemy on the right
    const enemyMesh = this.prefabManager.instantiate(`enemy_${enemy.id}`);
    if (enemyMesh) {
      enemyMesh.position.set(1.2, 0, 0);
      enemyMesh.rotation.y = -Math.PI / 4;
      scene.add(enemyMesh);
    }

    // Create intent label (CSS2D element for enemy intent)
    const intentDiv = document.createElement('div');
    intentDiv.style.cssText = `
      background: rgba(10, 10, 10, 0.85);
      border: 2px solid #ff0033;
      border-radius: 16px;
      padding: 8px 12px;
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      min-width: 60px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    `;
    const intentLabel = new CSS2DObject(intentDiv);
    intentLabel.position.set(0, 1.8, 0);
    if (enemyMesh) {
      enemyMesh.add(intentLabel);
    }

    // Store scene data
    this.battleScene = {
      scene,
      camera,
      renderer,
      labelRenderer,
      composer,
      renderPass,
      pixelPass,
      halftonePass,
      enemyMesh,
      soulMesh: null, // Will be added later
      intentLabel: intentLabel,
      particles: null,
      cameraAngle: 0,
      soulBasePos: null,
      enemyBasePos: enemyMesh ? enemyMesh.position.clone() : null,
      attackAnim: null,
      healthBarAnim: null,
      maskHealthBarAnim: null
    };

    // Start animation
    this.animateBattleScene();
  }

  addSoulToBattleScene(state) {
    if (!this.battleScene) return;

    const { scene } = this.battleScene;

    // Load soul on the left
    const soulMesh = this.prefabManager.instantiate(`soul_${state.soul.type}`);
    if (soulMesh) {
      soulMesh.position.set(-1.2, 0, 0);
      soulMesh.rotation.y = Math.PI / 4;
      scene.add(soulMesh);

      // Add mask if equipped (same logic as initBattleScene)
      if (state.soul.mask && state.soul.mask.id) {
        const maskMesh = this.prefabManager.instantiate(`mask_${state.soul.mask.id}`);
        if (maskMesh) {
          let mountPoint;
          if (state.soul.type === 'wretch') {
            const headOrb = soulMesh.userData.headOrb;
            if (headOrb) {
              mountPoint = new THREE.Object3D();
              mountPoint.position.set(0, 0, 0.35);
              headOrb.add(mountPoint);
            }
          } else if (state.soul.type === 'imp' || state.soul.type === 'brute') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 0.9, 0.5);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'hollow' || state.soul.type === 'blight') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.4, 0.45);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'cur') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.5, 0.9, 0.3);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'scamp') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.2, 0.3);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'varmint') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.3, 0.85, 0.2);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'knave') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.3, 0.25);
            soulMesh.add(mountPoint);
          }

          if (mountPoint) {
            maskMesh.scale.set(1.0, 1.0, 1.0);
            maskMesh.userData.isMask = true;
            mountPoint.add(maskMesh);
          }
        }
      }

      this.battleScene.soulMesh = soulMesh;
      this.battleScene.soulBasePos = soulMesh.position.clone();
    }
  }

  renderBattleStart(state) {
    // Full battle render with card slide-in animation
    setTimeout(() => {
      this.renderBattle(state);
      
      // Start cards off-screen
      const hand = document.querySelector('.hand');
      if (hand) {
        hand.style.transition = 'none';
        hand.style.bottom = '-500px';
        
        // Animate cards sliding up from bottom
        setTimeout(() => {
          hand.style.transition = 'bottom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
          hand.style.bottom = '-100px';
        }, 50);
      }
    }, 300);
  }

  initBattleScene(state) {
    console.log('Initializing battle scene with state:', state);
    const container = document.getElementById('battle-canvas-container');
    container.classList.add('active');

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7a5555);
    scene.fog = new THREE.Fog(0x7a5555, 8, 20); // Pushed back fog range

    // Camera - adjusted to see mountains on horizon
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2.5, 5); // Centered view, looking towards back mountains
    camera.lookAt(0, 1.5, -2); // Look slightly towards the back

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // CSS2D Renderer for labels (not affected by post-processing)
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0';
    labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(labelRenderer.domElement);

    // Post-processing with pixelation
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const pixelPass = new ShaderPass(PixelShader);
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

    const halftonePass = new ShaderPass(HalftoneShader);
    halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
    halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

    // Add appropriate pass based on current mode
    if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
      pixelPass.renderToScreen = true;
      composer.addPass(pixelPass);
    } else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
      halftonePass.renderToScreen = true;
      composer.addPass(halftonePass);
    } else {
      renderPass.renderToScreen = true;
    }

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

    // Grid removed for cleaner look

    // Add spiky black mountains at the edges
    const mountainMat = new THREE.MeshStandardMaterial({ 
      color: 0xff0000, // BRIGHT RED for debugging - will change back to black
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });

    // Create jagged mountain geometry with multiple spikes
    const createMountain = (scale) => {
      const group = new THREE.Group();
      
      // Main mountain cone
      const mainGeom = new THREE.ConeGeometry(1, 2.5, 5, 1);
      const posAttr = mainGeom.attributes.position;
      
      // Randomize vertex positions for jagged look
      for (let i = 0; i < posAttr.count; i++) {
        if (posAttr.getY(i) > 0) { // Only offset upper vertices
          posAttr.setX(i, posAttr.getX(i) * (0.5 + Math.random() * 0.8));
          posAttr.setZ(i, posAttr.getZ(i) * (0.5 + Math.random() * 0.8));
          posAttr.setY(i, posAttr.getY(i) * (0.8 + Math.random() * 0.5));
        }
      }
      mainGeom.computeVertexNormals();
      const mainMesh = new THREE.Mesh(mainGeom, mountainMat);
      mainMesh.position.y = 1.25; // Lift cone so base is at y=0
      group.add(mainMesh);
      
      // Add 2-3 additional spikes
      const spikeCount = 2 + Math.floor(Math.random() * 2);
      for (let s = 0; s < spikeCount; s++) {
        const spikeGeom = new THREE.ConeGeometry(0.4, 1.8, 4, 1);
        const spikeAttr = spikeGeom.attributes.position;
        for (let i = 0; i < spikeAttr.count; i++) {
          if (spikeAttr.getY(i) > 0) {
            spikeAttr.setX(i, spikeAttr.getX(i) * (0.6 + Math.random() * 0.6));
            spikeAttr.setZ(i, spikeAttr.getZ(i) * (0.6 + Math.random() * 0.6));
          }
        }
        spikeGeom.computeVertexNormals();
        const spike = new THREE.Mesh(spikeGeom, mountainMat);
        spike.position.x = (Math.random() - 0.5) * 1.2;
        spike.position.z = (Math.random() - 0.5) * 1.2;
        spike.position.y = 1.2 + Math.random() * 0.5; // Also lift spikes
        spike.rotation.z = (Math.random() - 0.5) * 0.3;
        group.add(spike);
      }
      
      group.scale.set(scale, scale, scale);
      return group;
    };

    // Place mountains around the battlefield edges
    const mountainPositions = [
      // Left side
      { x: -6, z: -4, scale: 1.2 },
      { x: -5.5, z: -2, scale: 1.0 },
      { x: -6.5, z: 0, scale: 1.1 },
      { x: -5.8, z: 2, scale: 0.9 },
      { x: -6, z: 4, scale: 1.0 },
      // Right side
      { x: 6, z: -4, scale: 1.1 },
      { x: 5.8, z: -2, scale: 0.95 },
      { x: 6.2, z: 0, scale: 1.3 },
      { x: 5.5, z: 2, scale: 1.0 },
      { x: 6, z: 4, scale: 1.1 },
      // Back
      { x: -3, z: -5.5, scale: 0.9 },
      { x: -1, z: -5.8, scale: 0.8 },
      { x: 1, z: -6, scale: 0.9 },
      { x: 3, z: -5.5, scale: 0.85 },
    ];

    mountainPositions.forEach(pos => {
      const mountain = createMountain(pos.scale);
      mountain.position.set(pos.x, 0, pos.z);
      scene.add(mountain);
    });
    
    console.log(`✓ Added ${mountainPositions.length} mountains to battle scene`);

    // Add small rocks scattered near mountains
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 1.0,
      flatShading: true
    });

    for (let i = 0; i < 30; i++) {
      const size = 0.1 + Math.random() * 0.15;
      const rockGeom = new THREE.DodecahedronGeometry(size, 0);
      
      // Randomize vertices for irregular rocks
      const posAttr = rockGeom.attributes.position;
      for (let j = 0; j < posAttr.count; j++) {
        posAttr.setX(j, posAttr.getX(j) * (0.8 + Math.random() * 0.4));
        posAttr.setY(j, posAttr.getY(j) * (0.8 + Math.random() * 0.4));
        posAttr.setZ(j, posAttr.getZ(j) * (0.8 + Math.random() * 0.4));
      }
      rockGeom.computeVertexNormals();
      
      const rock = new THREE.Mesh(rockGeom, rockMat);
      
      // Scatter near edges
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.random() * 2;
      rock.position.x = Math.cos(angle) * dist;
      rock.position.z = Math.sin(angle) * dist;
      rock.position.y = size * 0.5;
      
      rock.rotation.x = Math.random() * Math.PI;
      rock.rotation.y = Math.random() * Math.PI;
      rock.rotation.z = Math.random() * Math.PI;
      
      scene.add(rock);
    }

    // Add floating particles
    const particleCount = 150;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      // Spread particles around the battlefield
      positions[i3] = (Math.random() - 0.5) * 12;
      positions[i3 + 1] = Math.random() * 4 + 0.5;
      positions[i3 + 2] = (Math.random() - 0.5) * 10;

      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeom.userData.velocities = velocities;

    const particleMat = new THREE.PointsMaterial({
      color: 0x8844aa,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      depthTest: false
    });

    const particles = new THREE.Points(particleGeom, particleMat);
    particles.renderOrder = 999;
    scene.add(particles);

    // Load soul on the left
    console.log('Loading soul:', `soul_${state.soul.type}`);
    const soulMesh = this.prefabManager.instantiate(`soul_${state.soul.type}`);
    console.log('Soul mesh:', soulMesh);
    if (soulMesh) {
      soulMesh.position.set(-1.2, 0, 0);
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
            if (state.soul.type === 'brute') {
              mountPoint.position.set(0, 1.45, 0.5); // Near eyes for brute
            } else {
              mountPoint.position.set(0, 0.9, 0.5); // Default for imp
            }
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'hollow' || state.soul.type === 'blight') {
            // Hollow and Blight use bone-like models
            mountPoint = new THREE.Object3D();
            if (state.soul.type === 'blight') {
              mountPoint.position.set(0, 1.25, 0.45); // Near eyes for blight
            } else {
              mountPoint.position.set(0, 1.4, 0.45); // Default for hollow
            }
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'cur') {
            // Cur - dog head
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.5, 0.9, 0.3);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'scamp') {
            // Scamp - small imp head, near eyes
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.1, 0.3);
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'varmint') {
            // Varmint - rat face, rotated to face forward
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.3, 0.75, 0.2);
            mountPoint.rotation.y = Math.PI / 2; // Rotate 90 degrees to face mask forward
            soulMesh.add(mountPoint);
          } else if (state.soul.type === 'knave') {
            // Knave - hooded face
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.3, 0.25);
            soulMesh.add(mountPoint);
          }
          
          if (mountPoint) {
            maskMesh.scale.set(1.0, 1.0, 1.0);
            maskMesh.userData.isMask = true;
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
      enemyMesh.position.set(1.2, 0, 0);
      enemyMesh.rotation.y = -Math.PI / 4; // Face left
      scene.add(enemyMesh);
    }

    // Create intent label above enemy
    let intentLabel = null;
    if (state.enemy.intent && enemyMesh) {
      const intentDiv = document.createElement('div');
      intentDiv.className = 'intent-label';
      intentDiv.style.cssText = `
        background: rgba(10, 10, 10, 0.95);
        border: 2px solid #ff0033;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 20px;
        color: #fff;
        font-family: 'IM Fell DW Pica SC', serif;
        white-space: nowrap;
        pointer-events: none;
      `;
      intentDiv.textContent = `${state.enemy.intent.icon} ${state.enemy.intent.value}`;
      
      intentLabel = new CSS2DObject(intentDiv);
      intentLabel.position.set(0, 1.8, 0);
      enemyMesh.add(intentLabel);
    }

    // Store scene data
    this.battleScene = {
      scene,
      camera,
      renderer,
      labelRenderer,
      composer,
      renderPass,
      pixelPass,
      halftonePass,
      soulMesh,
      enemyMesh,
      intentLabel,
      particles,
      cameraAngle: 0,
      // Animation state
      soulBasePos: soulMesh ? soulMesh.position.clone() : null,
      enemyBasePos: enemyMesh ? enemyMesh.position.clone() : null,
      attackAnim: null,
      healthBarAnim: null,
      maskHealthBarAnim: null
    };

    // Listen for post-processing changes
    const ppHandler = (e) => {
      if (!this.battleScene) return;
      const { mode } = e.detail;
      
      // Remove effect passes (keep render pass)
      composer.passes = [renderPass];
      
      // Add appropriate pass
      if (mode === 'pixelation') {
        pixelPass.renderToScreen = true;
        composer.addPass(pixelPass);
      } else if (mode === 'halftone') {
        halftonePass.renderToScreen = true;
        composer.addPass(halftonePass);
      } else {
        renderPass.renderToScreen = true;
      }
    };
    window.addEventListener('postProcessingChanged', ppHandler);
    this.battleScene.ppHandler = ppHandler;

    // Handle resize
    const resizeHandler = () => {
      if (!this.battleScene) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
      pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
      halftonePass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resizeHandler);
    this.battleScene.resizeHandler = resizeHandler;

    // Start animation
    this.animateBattleScene();
  }

  updateBattleScene(state) {
    // Update enemy intent label
    if (this.battleScene && this.battleScene.intentLabel && state.enemy.intent) {
      const intentDiv = this.battleScene.intentLabel.element;
      intentDiv.textContent = `${state.enemy.intent.icon} ${state.enemy.intent.value}`;
    }
    
    // Hide mask if broken
    if (this.battleScene && this.battleScene.soulMesh && state.soul.maskBroken) {
      // Find and hide the mask mesh
      this.battleScene.soulMesh.traverse((child) => {
        if (child.userData && child.userData.isMask) {
          child.visible = false;
        }
      });
    }
  }

  animateBattleScene() {
    if (!this.battleScene) return;

    this.battleAnimationId = requestAnimationFrame(() => this.animateBattleScene());

    const { scene, camera, composer, soulMesh, enemyMesh, particles, cameraAngle } = this.battleScene;

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

    // Handle attack animation
    if (this.battleScene.attackAnim) {
      const anim = this.battleScene.attackAnim;
      const elapsed = Date.now() - anim.startTime;
      const totalDuration = anim.jabDuration + anim.returnDuration;

      if (elapsed < totalDuration) {
        // Attacker jab animation with ease-in
        if (elapsed < anim.jabDuration) {
          // Jab forward - cubic ease-in (slow start, fast acceleration)
          const t = elapsed / anim.jabDuration;
          const eased = t * t * t; // Cubic ease-in
          
          anim.attackerMesh.position.copy(anim.attackerBasePos);
          anim.attackerMesh.position.add(anim.targetOffset.clone().multiplyScalar(eased));
          
          // Play sound at 70% of jab (just before impact)
          if (!anim.soundPlayed && t > 0.7) {
            if (anim.wasBlocked) {
              sfx.blockTink();
            } else {
              sfx.attack();
            }
            anim.soundPlayed = true;
          }
        } else {
          // Return back - ease-out
          const returnElapsed = elapsed - anim.jabDuration;
          const t = returnElapsed / anim.returnDuration;
          const eased = 1 - (1 - t) * (1 - t) * (1 - t); // Cubic ease-out
          
          anim.attackerMesh.position.copy(anim.attackerBasePos);
          anim.attackerMesh.position.add(anim.targetOffset.clone().multiplyScalar(1 - eased));
        }
        
        // Victim wobble animation (starts at impact) - only if not blocked
        if (!anim.wasBlocked && anim.victimMesh && anim.victimBasePos && elapsed > anim.jabDuration * 0.7) {
          const wobbleElapsed = elapsed - (anim.jabDuration * 0.7);
          if (wobbleElapsed < anim.wobbleDuration) {
            const wobbleProgress = wobbleElapsed / anim.wobbleDuration;
            // Damped oscillation
            const wobbleAmount = Math.sin(wobbleProgress * Math.PI * 4) * (1 - wobbleProgress) * 0.15;
            
            anim.victimMesh.position.copy(anim.victimBasePos);
            anim.victimMesh.position.x += wobbleAmount;
            anim.victimMesh.rotation.z = wobbleAmount * 0.3;
          } else {
            // Reset victim
            anim.victimMesh.position.copy(anim.victimBasePos);
            anim.victimMesh.rotation.z = 0;
          }
        }
      } else {
        // Animation complete, reset positions
        anim.attackerMesh.position.copy(anim.attackerBasePos);
        if (anim.victimMesh && anim.victimBasePos) {
          anim.victimMesh.position.copy(anim.victimBasePos);
          anim.victimMesh.rotation.z = 0;
        }
        this.battleScene.attackAnim = null;
      }
    }

    // Handle health bar animation
    if (this.battleScene.healthBarAnim) {
      const anim = this.battleScene.healthBarAnim;
      const elapsed = Date.now() - anim.startTime;
      const totalDuration = anim.shakeDuration + anim.stallDuration + anim.lerpDuration;

      if (elapsed < totalDuration) {
        if (elapsed < anim.shakeDuration + anim.stallDuration) {
          // Keep back bar at previous health during shake and stall
          const prevPercentage = Math.max(0, (anim.prevHealth / anim.maxHealth) * 100);
          anim.backBar.style.width = prevPercentage + '%';
        } else {
          // Lerp back bar down to match front bar
          const lerpElapsed = elapsed - anim.shakeDuration - anim.stallDuration;
          const lerpProgress = Math.min(lerpElapsed / anim.lerpDuration, 1);
          
          // Ease out the lerp
          const eased = 1 - Math.pow(1 - lerpProgress, 3);
          
          const currentHealth = anim.prevHealth - (anim.damage * eased);
          const percentage = Math.max(0, (currentHealth / anim.maxHealth) * 100);
          anim.backBar.style.width = percentage + '%';
        }
      } else {
        // Animation complete - ensure final state
        const finalPercentage = Math.max(0, (anim.newHealth / anim.maxHealth) * 100);
        anim.backBar.style.width = finalPercentage + '%';
        this.battleScene.healthBarAnim = null;
      }
    }

    // Handle mask health bar animation
    if (this.battleScene.maskHealthBarAnim) {
      const anim = this.battleScene.maskHealthBarAnim;
      const elapsed = Date.now() - anim.startTime;
      const totalDuration = anim.shakeDuration + anim.stallDuration + anim.lerpDuration;

      if (elapsed < totalDuration) {
        if (elapsed < anim.shakeDuration + anim.stallDuration) {
          // Keep back bar at previous health during shake and stall
          const prevPercentage = Math.max(0, (anim.prevHealth / anim.maxHealth) * 100);
          anim.backBar.style.width = prevPercentage + '%';
        } else {
          // Lerp back bar down to match front bar
          const lerpElapsed = elapsed - anim.shakeDuration - anim.stallDuration;
          const lerpProgress = Math.min(lerpElapsed / anim.lerpDuration, 1);
          
          // Ease out the lerp
          const eased = 1 - Math.pow(1 - lerpProgress, 3);
          
          const currentHealth = anim.prevHealth - (anim.damage * eased);
          const percentage = Math.max(0, (currentHealth / anim.maxHealth) * 100);
          anim.backBar.style.width = percentage + '%';
        }
      } else {
        // Animation complete - ensure final state
        const finalPercentage = Math.max(0, (anim.newHealth / anim.maxHealth) * 100);
        anim.backBar.style.width = finalPercentage + '%';
        this.battleScene.maskHealthBarAnim = null;
      }
    }

    // Animate particles
    if (particles) {
      const posAttr = particles.geometry.attributes.position;
      const velocities = particles.geometry.userData.velocities;

      for (let i = 0; i < posAttr.count; i++) {
        const i3 = i * 3;
        
        // Update positions
        posAttr.array[i3] += velocities[i3];
        posAttr.array[i3 + 1] += velocities[i3 + 1];
        posAttr.array[i3 + 2] += velocities[i3 + 2];

        // Wrap around boundaries
        if (Math.abs(posAttr.array[i3]) > 6) posAttr.array[i3] *= -0.9;
        if (posAttr.array[i3 + 1] > 5) posAttr.array[i3 + 1] = 0.5;
        if (posAttr.array[i3 + 1] < 0.5) posAttr.array[i3 + 1] = 5;
        if (Math.abs(posAttr.array[i3 + 2]) > 5) posAttr.array[i3 + 2] *= -0.9;
      }

      posAttr.needsUpdate = true;
    }

    composer.render();
    this.battleScene.labelRenderer.render(scene, camera);
  }

  disposeBattleScene() {
    if (!this.battleScene) return;

    cancelAnimationFrame(this.battleAnimationId);
    this.battleAnimationId = null;

    const container = document.getElementById('battle-canvas-container');
    container.classList.remove('active');
    container.innerHTML = '';

    if (this.battleScene.ppHandler) {
      window.removeEventListener('postProcessingChanged', this.battleScene.ppHandler);
    }

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
      sfx.cardPlay();
      
      // Decrease affection if playing a scar card
      if (result.scarCard) {
        const soul = this.game.combat.soul;
        soul.changeAffection(-3); // -3 for playing scar card (mask breaking consequence)
      }
      
      // Trigger attack animation if card was an attack
      if (result.animEvent && result.animEvent.type === 'soul_attack') {
        this.startAttackAnimation('soul', result.animEvent);
      }
      
      // Trigger defend animation if card was a defend
      if (result.animEvent && result.animEvent.type === 'soul_defend') {
        this.startDefendAnimation('soul', result.animEvent);
        
        // If defend card had health cost (scar card), show self-damage animation
        if (result.animEvent.healthCost > 0) {
          setTimeout(() => {
            const combatState = this.game.getCombatState();
            const selfDamageEvent = {
              type: 'soul_self_damage',
              damage: result.animEvent.healthCost,
              prevHealth: combatState.soul.blood + result.animEvent.healthCost,
              newHealth: combatState.soul.blood
            };
            this.startSelfDamageAnimation(selfDamageEvent);
          }, 200);
        }
      }
      
      // If attack card had self-damage (scar card), show self-damage animation after attack
      if (result.card && result.card.self_damage > 0) {
        setTimeout(() => {
          const combatState = this.game.getCombatState();
          const selfDamageEvent = {
            type: 'soul_self_damage',
            damage: result.card.self_damage,
            prevHealth: combatState.soul.blood + result.card.self_damage,
            newHealth: combatState.soul.blood
          };
          this.startSelfDamageAnimation(selfDamageEvent);
        }, 600); // After attack animation
      }
      
      this.renderBattle(result.state);
    } else {
      sfx.error();
      console.log(result.error);
    }
  }

  endTurn() {
    sfx.buttonClick();
    const result = this.game.endTurn();
    if (result.success) {
      // Trigger enemy attack animation if enemy attacked
      if (result.enemyAnimEvent && result.enemyAnimEvent.type === 'enemy_attack') {
        this.startAttackAnimation('enemy', result.enemyAnimEvent);
      }
      
      this.renderBattle(result.state);
    }
  }

  previewCardEffect(handIndex) {
    sfx.cardHover();
    
    const state = this.game.getCombatState();
    if (!state || handIndex >= state.hand.length) return;
    
    const card = state.hand[handIndex];
    if (card.unplayable || card.cost > state.energy) return;
    
    // Create preview overlay on health bars
    if (card.type === 'attack' && card.damage) {
      const enemyHealthBar = document.getElementById('enemy-health-bar-fill');
      if (!enemyHealthBar) return;
      
      // Calculate preview damage
      const actualDamage = Math.max(0, card.damage - state.enemy.block);
      const newHealth = Math.max(0, state.enemy.blood - actualDamage);
      const newPercentage = (newHealth / state.enemy.maxBlood) * 100;
      
      // Create preview bar
      let previewBar = document.getElementById('enemy-preview-bar');
      if (!previewBar) {
        previewBar = document.createElement('div');
        previewBar.id = 'enemy-preview-bar';
        previewBar.style.position = 'absolute';
        previewBar.style.top = '0';
        previewBar.style.left = '0';
        previewBar.style.height = '100%';
        previewBar.style.background = 'rgba(255, 255, 100, 0.4)';
        previewBar.style.pointerEvents = 'none';
        previewBar.style.zIndex = '5';
        enemyHealthBar.parentElement.appendChild(previewBar);
      }
      previewBar.style.width = newPercentage + '%';
      
    } else if (card.type === 'defend' && card.block) {
      const soulBlockDisplay = document.querySelector('.combatant:nth-child(1) .health-bar-floating');
      if (!soulBlockDisplay) return;
      
      // Show preview block amount
      let previewBlock = document.getElementById('soul-preview-block');
      if (!previewBlock) {
        previewBlock = document.createElement('div');
        previewBlock.id = 'soul-preview-block';
        previewBlock.style.fontSize = '11px';
        previewBlock.style.color = 'rgba(59, 130, 246, 0.8)';
        previewBlock.style.fontWeight = 'bold';
        previewBlock.style.marginTop = '4px';
        soulBlockDisplay.appendChild(previewBlock);
      }
      const newBlock = state.soul.block + card.block;
      previewBlock.textContent = `🛡️ ${state.soul.block} → ${newBlock}`;
    }
  }

  clearCardPreview() {
    // Remove enemy health preview
    const enemyPreview = document.getElementById('enemy-preview-bar');
    if (enemyPreview) enemyPreview.remove();
    
    // Remove soul block preview
    const soulPreview = document.getElementById('soul-preview-block');
    if (soulPreview) soulPreview.remove();
  }

  viewDrawPile() {
    sfx.buttonClick();
    const state = this.game.getCombatState();
    if (!state) return;

    this.showPileModal('Draw Pile', state.deck);
  }

  viewDiscardPile() {
    sfx.buttonClick();
    const state = this.game.getCombatState();
    if (!state) return;

    this.showPileModal('Discard Pile', state.discard);
  }

  viewVoidPile() {
    sfx.buttonClick();
    const state = this.game.getCombatState();
    if (!state) return;

    this.showPileModal('Void (Banished)', state.voidPile);
  }

  viewSoulDeck(soulId) {
    sfx.buttonClick();
    const soul = this.game.getSouls().find(s => s.id === soulId);
    if (!soul) return;

    const deck = soul.buildDeck(this.game.config);
    this.showPileModal(`${soul.name}'s Deck`, deck);
  }

  showPileModal(title, cards) {
    const modal = document.createElement('div');
    modal.className = 'pile-modal-overlay';
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    modal.innerHTML = `
      <div class="pile-modal">
        <h2>${title} (${cards.length})</h2>
        <div class="pile-cards">
          ${cards.length === 0 ? '<p style="color: #999;">Empty</p>' : ''}
          ${cards.map(card => {
            let sourceIcon = '👿'; // soul default
            if (card.source === 'mask') sourceIcon = '👺';
            if (card.source === 'scar') sourceIcon = '🩹';
            
            return `
              <div class="card ${card.type} ${card.source === 'scar' ? 'scar' : ''}">
                <div class="card-cost-circle">${card.cost}</div>
                <div class="card-source-icon">${sourceIcon}</div>
                <div class="card-header">
                  <div class="card-name">${card.name}</div>
                </div>
                <div class="card-illustration">
                  ${card.source === 'scar' ? '💔' : card.type === 'attack' ? '⚔️' : card.type === 'defend' ? '🛡️' : '✨'}
                </div>
                <div class="card-footer">
                  <div class="card-desc">${card.description || ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
        <button onclick="this.closest('.pile-modal-overlay').remove()" style="margin-top: 20px;">Close</button>
      </div>
    `;

    document.body.appendChild(modal);
  }

  startAttackAnimation(attacker, animEvent) {
    if (!this.battleScene) return;

    const { soulMesh, enemyMesh, soulBasePos, enemyBasePos } = this.battleScene;

    // Set up animation
    const isSoulAttacking = attacker === 'soul';
    const attackerMesh = isSoulAttacking ? soulMesh : enemyMesh;
    const victimMesh = isSoulAttacking ? enemyMesh : soulMesh;
    const attackerBasePos = isSoulAttacking ? soulBasePos : enemyBasePos;
    const victimBasePos = isSoulAttacking ? enemyBasePos : soulBasePos;
    const targetPos = victimBasePos;

    if (!attackerMesh || !attackerBasePos || !targetPos) return;

    const jabDistance = 0.6;
    const direction = new THREE.Vector3()
      .subVectors(targetPos, attackerBasePos)
      .normalize()
      .multiplyScalar(jabDistance);

    // Check if attack was fully blocked (no damage dealt)
    const wasBlocked = animEvent && animEvent.damage === 0;

    this.battleScene.attackAnim = {
      attackerMesh,
      victimMesh,
      attackerBasePos: attackerBasePos.clone(),
      victimBasePos: victimBasePos ? victimBasePos.clone() : null,
      targetOffset: direction,
      startTime: Date.now(),
      jabDuration: 350,      // Faster jab forward
      returnDuration: 250,   // Quick return
      wobbleDuration: 400,   // Victim wobble
      soundPlayed: false,
      wasBlocked,
      attacker
    };

    // Start health bar animation or shield swell
    if (wasBlocked) {
      this.startShieldSwellAnimation(attacker);
    } else {
      this.startHealthBarAnimation(attacker, animEvent);
    }
  }

  startHealthBarAnimation(attacker, animEvent) {
    if (!animEvent) return;

    // Check if this was an enemy attack that damaged the mask
    const maskDamaged = attacker === 'enemy' && animEvent.maskDamage > 0;
    
    // Check if mask JUST broke (only trigger once)
    // maskBroken is true, but we haven't shown the break sequence yet
    if (animEvent.maskBroken && !this.maskBreakSequenceShown) {
      this.maskBreakSequenceShown = true;
      this.handleMaskBreak();
    }
    
    if (maskDamaged && animEvent.newMaskHealth > 0) {
      // Animate mask health bar
      const maskFrontBar = document.getElementById('mask-health-bar-fill');
      const maskBackBar = document.getElementById('mask-health-bar-back');
      
      if (maskFrontBar && maskBackBar) {
        const combatState = this.game.getCombatState();
        const maskMaxHealth = combatState.soul.maskMaxBlood;
        
        // Instantly snap front bar to new health
        const newPercentage = Math.max(0, (animEvent.newMaskHealth / maskMaxHealth) * 100);
        maskFrontBar.style.width = newPercentage + '%';
        
        // Store mask animation
        this.battleScene.maskHealthBarAnim = {
          frontBar: maskFrontBar,
          backBar: maskBackBar,
          prevHealth: animEvent.prevMaskHealth,
          newHealth: animEvent.newMaskHealth,
          damage: animEvent.maskDamage,
          maxHealth: maskMaxHealth,
          startTime: Date.now(),
          shakeDuration: 400,
          stallDuration: 100,
          lerpDuration: 500,
          attacker: 'enemy'
        };
        
        // Add shake to mask bar
        maskFrontBar.parentElement.classList.add('health-bar-shake');
        setTimeout(() => {
          if (maskFrontBar.parentElement) {
            maskFrontBar.parentElement.classList.remove('health-bar-shake');
          }
        }, 400);
      }
    }
    
    // Animate soul health bar if it took damage
    if (attacker === 'enemy' && animEvent.damage > 0) {
      const frontBar = document.getElementById('soul-health-bar-fill');
      const backBar = document.getElementById('soul-health-bar-back');
      
      if (frontBar && backBar) {
        const combatState = this.game.getCombatState();
        const maxHealth = combatState.soul.maxBlood;
        
        // Instantly snap front bar to new health
        const newPercentage = Math.max(0, (animEvent.newHealth / maxHealth) * 100);
        frontBar.style.width = newPercentage + '%';
        
        this.battleScene.healthBarAnim = {
          frontBar,
          backBar,
          prevHealth: animEvent.prevHealth,
          newHealth: animEvent.newHealth,
          damage: animEvent.damage,
          maxHealth,
          startTime: Date.now(),
          shakeDuration: 400,
          stallDuration: 100,
          lerpDuration: 500,
          attacker: 'enemy'
        };
        
        // Add shake class to parent
        frontBar.parentElement.classList.add('health-bar-shake');
        setTimeout(() => {
          if (frontBar.parentElement) {
            frontBar.parentElement.classList.remove('health-bar-shake');
          }
        }, 400);
      }
    } else if (attacker === 'soul') {
      // Soul attacking enemy
      const frontBar = document.getElementById('enemy-health-bar-fill');
      const backBar = document.getElementById('enemy-health-bar-back');
      
      if (frontBar && backBar) {
        const combatState = this.game.getCombatState();
        const maxHealth = combatState.enemy.maxBlood;
        
        // Instantly snap front bar to new health
        const newPercentage = Math.max(0, (animEvent.newHealth / maxHealth) * 100);
        frontBar.style.width = newPercentage + '%';
        
        this.battleScene.healthBarAnim = {
          frontBar,
          backBar,
          prevHealth: animEvent.prevHealth,
          newHealth: animEvent.newHealth,
          damage: animEvent.damage,
          maxHealth,
          startTime: Date.now(),
          shakeDuration: 400,
          stallDuration: 100,
          lerpDuration: 500,
          attacker: 'soul'
        };
        
        // Add shake class to parent
        frontBar.parentElement.classList.add('health-bar-shake');
        setTimeout(() => {
          if (frontBar.parentElement) {
            frontBar.parentElement.classList.remove('health-bar-shake');
          }
        }, 400);
      }
    }
  }

  startShieldSwellAnimation(attacker) {
    // Find the shield icon for the victim (opposite of attacker)
    const victimSelector = attacker === 'soul' ? '.combatant:nth-child(2)' : '.combatant:nth-child(1)';
    const victimDiv = document.querySelector(victimSelector);
    
    if (!victimDiv) return;

    // Find or create shield icon element
    const shieldText = victimDiv.textContent;
    const shieldMatch = shieldText.match(/🛡️\s*(\d+)/);
    
    if (!shieldMatch) return; // No shield to animate

    // Create a temporary animated shield element
    const animShield = document.createElement('div');
    animShield.style.position = 'fixed';
    animShield.style.fontSize = '48px';
    animShield.style.zIndex = '10000';
    animShield.style.pointerEvents = 'none';
    animShield.textContent = '🛡️';
    animShield.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s';
    animShield.style.transform = 'scale(1)';
    animShield.style.opacity = '1';
    
    // Position near the victim's health bar
    const healthBarRect = victimDiv.querySelector('.health-bar').getBoundingClientRect();
    animShield.style.left = (healthBarRect.left + healthBarRect.width / 2 - 24) + 'px';
    animShield.style.top = (healthBarRect.top + healthBarRect.height / 2 - 24) + 'px';
    
    document.body.appendChild(animShield);
    
    // Trigger animation
    requestAnimationFrame(() => {
      animShield.style.transform = 'scale(2)';
      animShield.style.opacity = '0';
    });
    
    // Remove element after animation
    setTimeout(() => {
      animShield.remove();
    }, 300);
  }

  handleMaskBreak() {
    // Play dramatic shatter sound
    sfx.maskShatter();
    
    // Get soul's mask break quote
    const combatState = this.game.getCombatState();
    const soul = combatState?.soul;
    if (!soul) return;
    
    const quote = this.game.combat.soul.getMaskBreakQuote();
    if (!quote) return;
    
    // Show quote in world space above soul with typewriter effect
    if (this.battleScene && this.battleScene.soulMesh) {
      const quoteDiv = document.createElement('div');
      quoteDiv.style.cssText = `
        background: #000000;
        padding: 12px 16px;
        border-radius: 15px;
        font-size: 14px;
        font-style: italic;
        text-align: center;
        max-width: 250px;
        color: #fff;
        line-height: 1.4;
      `;
      
      const quoteLabel = new CSS2DObject(quoteDiv);
      quoteLabel.position.set(0, 1.8, 0);
      this.battleScene.soulMesh.add(quoteLabel);
      
      // Typewriter effect with sound
      let charIndex = 0;
      const typeSpeed = 50;
      
      const typeNextChar = () => {
        if (charIndex < quote.length) {
          quoteDiv.textContent += quote[charIndex];
          
          // Play MIDI sound for each character (skip spaces)
          if (quote[charIndex] !== ' ') {
            const pitch = 200 + Math.random() * 200;
            sfx.playTone(pitch, 0.05, 0.15, 'square');
          }
          
          charIndex++;
          setTimeout(typeNextChar, typeSpeed);
        } else {
          // Text complete, wait then fade out
          setTimeout(() => {
            quoteDiv.style.transition = 'opacity 0.5s';
            quoteDiv.style.opacity = '0';
            setTimeout(() => {
              if (this.battleScene && this.battleScene.soulMesh) {
                this.battleScene.soulMesh.remove(quoteLabel);
              }
            }, 500);
          }, 1500);
        }
      };
      
      typeNextChar();
    }
  }

  startDefendAnimation(defender, animEvent) {
    if (!animEvent) return;
    
    // Play tink sound
    sfx.blockTink();
    
    // Find the defender's shield icon
    const defenderSelector = defender === 'soul' ? '.combatant:nth-child(1)' : '.combatant:nth-child(2)';
    const defenderDiv = document.querySelector(defenderSelector);
    
    if (!defenderDiv) return;
    
    // Find the health bar area to position the shield animation
    const healthBarFloating = defenderDiv.querySelector('.health-bar-floating');
    if (!healthBarFloating) return;
    
    // Create a temporary animated shield element
    const animShield = document.createElement('div');
    animShield.style.position = 'fixed';
    animShield.style.fontSize = '32px';
    animShield.style.zIndex = '10000';
    animShield.style.pointerEvents = 'none';
    animShield.textContent = '🛡️';
    animShield.className = 'shield-shake-anim';
    
    // Position near the defender's health bar
    const rect = healthBarFloating.getBoundingClientRect();
    animShield.style.left = (rect.left + rect.width / 2 - 16) + 'px';
    animShield.style.top = (rect.top + rect.height / 2 - 16) + 'px';
    
    document.body.appendChild(animShield);
    
    // Shake animation using keyframes
    const keyframes = [
      { transform: 'translate(0, 0) rotate(0deg)', offset: 0 },
      { transform: 'translate(-3px, -2px) rotate(-5deg)', offset: 0.1 },
      { transform: 'translate(3px, -1px) rotate(5deg)', offset: 0.2 },
      { transform: 'translate(-2px, 1px) rotate(-3deg)', offset: 0.3 },
      { transform: 'translate(2px, -1px) rotate(3deg)', offset: 0.4 },
      { transform: 'translate(-1px, 0px) rotate(-2deg)', offset: 0.5 },
      { transform: 'translate(1px, 1px) rotate(2deg)', offset: 0.6 },
      { transform: 'translate(0, 0) rotate(0deg)', offset: 0.7 },
      { transform: 'translate(0, 0) rotate(0deg)', offset: 1 }
    ];
    
    const timing = {
      duration: 400,
      iterations: 1,
      easing: 'linear'
    };
    
    animShield.animate(keyframes, timing);
    
    // Remove element after animation
    setTimeout(() => {
      animShield.remove();
    }, 400);
  }

  startSelfDamageAnimation(selfDamageEvent) {
    // Animate soul health bar for self-damage
    const frontBar = document.getElementById('soul-health-bar-fill');
    const backBar = document.getElementById('soul-health-bar-back');
    
    if (!frontBar || !backBar) return;
    
    const combatState = this.game.getCombatState();
    const maxHealth = combatState.soul.maxBlood;
    
    // Instantly snap front bar to new health
    const newPercentage = Math.max(0, (selfDamageEvent.newHealth / maxHealth) * 100);
    frontBar.style.width = newPercentage + '%';
    
    this.battleScene.healthBarAnim = {
      frontBar,
      backBar,
      prevHealth: selfDamageEvent.prevHealth,
      newHealth: selfDamageEvent.newHealth,
      damage: selfDamageEvent.damage,
      maxHealth,
      startTime: Date.now(),
      shakeDuration: 400,
      stallDuration: 100,
      lerpDuration: 500,
      attacker: 'self'
    };
    
    // Add shake class to parent
    frontBar.parentElement.classList.add('health-bar-shake');
    setTimeout(() => {
      if (frontBar.parentElement) {
        frontBar.parentElement.classList.remove('health-bar-shake');
      }
    }, 400);
  }

  handleBattleEnd() {
    const result = this.game.resolveBattle();
    if (result.success) {
      // Play victory stinger (defeat stinger played in defeat sequence)
      if (result.result === 'victory') {
        sfx.victory();
      }
      
      // Dispose battle scene
      this.disposeBattleScene();
      
      // Re-render souls bar to update mask status
      this.updateSoulsBar();
      
      // Show souls bar again when battle ends (but hide it if it's game over)
      const aliveSouls = this.game.state.souls.filter(s => s.blood > 0);
      const isGameOver = result.result === 'defeat' && aliveSouls.length === 0;
      
      const soulsBar = document.querySelector('.souls-bar');
      if (soulsBar && !isGameOver) {
        soulsBar.style.display = 'flex';
      }
      
      this.renderCardChoice(result);
    }
  }

  showDefeatSequence() {
    const soul = this.game.combat.soul;
    const quote = soul.getDefeatQuote();
    
    // Play defeat stinger
    sfx.defeat();
    
    if (!this.battleScene) return;
    
    const { camera, soulMesh } = this.battleScene;
    if (!camera || !soulMesh) {
      // No 3D scene, skip to end
      setTimeout(() => this.handleBattleEnd(), 1500);
      return;
    }
    
    // Zoom camera in on soul dramatically
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(
      soulMesh.position.x + 1.5,
      soulMesh.position.y + 1,
      soulMesh.position.z + 1.5
    );
    
    const startTime = Date.now();
    const zoomDuration = 1000;
    
    const animateZoom = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / zoomDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      camera.position.lerpVectors(startPos, targetPos, eased);
      camera.lookAt(soulMesh.position.x, soulMesh.position.y + 1, soulMesh.position.z);
      
      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      } else {
        // Zoom complete, show quote
        this.showDefeatQuote(soul.id, quote, false); // false = show game over after
      }
    };
    
    animateZoom();
  }

  showDefeatSequenceAndContinue() {
    const soul = this.game.combat.soul;
    const quote = soul.getDefeatQuote();
    
    // Play defeat stinger
    sfx.defeat();
    
    // Show souls bar immediately so we can show the quote above the defeated soul
    const soulsBar = document.querySelector('.souls-bar');
    if (soulsBar) {
      soulsBar.style.display = 'flex';
    }
    
    if (!this.battleScene) return;
    
    const { camera, soulMesh } = this.battleScene;
    if (!camera || !soulMesh) {
      // No 3D scene, skip to continue
      setTimeout(() => this.showDefeatQuote(soul.id, quote, true), 500);
      return;
    }
    
    // Zoom camera in on soul dramatically
    const startPos = camera.position.clone();
    const targetPos = new THREE.Vector3(
      soulMesh.position.x + 1.5,
      soulMesh.position.y + 1,
      soulMesh.position.z + 1.5
    );
    
    const startTime = Date.now();
    const zoomDuration = 1000;
    
    const animateZoom = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / zoomDuration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      camera.position.lerpVectors(startPos, targetPos, eased);
      camera.lookAt(soulMesh.position.x, soulMesh.position.y + 1, soulMesh.position.z);
      
      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      } else {
        // Zoom complete, show quote
        this.showDefeatQuote(soul.id, quote, true); // true = show soul choice after
      }
    };
    
    animateZoom();
  }

  showSoulChoiceForContinue() {
    // Soul bar is already visible from defeat sequence
    
    // Add a prompt message
    const battleScreen = document.getElementById('battle-screen');
    const existingPrompt = document.getElementById('soul-choice-prompt');
    if (existingPrompt) existingPrompt.remove();
    
    const prompt = document.createElement('div');
    prompt.id = 'soul-choice-prompt';
    prompt.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 20;
      background: rgba(0, 0, 0, 0.95);
      padding: 30px 50px;
      border-radius: 15px;
      border: 3px solid #f00;
      color: #fff;
      font-size: 24px;
      font-weight: bold;
      text-align: center;
      box-shadow: 0 10px 40px rgba(255, 0, 0, 0.5);
    `;
    prompt.textContent = '💀 Choose another soul to continue the battle';
    battleScreen.appendChild(prompt);
    
    // Make alive souls clickable
    setTimeout(() => {
      const aliveSouls = this.game.getSouls(); // Gets only alive souls
      const allSoulCards = Array.from(document.querySelectorAll('.soul-card-mini'));
      
      allSoulCards.forEach(card => {
        const soulId = parseInt(card.getAttribute('data-soul-id'), 10);
        const soul = aliveSouls.find(s => s.id === soulId);
        
        if (soul) {
          // This soul is alive - make it clickable
          card.style.cursor = 'pointer';
          card.style.border = '2px solid #0f0';
          card.style.transform = 'scale(1.05)';
          card.style.boxShadow = '0 0 20px rgba(0, 255, 0, 0.5)';
          card.onclick = () => {
            prompt.remove();
            this.continueBattleWith(soul.id);
          };
        } else {
          // This soul is dead - grey it out
          card.style.opacity = '0.4';
          card.style.filter = 'grayscale(1)';
          card.style.cursor = 'not-allowed';
        }
      });
    }, 100);
  }

  continueBattleWith(soulId) {
    // Reset the combat with the new soul against the same enemy
    const enemy = this.game.combat.enemy;
    
    // Remove the choice prompt
    const prompt = document.getElementById('soul-choice-prompt');
    if (prompt) prompt.remove();
    
    // End the current combat (clears the old soul's data)
    this.game.endCombat();
    
    // Start a new battle with the new soul against the same enemy
    const result = this.game.startBattleWithEnemy(soulId, enemy);
    if (result.success) {
      // Reset defeat sequence flag for this new attempt
      this.defeatSequenceShown = false;
      this.maskBreakSequenceShown = false;
      
      // Remove the defeated soul from the scene
      if (this.battleScene && this.battleScene.soulMesh) {
        this.battleScene.scene.remove(this.battleScene.soulMesh);
        this.battleScene.soulMesh = null;
      }
      if (this.battleScene && this.battleScene.maskMesh) {
        this.battleScene.scene.remove(this.battleScene.maskMesh);
        this.battleScene.maskMesh = null;
      }
      
      // Reset camera position
      if (this.battleScene && this.battleScene.camera) {
        this.battleScene.camera.position.set(0, 2, 5);
        this.battleScene.camera.lookAt(0, 1, 0);
      }
      
      // Add the new soul to the scene
      this.addSoulToBattleScene(result.combatState);
      
      // Hide souls bar again
      const soulsBar = document.querySelector('.souls-bar');
      if (soulsBar) {
        soulsBar.style.display = 'none';
      }
      
      // Reset soul card styling
      document.querySelectorAll('.soul-card-mini').forEach(card => {
        card.style.cursor = '';
        card.style.border = '';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.opacity = '';
        card.onclick = null;
      });
      
      // Render battle UI with the new soul's cards
      this.renderBattleStart(result.combatState);
    } else {
      alert(result.error);
    }
  }

  showDefeatQuote(soulId, quote, continueAfter) {
    if (!quote) {
      // No quote, proceed to next step
      setTimeout(() => {
        if (continueAfter) {
          this.showSoulChoiceForContinue();
        } else {
          this.handleBattleEnd();
        }
      }, 500);
      return;
    }
    
    // Find the soul card in the souls bar
    const soulCard = document.querySelector(`.soul-card-mini[data-soul-id="${soulId}"]`);
    if (!soulCard) {
      setTimeout(() => {
        if (continueAfter) {
          this.showSoulChoiceForContinue();
        } else {
          this.handleBattleEnd();
        }
      }, 500);
      return;
    }
    
    const rect = soulCard.getBoundingClientRect();
    
    // Show soul quote in speech bubble
    const speechBubble = document.createElement('div');
    speechBubble.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top - 120}px;
      transform: translateX(-50%);
      z-index: 21;
      background: #000000;
      padding: 10px 15px;
      border-radius: 10px;
      max-width: 250px;
      pointer-events: none;
    `;
    
    // Add pointer triangle
    const pointer = document.createElement('div');
    pointer.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: -10px;
      transform: translateX(-50%);
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 10px solid #000000;
    `;
    speechBubble.appendChild(pointer);
    
    const textElement = document.createElement('p');
    textElement.style.cssText = `
      margin: 0;
      color: #fff;
      font-size: 12px;
      font-style: italic;
      line-height: 1.3;
      text-align: center;
    `;
    speechBubble.appendChild(textElement);
    document.body.appendChild(speechBubble);
    
    // Typewriter effect
    let charIndex = 0;
    const typeSpeed = 40;
    
    const typeNextChar = () => {
      if (charIndex < quote.length) {
        textElement.textContent += quote[charIndex];
        
        if (quote[charIndex] !== ' ') {
          const pitch = 300 + Math.random() * 150;
          sfx.playTone(pitch, 0.04, 0.12, 'sine');
        }
        
        charIndex++;
        setTimeout(typeNextChar, typeSpeed);
      } else {
        // Wait then remove and proceed to defeat screen or soul choice
        setTimeout(() => {
          speechBubble.style.transition = 'opacity 0.3s';
          speechBubble.style.opacity = '0';
          setTimeout(() => {
            speechBubble.remove();
            if (continueAfter) {
              this.showSoulChoiceForContinue();
            } else {
              this.handleBattleEnd();
            }
          }, 300);
        }, 1500);
      }
    };
    
    typeNextChar();
  }

  renderCardChoice(battleResult) {
    const cardScreen = document.getElementById('trait-choice-screen');
    const isPositive = battleResult.result === 'victory';
    const soul = this.game.combat.soul;
    const hasMask = soul && soul.mask;
    const maskBroken = this.game.combat.maskBroken;
    
    // Handle defeat
    if (!isPositive) {
      // Check if this is the last soul
      const aliveSouls = this.game.state.souls.filter(s => s.blood > 0);
      const isLastSoul = aliveSouls.length === 0;
      
      if (isLastSoul) {
        // Game Over screen
        cardScreen.innerHTML = `
          <div class="panel" style="display: flex; flex-direction: column; align-items: center;">
            <h2>💀 GAME OVER</h2>
            <p>${soul.name} was your last soul...</p>
            <p style="margin-top: 20px; color: #999;">All souls have been defeated.</p>
            <button class="node-button" onclick="window.ui.restartRun()" style="margin-top: 30px;">
              Try Again?
            </button>
          </div>
        `;
      } else {
        // Regular defeat - just return to map
        cardScreen.innerHTML = `
          <div class="panel" style="display: flex; flex-direction: column; align-items: center;">
            <h2>💀 DEFEAT</h2>
            <p>${soul.name} was defeated...</p>
            <button class="node-button" onclick="window.ui.proceedFromDefeat()" style="margin-top: 30px;">
              Proceed
            </button>
          </div>
        `;
      }
      
      this.showScreen('trait-choice');
      return;
    }
    
    // If victory and no mask (or mask was broken), show soul-specific cards instead of mask cards
    if (isPositive && (!hasMask || maskBroken)) {
      const soulType = this.game.config.soulConfig.types.find(t => t.id === soul.type);
      const masklessCards = soulType?.maskless_victory_cards || ['slash', 'defend', 'heavy_strike'];
      
      cardScreen.innerHTML = `
        <div class="panel">
          <h2>🎉 VICTORY!</h2>
          <p>Choose a card to add to ${soul.name}'s deck:</p>
        </div>

        <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
          ${masklessCards.map(cardId => {
            const card = this.game.config.getCard(cardId);
            if (!card) return '';
            
            return `
              <div class="card ${card.type} trait-card-choice" onclick="window.ui.chooseMasklessCard('${cardId}')">
                <div class="card-cost-circle">${card.cost}</div>
                <div class="card-source-icon">👿</div>
                <div class="card-header">
                  <div class="card-name">${card.name}</div>
                </div>
                <div class="card-illustration">
                  ${card.type === 'attack' ? '⚔️' : card.type === 'defend' ? '🛡️' : '✨'}
                </div>
                <div class="card-footer">
                  <div class="card-desc">${card.description || ''}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      
      this.showScreen('trait-choice');
      return;
    }
    
    cardScreen.innerHTML = `
      <style>
        .mark-choice-card:hover {
          transform: scale(1.05);
          border-color: #ffe066 !important;
          box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
        }
      </style>
      
      <div class="panel">
        <h2>${isPositive ? '🎉 VICTORY!' : '💀 DEFEAT'}</h2>
        <p>${isPositive ? 'Choose a reward for your mask:' : 'Your mask broke! Choose a curse for your soul:'}</p>
      </div>

      <div style="display: flex; gap: 20px; justify-content: center; flex-wrap: wrap; margin-top: 20px;">
        ${isPositive && battleResult.availableMarks && battleResult.availableMarks.length > 0 ? 
          battleResult.availableMarks.map(markId => {
            const mark = this.game.config.getMark(markId);
            if (!mark) return '';
            
            const maskRarity = soul.mask?.rarity || 'common';
            const effect = mark.effects[maskRarity];
            
            return `
              <div class="mark-choice-card" onclick="window.ui.chooseMark('${markId}')" style="
                width: 180px;
                border: 3px solid #ffd700;
                padding: 15px;
                background: rgba(255, 215, 0, 0.1);
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                text-align: center;
              ">
                <div style="font-size: 32px; margin-bottom: 8px;">${mark.icon}</div>
                <div style="font-weight: bold; color: #ffd700; margin-bottom: 4px;">${mark.name}</div>
                <div style="font-size: 11px; color: #aaa; font-style: italic; margin-bottom: 8px;">${mark.description}</div>
                <div style="font-size: 10px; color: #888; margin-bottom: 6px; text-transform: uppercase;">
                  ${maskRarity} mask effect:
                </div>
                <div style="color: #fff; font-size: 13px; font-weight: bold;">${effect.description}</div>
              </div>
            `;
          }).join('') : ''
        }
        ${battleResult.availableCards.map(cardId => {
          const card = this.game.config.getCard(cardId);
          if (!card) return '';
          
          const sourceIcon = isPositive ? '👺' : '👿';
          const rarityColor = {
            'common': '#888',
            'rare': '#4a9eff',
            'legendary': '#ff9d00',
            'curse': '#8b00ff'
          }[card.rarity] || '#888';
          
          const rarityLabel = {
            'common': 'Common',
            'rare': 'Rare',
            'legendary': 'Legendary',
            'curse': 'Curse'
          }[card.rarity] || '';
          
          return `
            <div class="card ${card.type} trait-card-choice" onclick="window.ui.chooseCard('${cardId}', ${isPositive})">
              <div class="card-cost-circle">${card.cost}</div>
              <div class="card-source-icon">${sourceIcon}</div>
              <div class="card-rarity" style="color: ${rarityColor}; font-size: 10px; font-weight: bold; text-transform: uppercase; margin-top: 4px;">${rarityLabel}</div>
              <div class="card-header">
                <div class="card-name">${card.name}</div>
              </div>
              <div class="card-illustration">
                ${card.type === 'attack' ? '⚔️' : card.type === 'defend' ? '🛡️' : '✨'}
              </div>
              <div class="card-footer">
                <div class="card-desc">${card.description || ''}</div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.showScreen('trait-choice');
  }

  proceedFromDefeat() {
    sfx.buttonClick();
    this.game.state.completeCurrentNode();
    this.defeatSequenceShown = false; // Reset flag for next battle
    this.maskBreakSequenceShown = false;
    this.selectedSoul = null;
    this.renderMap();
  }

  restartRun() {
    sfx.buttonClick();
    this.game.reset();
    this.defeatSequenceShown = false; // Reset flag
    this.maskBreakSequenceShown = false;
    this.selectedSoul = null;
    this.renderMap();
  }

  chooseCard(cardId, isPositive) {
    if (isPositive) {
      sfx.positive();
    } else {
      sfx.negative();
    }
    this.game.applyCardChoice(cardId, isPositive);
    
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

  chooseMark(markId) {
    sfx.shrineTwinkle(); // Use a special sound for marks
    
    const result = this.game.applyMarkChoice(markId);
    
    if (result.success) {
      const mark = this.game.config.getMark(markId);
      console.log(`✓ Applied mark: ${mark.name}`);
    }
    
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

  chooseMasklessCard(cardId) {
    const soul = this.game.combat.soul;
    
    // Play positive sound
    sfx.positive();
    
    // Add the card ID to the soul's base cards (permanent deck)
    soul.baseCards.push(cardId);
    
    // Increase affection for choosing soul card
    const affectionQuote = soul.changeAffection(6); // +6 for choosing soul strength
    
    // Hide the victory screen cards
    const traitScreen = document.getElementById('trait-choice-screen');
    if (traitScreen) {
      traitScreen.classList.add('hidden');
    }
    
    // Display a quote - either affection quote or maskless victory quote
    this.showMasklessVictoryQuote(soul.id, affectionQuote);
    
    // Mark battle node as complete
    this.game.state.completeCurrentNode();
    
    const gameStatus = this.game.checkGameOver();
    if (gameStatus.gameOver) {
      alert(gameStatus.message);
      this.game.reset();
    }

    this.selectedSoul = null;
    
    // Delay rendering map to show the quote
    setTimeout(() => {
      this.renderMap();
    }, 2500);
  }

  showMasklessVictoryQuote(soulId, affectionQuote) {
    const soul = this.game.state.souls.find(m => m.id === soulId);
    if (!soul) return;
    
    const soulType = this.game.config.soulConfig.types.find(t => t.id === soul.type);
    
    // Use affection quote if available, otherwise use maskless victory quote
    let quote;
    if (affectionQuote) {
      quote = affectionQuote;
    } else {
      const quotes = soulType?.maskless_victory_quotes || ["I'm stronger without the mask!"];
      quote = quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    // Find the soul card in the souls bar
    const soulCard = document.querySelector(`.soul-card-mini[data-soul-id="${soulId}"]`);
    if (!soulCard) return;
    
    const rect = soulCard.getBoundingClientRect();
    
    // Show soul quote in speech bubble
    if (quote) {
      const speechBubble = document.createElement('div');
      speechBubble.style.cssText = `
        position: fixed;
        left: ${rect.left + rect.width / 2}px;
        top: ${rect.top - 120}px;
        transform: translateX(-50%);
        z-index: 21;
        background: #000000;
        padding: 10px 15px;
        border-radius: 10px;
        max-width: 250px;
        pointer-events: none;
      `;
      
      // Add pointer triangle pointing down toward soul
      const pointer = document.createElement('div');
      pointer.style.cssText = `
        position: absolute;
        left: 50%;
        bottom: -10px;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 10px solid transparent;
        border-right: 10px solid transparent;
        border-top: 10px solid #000000;
      `;
      speechBubble.appendChild(pointer);
      
      const textElement = document.createElement('p');
      textElement.style.cssText = `
        margin: 0;
        color: #fff;
        font-size: 12px;
        font-style: italic;
        line-height: 1.3;
        text-align: center;
      `;
      speechBubble.appendChild(textElement);
      document.body.appendChild(speechBubble);
      
      // Typewriter effect
      let charIndex = 0;
      const typeSpeed = 40;
      
      const typeNextChar = () => {
        if (charIndex < quote.length) {
          textElement.textContent += quote[charIndex];
          
          if (quote[charIndex] !== ' ') {
            const pitch = 300 + Math.random() * 150;
            sfx.playTone(pitch, 0.04, 0.12, 'sine');
          }
          
          charIndex++;
          setTimeout(typeNextChar, typeSpeed);
        } else {
          // Wait then remove
          setTimeout(() => {
            speechBubble.style.transition = 'opacity 0.3s';
            speechBubble.style.opacity = '0';
            setTimeout(() => {
              speechBubble.remove();
            }, 300);
          }, 1000);
        }
      };
      
      typeNextChar();
    }
  }

  showScreen(screenName) {
    console.log(`📺 showScreen(${screenName}) called`);
    const screens = ['map', 'node', 'battle', 'trait-choice', 'summoning'];
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
            if (soul.type === 'brute') {
              mountPoint.position.set(0, 1.45, 0.5); // Near eyes for brute
            } else {
              mountPoint.position.set(0, 0.9, 0.5); // Default for imp
            }
            soulMesh.add(mountPoint);
          } else if (soul.type === 'hollow' || soul.type === 'blight') {
            mountPoint = new THREE.Object3D();
            if (soul.type === 'blight') {
              mountPoint.position.set(0, 1.25, 0.45); // Near eyes for blight
            } else {
              mountPoint.position.set(0, 1.4, 0.45); // Default for hollow
            }
            soulMesh.add(mountPoint);
          } else if (soul.type === 'cur') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.5, 0.9, 0.3);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'scamp') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.1, 0.3);
            soulMesh.add(mountPoint);
          } else if (soul.type === 'varmint') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0.3, 0.75, 0.2);
            mountPoint.rotation.y = Math.PI / 2; // Rotate 90 degrees to face mask forward
            soulMesh.add(mountPoint);
          } else if (soul.type === 'knave') {
            mountPoint = new THREE.Object3D();
            mountPoint.position.set(0, 1.3, 0.25);
            soulMesh.add(mountPoint);
          }

          if (mountPoint) {
            maskMesh.scale.set(1.0, 1.0, 1.0);
            maskMesh.userData.isMask = true;
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
