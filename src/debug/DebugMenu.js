// Debug Menu - top corner menu for dev tools
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
    `;
    document.head.appendChild(style);
  }
}
