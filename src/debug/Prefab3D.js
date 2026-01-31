// 3D Prefab System - reusable 3D models for entities
import * as THREE from 'three';

export class Prefab3D {
  constructor(type, config) {
    this.type = type;
    this.config = config;
    this.mesh = null;
  }

  // Override in subclasses
  create() {
    throw new Error('Prefab must implement create()');
  }

  getMesh() {
    if (!this.mesh) {
      this.mesh = this.create();
    }
    return this.mesh;
  }

  clone() {
    // Deep clone the mesh including userData
    const original = this.getMesh();
    const cloned = original.clone(true);
    
    // Copy userData recursively
    cloned.traverse((child) => {
      const originalChild = original.getObjectByProperty('uuid', child.uuid);
      if (originalChild && originalChild.userData) {
        child.userData = JSON.parse(JSON.stringify(originalChild.userData));
        // Restore Vector3 objects
        if (originalChild.userData.basePos) {
          child.userData.basePos = originalChild.userData.basePos.clone();
        }
      }
    });
    
    // Copy top level userData
    if (original.userData) {
      cloned.userData = { ...original.userData };
    }
    
    return cloned;
  }
}

// Minion Prefabs
export class ShadowMinionPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Create undulating mass of shadow spheres
    const shadowMat = new THREE.MeshPhongMaterial({ 
      color: 0x0a0a0a,
      emissive: 0x1a0a2e,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.9
    });

    // Create cluster of spheres in organic formation
    const sphereCount = 45; // More orbs
    const spheres = [];
    let topOrb = null; // Will hold reference to a top orb for attaching eyes/mask
    
    for (let i = 0; i < sphereCount; i++) {
      // Vary sphere size - smaller at top, larger at bottom
      const verticalPos = (i / sphereCount) * 1.5; // 0 to 1.5 height
      const heightRatio = 1.0 - (verticalPos / 1.5); // 1.0 at bottom, 0 at top
      const baseSize = 0.08 + heightRatio * 0.08; // 0.08 to 0.16
      const sizeVariation = baseSize + (Math.random() - 0.5) * 0.06;
      
      const sphereGeom = new THREE.SphereGeometry(sizeVariation, 8, 8);
      const sphere = new THREE.Mesh(sphereGeom, shadowMat.clone());
      
      // Position in rough humanoid shape with randomness
      // More density at bottom
      const angle = (i / sphereCount) * Math.PI * 2 + Math.random() * 0.5;
      const radius = 0.3 - (Math.abs(verticalPos - 0.75) * 0.2); // Wider in middle
      
      // Add extra randomness at bottom for density
      const extraSpread = heightRatio * 0.2;
      
      sphere.position.set(
        Math.cos(angle) * radius + (Math.random() - 0.5) * (0.15 + extraSpread),
        verticalPos + (Math.random() - 0.5) * 0.1,
        Math.sin(angle) * radius + (Math.random() - 0.5) * (0.15 + extraSpread)
      );
      
      // Store animation data
      sphere.userData.basePos = sphere.position.clone();
      sphere.userData.phase = Math.random() * Math.PI * 2;
      sphere.userData.speed = 0.5 + Math.random() * 0.5;
      sphere.userData.amplitude = 0.05 + Math.random() * 0.05;
      
      // Pick a top orb (around 85% up) for head
      if (verticalPos >= 1.2 && verticalPos <= 1.35 && !topOrb) {
        topOrb = sphere;
        sphere.name = 'headOrb';
      }
      
      group.add(sphere);
      spheres.push(sphere);
    }

    // Eyes - glowing purple orbs floating in the mass
    // Attach to top orb so they move with it
    const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ 
      color: 0x9d4edd, // Lighter purple
      transparent: true,
      opacity: 0.9
    });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.15, 0.05, 0.15); // Relative to orb
    leftEye.userData.basePos = leftEye.position.clone();
    leftEye.userData.phase = 0;
    leftEye.userData.speed = 0.8;
    leftEye.userData.amplitude = 0.03;
    if (topOrb) {
      topOrb.add(leftEye);
    } else {
      leftEye.position.set(-0.15, 1.15, 0.15);
      group.add(leftEye);
    }
    spheres.push(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.15, 0.05, 0.15); // Relative to orb
    rightEye.userData.basePos = rightEye.position.clone();
    rightEye.userData.phase = Math.PI;
    rightEye.userData.speed = 0.8;
    rightEye.userData.amplitude = 0.03;
    if (topOrb) {
      topOrb.add(rightEye);
    } else {
      rightEye.position.set(0.15, 1.15, 0.15);
      group.add(rightEye);
    }
    spheres.push(rightEye);

    // Store spheres and head orb for animation and mask mounting
    group.userData.spheres = spheres;
    group.userData.headOrb = topOrb;
    group.userData.needsAnimation = true;

    return group;
  }
}

export class FleshMinionPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Body - grotesque flesh
    const bodyGeom = new THREE.SphereGeometry(0.5, 8, 6);
    const bodyMat = new THREE.MeshPhongMaterial({ 
      color: 0x8b4049,
      emissive: 0x3d0000,
      emissiveIntensity: 0.2,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.7;
    body.scale.set(1, 1.2, 1);
    group.add(body);

    // Arms
    const armGeom = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
    const armMat = new THREE.MeshPhongMaterial({ color: 0x6b2d3a, flatShading: true });
    
    const leftArm = new THREE.Mesh(armGeom, armMat);
    leftArm.position.set(-0.5, 0.6, 0);
    leftArm.rotation.z = Math.PI / 4;
    group.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeom, armMat);
    rightArm.position.set(0.5, 0.6, 0);
    rightArm.rotation.z = -Math.PI / 4;
    group.add(rightArm);

    // Eyes - creepy
    const eyeGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.2, 0.9, 0.45);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.2, 0.9, 0.45);
    group.add(rightEye);

    return group;
  }
}

export class BoneMinionPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Spine
    const spineGeom = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const boneMat = new THREE.MeshPhongMaterial({ 
      color: 0xdedede,
      flatShading: true
    });
    const spine = new THREE.Mesh(spineGeom, boneMat);
    spine.position.y = 0.6;
    group.add(spine);

    // Skull
    const skullGeom = new THREE.SphereGeometry(0.3, 8, 6);
    const skull = new THREE.Mesh(skullGeom, boneMat);
    skull.position.y = 1.4;
    skull.scale.set(1, 1.2, 1);
    group.add(skull);

    // Eye sockets - dark
    const socketGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const socketMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    
    const leftSocket = new THREE.Mesh(socketGeom, socketMat);
    leftSocket.position.set(-0.15, 1.45, 0.25);
    group.add(leftSocket);
    
    const rightSocket = new THREE.Mesh(socketGeom, socketMat);
    rightSocket.position.set(0.15, 1.45, 0.25);
    group.add(rightSocket);

    // Glowing eyes inside sockets
    const glowGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftGlow = new THREE.Mesh(glowGeom, glowMat);
    leftGlow.position.set(-0.15, 1.45, 0.28);
    group.add(leftGlow);
    
    const rightGlow = new THREE.Mesh(glowGeom, glowMat);
    rightGlow.position.set(0.15, 1.45, 0.28);
    group.add(rightGlow);

    // Ribs
    for (let i = 0; i < 3; i++) {
      const ribGeom = new THREE.TorusGeometry(0.35, 0.04, 6, 8, Math.PI);
      const rib = new THREE.Mesh(ribGeom, boneMat);
      rib.position.y = 0.9 - i * 0.2;
      rib.rotation.z = Math.PI;
      group.add(rib);
    }

    return group;
  }
}

// Enemy Prefabs
export class WeakShadowEnemyPrefab extends Prefab3D {
  create() {
    const shadow = new ShadowMinionPrefab();
    const mesh = shadow.create();
    mesh.scale.set(0.8, 0.8, 0.8);
    
    // Make it look more hostile
    mesh.children.forEach(child => {
      if (child.material && child.material.color) {
        child.material.color.setHex(0x2a0a4e);
      }
    });
    
    return mesh;
  }
}

export class GoblinEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Body - green and squat
    const bodyGeom = new THREE.CapsuleGeometry(0.35, 0.6, 4, 8);
    const bodyMat = new THREE.MeshPhongMaterial({ 
      color: 0x3d7c2b,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.5;
    group.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.3, 8, 6);
    const headMat = new THREE.MeshPhongMaterial({ 
      color: 0x4a8c36,
      flatShading: true
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.0;
    head.scale.set(1.2, 1, 1);
    group.add(head);

    // Big ears
    const earGeom = new THREE.ConeGeometry(0.15, 0.3, 4);
    const ear1 = new THREE.Mesh(earGeom, headMat);
    ear1.position.set(-0.35, 1.1, 0);
    ear1.rotation.z = -Math.PI / 6;
    group.add(ear1);
    
    const ear2 = new THREE.Mesh(earGeom, headMat);
    ear2.position.set(0.35, 1.1, 0);
    ear2.rotation.z = Math.PI / 6;
    group.add(ear2);

    // Eyes - yellow and mean
    const eyeGeom = new THREE.SphereGeometry(0.1, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.15, 1.05, 0.25);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.15, 1.05, 0.25);
    group.add(rightEye);

    // Arms with weapons implied
    const armGeom = new THREE.CapsuleGeometry(0.1, 0.5, 4, 6);
    const arm1 = new THREE.Mesh(armGeom, bodyMat);
    arm1.position.set(-0.45, 0.5, 0);
    arm1.rotation.z = Math.PI / 3;
    group.add(arm1);
    
    const arm2 = new THREE.Mesh(armGeom, bodyMat);
    arm2.position.set(0.45, 0.5, 0);
    arm2.rotation.z = -Math.PI / 3;
    group.add(arm2);

    return group;
  }
}

export class OrcWarriorEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Body - large and muscular
    const bodyGeom = new THREE.BoxGeometry(0.7, 1.0, 0.5);
    const bodyMat = new THREE.MeshPhongMaterial({ 
      color: 0x2d5016,
      flatShading: true
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.position.y = 0.8;
    group.add(body);

    // Head
    const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshPhongMaterial({ 
      color: 0x3d6620,
      flatShading: true
    });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.5;
    group.add(head);

    // Tusks
    const tuskGeom = new THREE.ConeGeometry(0.05, 0.2, 4);
    const tuskMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    
    const tusk1 = new THREE.Mesh(tuskGeom, tuskMat);
    tusk1.position.set(-0.1, 1.4, 0.25);
    tusk1.rotation.x = Math.PI / 6;
    group.add(tusk1);
    
    const tusk2 = new THREE.Mesh(tuskGeom, tuskMat);
    tusk2.position.set(0.1, 1.4, 0.25);
    tusk2.rotation.x = Math.PI / 6;
    group.add(tusk2);

    // Eyes - red and angry
    const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.12, 1.55, 0.18);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.12, 1.55, 0.18);
    group.add(rightEye);

    // Armor plates
    const plateGeom = new THREE.BoxGeometry(0.6, 0.15, 0.52);
    const plateMat = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      metalness: 0.8
    });
    const chestPlate = new THREE.Mesh(plateGeom, plateMat);
    chestPlate.position.y = 1.1;
    chestPlate.position.z = 0.01;
    group.add(chestPlate);

    // Big arms
    const armGeom = new THREE.CapsuleGeometry(0.15, 0.7, 4, 8);
    const arm1 = new THREE.Mesh(armGeom, bodyMat);
    arm1.position.set(-0.5, 0.8, 0);
    arm1.rotation.z = Math.PI / 6;
    group.add(arm1);
    
    const arm2 = new THREE.Mesh(armGeom, bodyMat);
    arm2.position.set(0.5, 0.8, 0);
    arm2.rotation.z = -Math.PI / 6;
    group.add(arm2);

    return group;
  }
}

export class DarkKnightEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Body - armored and imposing
    const bodyGeom = new THREE.BoxGeometry(0.6, 1.2, 0.4);
    const armorMat = new THREE.MeshPhongMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.9,
      flatShading: true,
      emissive: 0x330000,
      emissiveIntensity: 0.2
    });
    const body = new THREE.Mesh(bodyGeom, armorMat);
    body.position.y = 1.0;
    group.add(body);

    // Helmet
    const helmGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.5, 8);
    const helm = new THREE.Mesh(helmGeom, armorMat);
    helm.position.y = 1.85;
    group.add(helm);

    // Visor slit - glowing
    const visorGeom = new THREE.BoxGeometry(0.4, 0.08, 0.35);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const visor = new THREE.Mesh(visorGeom, visorMat);
    visor.position.set(0, 1.85, 0.18);
    group.add(visor);

    // Horns
    const hornGeom = new THREE.ConeGeometry(0.08, 0.4, 6);
    const hornMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a });
    
    const horn1 = new THREE.Mesh(hornGeom, hornMat);
    horn1.position.set(-0.25, 2.1, 0);
    horn1.rotation.z = -Math.PI / 8;
    group.add(horn1);
    
    const horn2 = new THREE.Mesh(hornGeom, hornMat);
    horn2.position.set(0.25, 2.1, 0);
    horn2.rotation.z = Math.PI / 8;
    group.add(horn2);

    // Shoulder armor
    const shoulderGeom = new THREE.BoxGeometry(0.3, 0.25, 0.3);
    const shoulder1 = new THREE.Mesh(shoulderGeom, armorMat);
    shoulder1.position.set(-0.5, 1.5, 0);
    group.add(shoulder1);
    
    const shoulder2 = new THREE.Mesh(shoulderGeom, armorMat);
    shoulder2.position.set(0.5, 1.5, 0);
    group.add(shoulder2);

    // Cape
    const capeGeom = new THREE.BoxGeometry(0.8, 1.0, 0.05);
    const capeMat = new THREE.MeshPhongMaterial({ 
      color: 0x660000,
      side: THREE.DoubleSide
    });
    const cape = new THREE.Mesh(capeGeom, capeMat);
    cape.position.set(0, 1.0, -0.25);
    group.add(cape);

    // Sword
    const swordGeom = new THREE.BoxGeometry(0.1, 1.2, 0.05);
    const swordMat = new THREE.MeshPhongMaterial({ 
      color: 0xaaaaaa,
      metalness: 0.9
    });
    const sword = new THREE.Mesh(swordGeom, swordMat);
    sword.position.set(0.7, 1.0, 0);
    sword.rotation.z = -Math.PI / 4;
    group.add(sword);

    return group;
  }
}

// Mask Prefabs (floating above minions)
export class MaskPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Create curved plane for mask texture using cylinder
    // Using a cylinder with large radius gives a subtle curve
    const maskGeom = new THREE.CylinderGeometry(
      2.5, // top radius
      2.5, // bottom radius  
      1.0, // height
      32,  // radial segments
      1,   // height segments
      true, // open ended
      0,    // start angle
      Math.PI / 3 // arc length - smaller = more curved
    );
    
    // Rotate to face forward
    maskGeom.rotateY(Math.PI);
    
    // Translate geometry so pivot is at the front surface center
    maskGeom.translate(0, 0, 2.5);
    
    let maskMat;
    if (this.config.texture) {
      // Load texture with fallback
      const textureLoader = new THREE.TextureLoader();
      
      // Start with fallback material - using MeshBasicMaterial for unlit/full brightness
      maskMat = new THREE.MeshBasicMaterial({ 
        color: this.config.color || 0x8b4513,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.5
      });
      
      const texture = textureLoader.load(
        this.config.texture,
        (tex) => {
          console.log('Texture loaded successfully:', this.config.texture);
          console.log('Texture size:', tex.image.width, 'x', tex.image.height);
          
          // Configure texture
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.NearestFilter; // Pixelated look
          
          // Update material with texture once loaded
          maskMat.map = tex;
          maskMat.transparent = true;
          maskMat.alphaTest = 0.5; // Discard pixels below 50% alpha
          maskMat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn('Could not load texture, using fallback color:', this.config.texture);
          // Material already set to fallback color
        }
      );
    } else {
      // Fallback to colored plane - also unlit for consistency
      maskMat = new THREE.MeshBasicMaterial({ 
        color: this.config.color || 0x8b4513,
        side: THREE.DoubleSide
      });
    }
    
    const mask = new THREE.Mesh(maskGeom, maskMat);
    group.add(mask);

    return group;
  }
}

// Prefab Manager
export class PrefabManager {
  constructor() {
    this.prefabs = new Map();
    this.initPrefabs();
  }

  initPrefabs() {
    // Minions
    this.prefabs.set('minion_shadow', new ShadowMinionPrefab('shadow', {}));
    this.prefabs.set('minion_flesh', new FleshMinionPrefab('flesh', {}));
    this.prefabs.set('minion_bone', new BoneMinionPrefab('bone', {}));

    // Enemies
    this.prefabs.set('enemy_weak_shadow', new WeakShadowEnemyPrefab('weak_shadow', {}));
    this.prefabs.set('enemy_goblin', new GoblinEnemyPrefab('goblin', {}));
    this.prefabs.set('enemy_orc_warrior', new OrcWarriorEnemyPrefab('orc_warrior', {}));
    this.prefabs.set('enemy_dark_knight', new DarkKnightEnemyPrefab('dark_knight', {}));

    // Masks - based on actual mask types from config
    this.prefabs.set('mask_gnarled_visage', new MaskPrefab('mask', { 
      texture: '/masks/gnarled_visage.png', 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_crude_wooden', new MaskPrefab('mask', { 
      texture: '/masks/mask_tree.png', 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_flesh_mask', new MaskPrefab('mask', { 
      color: 0x8b4049, 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_bone_visage', new MaskPrefab('mask', { 
      color: 0xdedede, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_iron_grimace', new MaskPrefab('mask', { 
      color: 0x444444, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_void_crown', new MaskPrefab('mask', { 
      color: 0x1a0a2e, 
      rarity: 'legendary' 
    }));
  }

  getPrefab(key) {
    return this.prefabs.get(key);
  }

  instantiate(key) {
    const prefab = this.prefabs.get(key);
    if (!prefab) {
      console.warn(`Prefab not found: ${key}`);
      return null;
    }
    return prefab.clone();
  }

  getAllKeys() {
    return Array.from(this.prefabs.keys());
  }

  getKeysByCategory(category) {
    return Array.from(this.prefabs.keys()).filter(k => k.startsWith(category));
  }
}
