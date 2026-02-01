// 3D Preview Viewport - manages Three.js scene for model preview
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PrefabManager } from './Prefab3D.js';

export class PreviewViewport {
  constructor(game) {
    this.game = game;
    this.isOpen = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.controls = null;
    this.currentModel = null;
    this.prefabManager = new PrefabManager();
    this.animationId = null;
    this.currentCategory = 'soul';
    this.currentIndex = 0;
    this.currentMask = null;
    this.selectedMaskKey = 'mask_gnarled_visage'; // Default mask
    this.maskVisible = false;
    this.autoRotate = true; // Auto-rotation enabled by default
    this.pixelationEnabled = true; // Pixelation enabled by default
    
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
        <div id="viewport-canvas-container">
          <button id="toggle-rotate-btn" class="toggle-rotate-btn">AUTO ROTATE: ON</button>
          <button id="toggle-pixel-btn" class="toggle-pixel-btn">PIXELS: ON</button>
        </div>
        <div class="viewport-controls">
          <div class="category-tabs">
            <button class="tab-btn active" data-category="soul">SOULS</button>
            <button class="tab-btn" data-category="enemy">ENEMIES</button>
            <button class="tab-btn" data-category="mask">MASKS</button>
          </div>
          <div class="model-list" id="model-list"></div>
          <div class="model-info">
            <div id="model-name">Select a model</div>
            <div id="model-details"></div>
            <button id="toggle-mask-btn" class="toggle-mask-btn" style="display: none;">TOGGLE MASK</button>
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

    // Toggle mask button
    document.getElementById('toggle-mask-btn').addEventListener('click', () => {
      this.toggleMask();
    });

    // Toggle auto-rotate button
    document.getElementById('toggle-rotate-btn').addEventListener('click', () => {
      this.autoRotate = !this.autoRotate;
      const btn = document.getElementById('toggle-rotate-btn');
      btn.textContent = `AUTO ROTATE: ${this.autoRotate ? 'ON' : 'OFF'}`;
    });

    // Toggle pixelation button
    document.getElementById('toggle-pixel-btn').addEventListener('click', () => {
      this.pixelationEnabled = !this.pixelationEnabled;
      const btn = document.getElementById('toggle-pixel-btn');
      btn.textContent = `PIXELS: ${this.pixelationEnabled ? 'ON' : 'OFF'}`;
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
    const rotateBtn = container.querySelector('#toggle-rotate-btn');
    const pixelBtn = container.querySelector('#toggle-pixel-btn');
    container.innerHTML = '';

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7a5555);
    this.scene.fog = new THREE.Fog(0x7a5555, 5, 15);

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
    
    // Re-append UI buttons on top of canvas
    if (rotateBtn) {
      container.appendChild(rotateBtn);
    }
    if (pixelBtn) {
      container.appendChild(pixelBtn);
    }

    // Post-processing setup
    this.composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Pixelation shader
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
    pixelPass.uniforms['resolution'].value = new THREE.Vector2(container.clientWidth, container.clientHeight);
    pixelPass.uniforms['pixelSize'].value = 3.84; // 20% smaller again (4.8 * 0.8)
    this.composer.addPass(pixelPass);
    
    // Store reference to pixel pass for toggling
    this.pixelPass = pixelPass;

    // OrbitControls for mouse interaction
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 1, 0);
    this.controls.enablePan = false; // Disable panning
    this.controls.minDistance = 2;
    this.controls.maxDistance = 8;
    this.controls.update();

    // Lights - much brighter to see dark models
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0);
    this.scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(5, 10, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.5);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.2);
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
      this.composer.setSize(container.clientWidth, container.clientHeight);
      pixelPass.uniforms['resolution'].value.set(container.clientWidth, container.clientHeight);
    });
  }

  updateModelList() {
    const listContainer = document.getElementById('model-list');
    let keys = this.prefabManager.getKeysByCategory(this.currentCategory);
    
    // Sort masks by rarity: common -> rare -> legendary
    if (this.currentCategory === 'mask') {
      keys = this.sortMasksByRarity(keys);
    }
    
    listContainer.innerHTML = keys.map((key, index) => {
      let displayName = this.getDisplayName(key);
      const rarityClass = this.getRarityClass(key);
      
      // Add ! indicator if mask has no texture
      if (key.startsWith('mask_')) {
        const hasTexture = this.maskHasTexture(key);
        if (!hasTexture) {
          displayName += ' !';
        }
      }
      
      return `<button class="model-btn ${rarityClass} ${index === this.currentIndex ? 'active' : ''}" data-key="${key}" data-index="${index}">${displayName}</button>`;
    }).join('');

    // Bind click events
    listContainer.querySelectorAll('.model-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const key = e.target.dataset.key;
        const index = parseInt(e.target.dataset.index);
        this.currentIndex = index;
        
        // If clicking a mask, store it as selected mask
        if (key.startsWith('mask_')) {
          this.selectedMaskKey = key;
        }
        
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
    
    // Update toggle mask button visibility
    this.updateToggleMaskButton();
  }

  maskHasTexture(maskKey) {
    const maskId = maskKey.replace('mask_', '');
    const maskConfig = this.game.config.maskConfig.masks.find(m => m.id === maskId);
    
    if (!maskConfig) return false;
    
    // Check if texture property exists and is not empty
    return maskConfig.texture && maskConfig.texture.trim() !== '';
  }

  sortMasksByRarity(maskKeys) {
    const rarityOrder = { 'common': 1, 'rare': 2, 'legendary': 3 };
    
    return maskKeys.sort((a, b) => {
      const maskIdA = a.replace('mask_', '');
      const maskIdB = b.replace('mask_', '');
      
      const maskA = this.game.config.maskConfig.masks.find(m => m.id === maskIdA);
      const maskB = this.game.config.maskConfig.masks.find(m => m.id === maskIdB);
      
      // If either mask not found, maintain original order
      if (!maskA || !maskB) return 0;
      
      const rarityA = rarityOrder[maskA.rarity] || 0;
      const rarityB = rarityOrder[maskB.rarity] || 0;
      
      return rarityA - rarityB;
    });
  }

  getRarityClass(key) {
    // Only apply rarity colors to masks
    if (!key.startsWith('mask_')) {
      return '';
    }

    // Get mask config to determine rarity
    const maskId = key.replace('mask_', '');
    const maskConfig = this.game.config.maskConfig.masks.find(m => m.id === maskId);
    
    if (!maskConfig) {
      return '';
    }

    return `rarity-${maskConfig.rarity}`;
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
      
      // Position masks differently - scale them up and position better for viewing
      if (prefabKey.startsWith('mask_')) {
        this.currentModel.position.set(0, 1.5, 0); // Higher position - scaled plane is 2 units tall
        this.currentModel.scale.set(2, 2, 2); // Scale up masks for better viewing
      } else {
        this.currentModel.position.set(0, 0, 0); // Souls at ground level - feet near floor
      }
      
      // Add mask mount point for souls
      if (prefabKey.startsWith('soul_')) {
        const mountPoint = new THREE.Object3D();
        mountPoint.name = 'maskMount';
        
        // Different mount points for each soul type
        if (prefabKey === 'soul_imp') {
          // Imp (formerly flesh)
          mountPoint.position.set(0, 1.0, 0.3);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_wretch') {
          // Wretch (formerly shadow) - attach to head orb
          const headOrb = this.currentModel.userData.headOrb;
          if (headOrb) {
            mountPoint.position.set(0, 0, 0.25);
            headOrb.add(mountPoint);
          } else {
            mountPoint.position.set(0, 1.2, 0.25);
            this.currentModel.add(mountPoint);
          }
        } else if (prefabKey === 'soul_hollow') {
          // Hollow (formerly bone)
          mountPoint.position.set(0, 1.45, 0.35);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_cur') {
          // Cur - lumpy dog creature
          mountPoint.position.set(0.5, 0.85, 0.25);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_scamp') {
          // Scamp - small imp
          mountPoint.position.set(0, 0.7, 0.3);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_varmint') {
          // Varmint
          mountPoint.position.set(0, 0.8, 0.3);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_knave') {
          // Knave
          mountPoint.position.set(0, 1.0, 0.3);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_brute') {
          // Brute
          mountPoint.position.set(0, 1.2, 0.4);
          this.currentModel.add(mountPoint);
        } else if (prefabKey === 'soul_blight') {
          // Blight
          mountPoint.position.set(0, 0.9, 0.3);
          this.currentModel.add(mountPoint);
        } else {
          // Default mount point for any other soul types
          mountPoint.position.set(0, 1.0, 0.3);
          this.currentModel.add(mountPoint);
        }
      }
      
      this.scene.add(this.currentModel);
      
      console.log('Loaded model:', prefabKey, this.currentModel);
      
      // Update info
      this.updateModelInfo(prefabKey);
      
      // Reattach mask if it was visible
      if (this.maskVisible && prefabKey.startsWith('soul_')) {
        this.attachMask();
      }
    } else {
      console.error('Failed to load prefab:', prefabKey);
    }
    
    // Update toggle mask button visibility
    this.updateToggleMaskButton();
  }

  updateModelInfo(prefabKey) {
    const nameEl = document.getElementById('model-name');
    const detailsEl = document.getElementById('model-details');
    
    nameEl.textContent = this.getDisplayName(prefabKey);
    
    // Get config details
    let details = '';
    if (prefabKey.startsWith('soul_')) {
      const type = prefabKey.replace('soul_', '');
      const config = this.game.config.getSoulType(type);
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
      const maskId = prefabKey.replace('mask_', '');
      const maskConfig = this.game.config.maskConfig?.masks?.find(m => m.id === maskId);
      if (maskConfig) {
        details = `
          <div class="stat-line">Rarity: ${maskConfig.rarity}</div>
          <div class="stat-line">Type: ${maskConfig.type}</div>
          <div class="stat-line">Traits: ${maskConfig.traits.join(', ')}</div>
          <div class="stat-line">Bind Duration: ${maskConfig.bind_duration} battles</div>
        `;
      } else {
        details = `
          <div class="stat-line">Mask preview</div>
          <div class="stat-line">Grants traits to souls</div>
          <div class="stat-line">Binds for multiple battles</div>
        `;
      }
    }
    
    detailsEl.innerHTML = details;
  }

  updateToggleMaskButton() {
    const toggleBtn = document.getElementById('toggle-mask-btn');
    const isSoul = this.currentModel && this.currentCategory === 'soul';

    if (isSoul) {
      toggleBtn.style.display = 'block';
      toggleBtn.textContent = this.maskVisible ? 'HIDE MASK' : 'SHOW MASK';
    } else {
      toggleBtn.style.display = 'none';
    }
  }

  toggleMask() {
    if (!this.currentModel || this.currentCategory !== 'soul') return;
    
    this.maskVisible = !this.maskVisible;
    
    if (this.maskVisible) {
      this.attachMask();
    } else {
      this.detachMask();
    }
    
    this.updateToggleMaskButton();
  }

  attachMask() {
    if (!this.currentModel) return;
    
    // Remove old mask if exists
    this.detachMask();
    
    const mountPoint = this.currentModel.getObjectByName('maskMount');
    if (!mountPoint) {
      console.warn('No mask mount point found');
      return;
    }
    
    console.log('Attaching mask:', this.selectedMaskKey);
    
    // Create mask
    const maskMesh = this.prefabManager.instantiate(this.selectedMaskKey);
    if (maskMesh) {
      maskMesh.name = 'attachedMask';
      maskMesh.scale.set(1.0, 1.0, 1.0);
      mountPoint.add(maskMesh);
      this.currentMask = maskMesh;
      console.log('Mask attached:', maskMesh);
    } else {
      console.error('Failed to instantiate mask:', this.selectedMaskKey);
    }
  }

  detachMask() {
    if (!this.currentModel) return;
    
    const mountPoint = this.currentModel.getObjectByName('maskMount');
    if (!mountPoint) return;
    
    const mask = mountPoint.getObjectByName('attachedMask');
    if (mask) {
      mountPoint.remove(mask);
      this.currentMask = null;
    }
  }

  animate() {
    if (!this.isOpen) return;
    
    this.animationId = requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Update orbit controls
    if (this.controls) {
      this.controls.update();
    }

    // Rotate model (only if auto-rotate is on)
    if (this.currentModel && this.autoRotate) {
      this.currentModel.rotation.y += 0.01;
    }
    
    // Bob up and down - maintain base height for different model types
    if (this.currentModel) {
      // Store base height if not already stored
      if (this.currentModel.userData.baseHeight === undefined) {
        this.currentModel.userData.baseHeight = this.currentModel.position.y;
      }
      // Apply bob animation on top of base height
      this.currentModel.position.y = this.currentModel.userData.baseHeight + Math.sin(time) * 0.1;
    }
    
    // Animate undulating spheres (for shadow soul)
    if (this.currentModel && this.currentModel.userData.needsAnimation && this.currentModel.userData.spheres) {
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

    // Render with or without pixelation
    if (this.pixelationEnabled) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
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

      .toggle-rotate-btn {
        position: absolute;
        top: 8px;
        left: 8px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 6px 10px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        font-weight: bold;
        transition: all 0.2s;
        z-index: 10;
      }

      .toggle-rotate-btn:hover {
        background: rgba(0, 255, 0, 0.2);
        color: #fff;
      }

      .toggle-pixel-btn {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.7);
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 6px 10px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        font-weight: bold;
        transition: all 0.2s;
        z-index: 10;
      }

      .toggle-pixel-btn:hover {
        background: rgba(0, 255, 0, 0.2);
        color: #fff;
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
        padding: 10px 8px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 10px;
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
        padding: 8px;
        border-bottom: 2px solid #00ff00;
      }

      .model-btn {
        width: 100%;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 8px;
        margin: 3px 0;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 10px;
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

      /* Rarity color coding for masks */
      .model-btn.rarity-common {
        border-color: #aaaaaa;
        color: #aaaaaa;
      }

      .model-btn.rarity-common.active {
        border-color: #ffffff;
        color: #ffffff;
        background: rgba(170, 170, 170, 0.2);
      }

      .model-btn.rarity-rare {
        border-color: #4169e1;
        color: #4169e1;
      }

      .model-btn.rarity-rare.active {
        border-color: #6495ed;
        color: #ffffff;
        background: rgba(65, 105, 225, 0.2);
      }

      .model-btn.rarity-legendary {
        border-color: #ffd700;
        color: #ffd700;
      }

      .model-btn.rarity-legendary.active {
        border-color: #ffed4e;
        color: #ffffff;
        background: rgba(255, 215, 0, 0.2);
      }

      .model-info {
        padding: 15px;
        color: #00ff00;
      }

      #model-name {
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #fff;
      }

      #model-details {
        font-size: 10px;
      }

      .stat-line {
        padding: 4px 0;
        border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      }

      .toggle-mask-btn {
        width: 100%;
        background: rgba(0, 255, 0, 0.1);
        border: 2px solid #00ff00;
        color: #00ff00;
        padding: 10px;
        margin-top: 10px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        font-weight: bold;
        transition: all 0.2s;
      }

      .toggle-mask-btn:hover {
        background: rgba(0, 255, 0, 0.2);
        color: #fff;
      }
    `;
    document.head.appendChild(style);
  }
}
