// 3D Preview Viewport - manages Three.js scene for model preview
import * as THREE from 'three';
import { PrefabManager } from './Prefab3D.js';

export class PreviewViewport {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.currentModel = null;
    this.prefabManager = new PrefabManager();
    this.animationId = null;
    this.currentCategory = 'minion';
    this.currentIndex = 0;
    
    this.createViewportUI();
  }

  createViewportUI() {
    const viewport = document.createElement('div');
    viewport.id = 'preview-viewport';
    viewport.className = 'preview-viewport hidden';
    viewport.innerHTML = `
      <div class="viewport-header">
        <h2>🎨 3D MODEL PREVIEW</h2>
        <button id="viewport-close">✕</button>
      </div>
      <div class="viewport-content">
        <div id="viewport-canvas-container"></div>
        <div class="viewport-controls">
          <div class="category-tabs">
            <button class="tab-btn active" data-category="minion">MINIONS</button>
            <button class="tab-btn" data-category="enemy">ENEMIES</button>
            <button class="tab-btn" data-category="mask">MASKS</button>
          </div>
          <div class="model-list" id="model-list"></div>
          <div class="model-info">
            <div id="model-name">Select a model</div>
            <div id="model-details"></div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(viewport);

    this.addStyles();
    this.bindEvents();
  }

  bindEvents() {
    document.getElementById('viewport-close').addEventListener('click', () => {
      this.close();
    });

    // Category tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.currentCategory = e.target.dataset.category;
        this.currentIndex = 0;
        this.updateModelList();
      });
    });
  }

  open() {
    this.isOpen = true;
    document.getElementById('preview-viewport').classList.remove('hidden');
    this.initThreeJS();
    this.updateModelList();
    this.animate();
  }

  close() {
    this.isOpen = false;
    document.getElementById('preview-viewport').classList.add('hidden');
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }

  initThreeJS() {
    const container = document.getElementById('viewport-canvas-container');
    container.innerHTML = '';

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x413030);
    this.scene.fog = new THREE.Fog(0x413030, 5, 15);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.5, 4);
    this.camera.lookAt(0, 1, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Lights - much brighter to see dark models
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 10, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, 5, -10);
    this.scene.add(rimLight);

    // Ground plane
    const groundGeom = new THREE.CircleGeometry(3, 32);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      roughness: 0.8
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Grid
    const gridHelper = new THREE.GridHelper(6, 12, 0x333333, 0x222222);
    this.scene.add(gridHelper);

    // Handle resize
    window.addEventListener('resize', () => {
      if (!this.isOpen) return;
      this.camera.aspect = container.clientWidth / container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(container.clientWidth, container.clientHeight);
    });
  }

  updateModelList() {
    const listContainer = document.getElementById('model-list');
    const keys = this.prefabManager.getKeysByCategory(this.currentCategory);
    
    listContainer.innerHTML = keys.map((key, index) => {
      const displayName = this.getDisplayName(key);
      return `<button class="model-btn ${index === this.currentIndex ? 'active' : ''}" data-key="${key}" data-index="${index}">${displayName}</button>`;
    }).join('');

    // Bind click events
    listContainer.querySelectorAll('.model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        const index = parseInt(e.target.dataset.index);
        this.currentIndex = index;
        this.loadModel(key);
        
        // Update active state
        listContainer.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    });

    // Load first model
    if (keys.length > 0) {
      this.loadModel(keys[this.currentIndex]);
    }
  }

  getDisplayName(key) {
    const parts = key.split('_');
    return parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
  }

  loadModel(prefabKey) {
    // Remove old model
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
      this.currentModel = null;
    }

    // Load new model
    const mesh = this.prefabManager.instantiate(prefabKey);
    if (mesh) {
      this.currentModel = mesh;
      this.currentModel.position.set(0, 1, 0); // Center at eye level
      this.scene.add(this.currentModel);
      
      console.log('Loaded model:', prefabKey, this.currentModel);
      
      // Update info
      this.updateModelInfo(prefabKey);
    } else {
      console.error('Failed to load prefab:', prefabKey);
    }
  }

  updateModelInfo(prefabKey) {
    const nameEl = document.getElementById('model-name');
    const detailsEl = document.getElementById('model-details');
    
    nameEl.textContent = this.getDisplayName(prefabKey);
    
    // Get config details
    let details = '';
    if (prefabKey.startsWith('minion_')) {
      const type = prefabKey.replace('minion_', '');
      const config = this.game.config.getMinionType(type);
      if (config) {
        details = `
          <div class="stat-line">❤️ HP: ${config.base_blood}</div>
          <div class="stat-line">⚔️ ATK: ${config.base_attack}</div>
          <div class="stat-line">🛡️ DEF: ${config.base_defense}</div>
          <div class="stat-line">Rarity: ${config.rarity}</div>
        `;
      }
    } else if (prefabKey.startsWith('enemy_')) {
      const enemyId = prefabKey.replace('enemy_', '');
      const config = this.game.config.getEnemy(enemyId);
      if (config) {
        details = `
          <div class="stat-line">❤️ HP: ${config.blood}</div>
          <div class="stat-line">⚔️ ATK: ${config.attack}</div>
          <div class="stat-line">🛡️ DEF: ${config.defense}</div>
          <div class="stat-line">💰 Reward: ${config.coin_reward} coins</div>
          <div class="stat-line">⚡ Reward: ${config.dark_energy_reward} energy</div>
        `;
      }
    } else if (prefabKey.startsWith('mask_')) {
      const rarity = prefabKey.replace('mask_', '');
      details = `
          <div class="stat-line">Rarity: ${rarity}</div>
          <div class="stat-line">Grants traits to minions</div>
          <div class="stat-line">Binds for multiple battles</div>
        `;
    }
    
    detailsEl.innerHTML = details;
  }

  animate() {
    if (!this.isOpen) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Rotate model
    if (this.currentModel) {
      this.currentModel.rotation.y += 0.01;
      
      // Bob up and down
      this.currentModel.position.y = Math.sin(time) * 0.1;

      // Animate undulating spheres (for shadow minion)
      if (this.currentModel.userData.needsAnimation && this.currentModel.userData.spheres) {
        this.currentModel.userData.spheres.forEach(sphere => {
          const data = sphere.userData;
          if (data.basePos) {
            // Undulating movement on all axes
            sphere.position.x = data.basePos.x + Math.sin(time * data.speed + data.phase) * data.amplitude;
            sphere.position.y = data.basePos.y + Math.cos(time * data.speed * 1.3 + data.phase) * data.amplitude;
            sphere.position.z = data.basePos.z + Math.sin(time * data.speed * 0.7 + data.phase) * data.amplitude;
            
            // Slight scale pulsing
            const scale = 1.0 + Math.sin(time * data.speed * 2 + data.phase) * 0.1;
            sphere.scale.set(scale, scale, scale);
          }
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .preview-viewport {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        font-family: 'Courier New', monospace;
      }

      .preview-viewport.hidden {
        display: none;
      }

      .viewport-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: rgba(0, 0, 0, 0.9);
        border-bottom: 2px solid #00ff00;
      }

      .viewport-header h2 {
        margin: 0;
        color: #00ff00;
        font-size: 20px;
      }

      .viewport-header button {
        background: none;
        border: 2px solid #00ff00;
        color: #00ff00;
        font-size: 24px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .viewport-header button:hover {
        background: #00ff00;
        color: #000;
      }

      .viewport-content {
        flex: 1;
        display: flex;
        overflow: hidden;
      }

      #viewport-canvas-container {
        flex: 1;
        position: relative;
      }

      #viewport-canvas-container canvas {
        display: block;
      }

      .viewport-controls {
        width: 300px;
        background: rgba(0, 0, 0, 0.9);
        border-left: 2px solid #00ff00;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
      }

      .category-tabs {
        display: flex;
        border-bottom: 2px solid #00ff00;
      }

      .tab-btn {
        flex: 1;
        background: rgba(0, 0, 0, 0.5);
        border: none;
        border-right: 1px solid #00ff00;
        color: #00ff00;
        padding: 15px 10px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        font-weight: bold;
        transition: all 0.2s;
      }

      .tab-btn:last-child {
        border-right: none;
      }

      .tab-btn:hover {
        background: rgba(0, 255, 0, 0.1);
      }

      .tab-btn.active {
        background: rgba(0, 255, 0, 0.2);
        color: #fff;
      }

      .model-list {
        padding: 10px;
        border-bottom: 2px solid #00ff00;
      }

      .model-btn {
        width: 100%;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #00ff00;
        color: #00ff00;
        padding: 12px;
        margin: 5px 0;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        text-align: left;
        transition: all 0.2s;
      }

      .model-btn:hover {
        background: rgba(0, 255, 0, 0.1);
      }

      .model-btn.active {
        background: rgba(0, 255, 0, 0.2);
        border-color: #fff;
        color: #fff;
      }

      .model-info {
        padding: 20px;
        color: #00ff00;
      }

      #model-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 15px;
        color: #fff;
      }

      #model-details {
        font-size: 12px;
      }

      .stat-line {
        padding: 5px 0;
        border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      }
    `;
    document.head.appendChild(style);
  }
}
