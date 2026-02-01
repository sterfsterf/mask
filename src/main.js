import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { Game } from './Game.js';
import { UI } from './UI.js';
import { DebugMenu } from './debug/DebugMenu.js';
import { PreviewViewport } from './debug/PreviewViewport.js';
import { PixelShader, HalftoneShader, POST_PROCESSING_CONFIG } from './core/PixelationShader.js';
import { sfx } from './core/SoundEffects.js';

// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('app').appendChild(renderer.domElement);

// Post-processing setup
const composer = new EffectComposer(renderer);

// Render pass
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Pixelation shader
const pixelPass = new ShaderPass(PixelShader);
pixelPass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
pixelPass.uniforms['pixelSize'].value = POST_PROCESSING_CONFIG.pixelSize;

// Halftone shader
const halftonePass = new ShaderPass(HalftoneShader);
halftonePass.uniforms['resolution'].value = new THREE.Vector2(window.innerWidth, window.innerHeight);
halftonePass.uniforms['dotSize'].value = POST_PROCESSING_CONFIG.halftoneSize;

// Make the last pass render to screen
if (POST_PROCESSING_CONFIG.mode === 'pixelation') {
  pixelPass.renderToScreen = true;
  composer.addPass(pixelPass);
} else if (POST_PROCESSING_CONFIG.mode === 'halftone') {
  halftonePass.renderToScreen = true;
  composer.addPass(halftonePass);
}

// Store passes for toggling
window.mainComposer = composer;
window.mainPixelPass = pixelPass;
window.mainHalftonePass = halftonePass;

// Listen for post-processing changes
window.addEventListener('postProcessingChanged', (e) => {
  const { mode } = e.detail;
  
  // Remove effect passes (keep render pass which is first)
  composer.passes = composer.passes.slice(0, 1);
  
  // Add appropriate pass and mark it to render to screen
  if (mode === 'pixelation') {
    pixelPass.renderToScreen = true;
    composer.addPass(pixelPass);
  } else if (mode === 'halftone') {
    halftonePass.renderToScreen = true;
    composer.addPass(halftonePass);
  }
  // 'none' = no additional pass, render pass will render to screen
  else {
    renderPass.renderToScreen = true;
  }
});

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xff0033, 1, 100);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);

const spotLight = new THREE.SpotLight(0xffffff, 0.5);
spotLight.position.set(-10, 10, 10);
scene.add(spotLight);

// Add some placeholder geometry - tribal masks
const textureLoader = new THREE.TextureLoader();

const createMask = (x, y, z, texturePath = null) => {
  const group = new THREE.Group();
  
  if (texturePath) {
    // Textured mask
    const texture = textureLoader.load(texturePath);
    const geometry = new THREE.PlaneGeometry(2, 2.5);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.2
    });
    const plane = new THREE.Mesh(geometry, material);
    group.add(plane);
  } else {
    // Simple dark mask shape for untextured masks
    const geometry = new THREE.BoxGeometry(2, 2.5, 0.3);
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    });
    const mask = new THREE.Mesh(geometry, material);
    group.add(mask);
    
    // Eyes - glowing red
    const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0033,
      emissiveIntensity: 2
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.5, 0.3, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.5, 0.3, 0.2);
    group.add(rightEye);
  }
  
  // Add edge glow
  const edgeGeometry = texturePath ? new THREE.PlaneGeometry(2.1, 2.6) : new THREE.BoxGeometry(2.1, 2.6, 0.1);
  const edgeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff0033,
    transparent: true,
    opacity: 0.3,
    side: THREE.BackSide
  });
  const edge = new THREE.Mesh(edgeGeometry, edgeMaterial);
  if (texturePath) {
    edge.position.z = -0.05;
  }
  group.add(edge);
  
  group.position.set(x, y, z);
  return group;
};

// Add floating masks to scene
const mask1 = createMask(-3, 0, 0, './masks/gnarled_visage.png');
const mask2 = createMask(3, 0, 0);
scene.add(mask1);
scene.add(mask2);

// Animation variables
let time = 0;

// Render loop
function animate() {
  requestAnimationFrame(animate);
  
  time += 0.01;
  
  // Animate masks - floating and rotating
  mask1.rotation.y = time * 0.5;
  mask1.position.y = Math.sin(time) * 0.5;
  
  mask2.rotation.y = -time * 0.5;
  mask2.position.y = Math.cos(time) * 0.5;
  
  // Pulsing point light
  pointLight.intensity = 1 + Math.sin(time * 2) * 0.3;
  
  composer.render();
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  pixelPass.uniforms['resolution'].value.set(window.innerWidth, window.innerHeight);
});

// Initialize game
const game = new Game();
await game.init();

// Initialize UI
const ui = new UI(game);
game.ui = ui; // Give game reference to UI
window.ui = ui; // Expose for onclick handlers
window.game = game; // Debug access
window.sfx = sfx; // Expose for onclick/hover handlers

// Initialize debug tools
const debugPreview = new PreviewViewport(game);
window.debugPreview = debugPreview; // Expose globally

const debugMenu = new DebugMenu(game);
window.debugMenu = debugMenu; // Debug access

// Render the map first, which will automatically enter the first node
ui.renderMap();

animate();

console.log('🎭 MASK is running');
console.log('Game:', game);
console.log('🛠️ Debug menu available in top-right corner');
