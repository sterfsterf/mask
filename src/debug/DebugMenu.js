// Debug Menu - top corner menu for dev tools
import { POST_PROCESSING_CONFIG } from '../core/PixelationShader.js';

export class DebugMenu {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.activePanel = null;
    this.createDebugUI();
    this.addStyles();
  }

  createDebugUI() {
    const debugContainer = document.createElement('div');
    debugContainer.id = 'debug-menu';
    debugContainer.innerHTML = `
      <div id="debug-toggle" class="debug-toggle">🛠️ DEBUG</div>
      <div id="debug-panel" class="debug-panel hidden">
        <div class="debug-header">
          <h3>DEBUG MENU</h3>
          <button id="debug-close">✕</button>
        </div>
        <div class="debug-buttons">
          <button id="debug-3d-preview">🎨 3D Model Preview</button>
          <button id="debug-spawn-currency">💰 +1000 Coins</button>
          <button id="debug-spawn-energy">⚡ +1000 Energy</button>
          <div class="debug-section">
            <div class="debug-label">Jump to Node Type:</div>
            <button id="debug-jump-void" class="debug-jump-btn">🌀 Void</button>
            <button id="debug-jump-battle" class="debug-jump-btn">⚔️ Battle</button>
            <button id="debug-jump-shrine" class="debug-jump-btn">✨ Shrine</button>
            <button id="debug-jump-shop" class="debug-jump-btn">🎭 Shop</button>
            <button id="debug-jump-mystery" class="debug-jump-btn">❓ Mystery</button>
          </div>
          <div class="debug-section">
            <div class="debug-label">Post Processing:</div>
            <button id="debug-pp-pixelation" class="debug-pp-btn active">Pixelation</button>
            <button id="debug-pp-halftone" class="debug-pp-btn">Halftone</button>
            <button id="debug-pp-none" class="debug-pp-btn">None</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(debugContainer);

    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('debug-toggle').addEventListener('click', () => {
      this.toggle();
    });

    document.getElementById('debug-close').addEventListener('click', () => {
      this.close();
    });

    document.getElementById('debug-3d-preview').addEventListener('click', () => {
      this.open3DPreview();
    });

    document.getElementById('debug-spawn-currency').addEventListener('click', () => {
      this.game.state.coins += 1000;
      this.game.ui.renderMap();
    });

    document.getElementById('debug-spawn-energy').addEventListener('click', () => {
      this.game.state.darkEnergy += 1000;
      this.game.ui.renderMap();
    });

    // Jump to node type buttons
    document.getElementById('debug-jump-void').addEventListener('click', () => {
      this.jumpToNodeType('void');
    });

    document.getElementById('debug-jump-battle').addEventListener('click', () => {
      this.jumpToNodeType('battle');
    });

    document.getElementById('debug-jump-shrine').addEventListener('click', () => {
      this.jumpToNodeType('shrine');
    });

    document.getElementById('debug-jump-shop').addEventListener('click', () => {
      this.jumpToNodeType('mask_shop');
    });

    document.getElementById('debug-jump-mystery').addEventListener('click', () => {
      this.jumpToNodeType('mystery');
    });

    // Post-processing toggles
    document.getElementById('debug-pp-pixelation').addEventListener('click', () => {
      this.setPostProcessing('pixelation');
    });

    document.getElementById('debug-pp-halftone').addEventListener('click', () => {
      this.setPostProcessing('halftone');
    });

    document.getElementById('debug-pp-none').addEventListener('click', () => {
      this.setPostProcessing('none');
    });
  }

  setPostProcessing(mode) {
    POST_PROCESSING_CONFIG.mode = mode;
    
    // Update button states
    document.querySelectorAll('.debug-pp-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.getElementById(`debug-pp-${mode}`).classList.add('active');
    
    // Trigger global event for all scenes to update
    window.dispatchEvent(new CustomEvent('postProcessingChanged', { detail: { mode } }));
  }

  jumpToNodeType(nodeType) {
    console.log(`🎯 Attempting to jump to node type: ${nodeType}`);
    
    // Check if map exists, if not start a new run
    if (!this.game.state.mapNodes || this.game.state.mapNodes.length === 0) {
      console.log('⚠️ No map exists, starting new run...');
      this.game.state.startRun();
    }

    console.log('Map nodes:', this.game.state.mapNodes);
    
    // Find the first node of this type in the map
    const targetNode = this.game.state.mapNodes.find(node => node.type === nodeType);
    
    if (!targetNode) {
      console.log(`❌ No ${nodeType} node found in current map`);
      alert(`No ${nodeType} node found in current map`);
      return;
    }

    console.log('Found target node:', targetNode);

    // Mark it as incomplete so we can enter it
    const completedIndex = this.game.state.completedNodes.indexOf(targetNode.id);
    if (completedIndex > -1) {
      this.game.state.completedNodes.splice(completedIndex, 1);
    }

    // Use moveToNode to properly initialize node state (shrine, shop, etc.)
    this.game.state.moveToNode(targetNode.id);

    // Render map and enter the node
    this.game.ui.renderMap();
    
    // Small delay before entering to ensure map is rendered
    setTimeout(() => {
      this.game.ui.enterCurrentNode();
      console.log(`✓ Jumped to ${nodeType} node (ID: ${targetNode.id})`);
    }, 100);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    const panel = document.getElementById('debug-panel');
    if (this.isOpen) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  }

  close() {
    this.isOpen = false;
    document.getElementById('debug-panel').classList.add('hidden');
  }

  open3DPreview() {
    if (window.debugPreview) {
      window.debugPreview.open();
    }
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #debug-menu {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        font-family: 'Courier New', monospace;
      }

      .debug-toggle {
        background: rgba(0, 0, 0, 0.9);
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 8px 16px;
        cursor: pointer;
        font-size: 12px;
        font-weight: bold;
        transition: all 0.2s;
        user-select: none;
      }

      .debug-toggle:hover {
        background: #00ff00;
        color: #000;
        transform: scale(1.05);
      }

      .debug-panel {
        position: absolute;
        top: 50px;
        right: 0;
        background: rgba(0, 0, 0, 0.95);
        border: 2px solid #00ff00;
        min-width: 250px;
        box-shadow: 0 4px 20px rgba(0, 255, 0, 0.3);
      }

      .debug-panel.hidden {
        display: none;
      }

      .debug-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 15px;
        border-bottom: 1px solid #00ff00;
        background: rgba(0, 255, 0, 0.1);
      }

      .debug-header h3 {
        margin: 0;
        color: #00ff00;
        font-size: 14px;
      }

      .debug-header button {
        background: none;
        border: none;
        color: #00ff00;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        line-height: 24px;
      }

      .debug-header button:hover {
        color: #ff0000;
      }

      .debug-buttons {
        padding: 10px;
      }

      .debug-buttons button {
        width: 100%;
        background: #1a1a1a;
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 10px;
        margin: 5px 0;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        text-align: left;
        transition: all 0.2s;
      }

      .debug-buttons button:hover {
        background: rgba(0, 255, 0, 0.2);
        border-color: #00ff00;
      }

      .debug-buttons button:active {
        background: rgba(0, 255, 0, 0.4);
      }

      .debug-section {
        border-top: 1px solid #00ff00;
        padding-top: 10px;
        margin-top: 10px;
      }

      .debug-label {
        color: #00ff00;
        font-size: 11px;
        margin-bottom: 5px;
        text-transform: uppercase;
      }

      .debug-pp-btn {
        width: 100% !important;
        padding: 8px !important;
        font-size: 11px !important;
        opacity: 0.5;
      }

      .debug-pp-btn.active {
        opacity: 1;
        background: rgba(0, 255, 0, 0.2) !important;
      }

      .debug-jump-btn {
        width: 100% !important;
        padding: 8px !important;
        font-size: 11px !important;
      }
    `;
    document.head.appendChild(style);
  }
}
