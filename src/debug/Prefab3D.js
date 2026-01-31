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
    const sphereGeom = new THREE.SphereGeometry(0.12, 8, 8);
    const shadowMat = new THREE.MeshPhongMaterial({ 
      color: 0x0a0a0a,
      emissive: 0x1a0a2e,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.9
    });

    // Create cluster of spheres in organic formation
    const sphereCount = 25;
    const spheres = [];
    
    for (let i = 0; i < sphereCount; i++) {
      const sphere = new THREE.Mesh(sphereGeom, shadowMat.clone());
      
      // Position in rough humanoid shape with randomness
      const angle = (i / sphereCount) * Math.PI * 2;
      const verticalPos = (i / sphereCount) * 1.5; // 0 to 1.5 height
      const radius = 0.3 - (Math.abs(verticalPos - 0.75) * 0.2); // Wider in middle
      
      sphere.position.set(
        Math.cos(angle) * radius + (Math.random() - 0.5) * 0.15,
        verticalPos + (Math.random() - 0.5) * 0.1,
        Math.sin(angle) * radius + (Math.random() - 0.5) * 0.15
      );
      
      // Store animation data
      sphere.userData.basePos = sphere.position.clone();
      sphere.userData.phase = Math.random() * Math.PI * 2;
      sphere.userData.speed = 0.5 + Math.random() * 0.5;
      sphere.userData.amplitude = 0.05 + Math.random() * 0.05;
      
      group.add(sphere);
      spheres.push(sphere);
    }

    // Eyes - glowing purple orbs floating in the mass
    const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ 
      color: 0x6a0dad,
      transparent: true,
      opacity: 0.9
    });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.15, 1.1, 0.25);
    leftEye.userData.basePos = leftEye.position.clone();
    leftEye.userData.phase = 0;
    leftEye.userData.speed = 0.8;
    leftEye.userData.amplitude = 0.03;
    group.add(leftEye);
    spheres.push(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.15, 1.1, 0.25);
    rightEye.userData.basePos = rightEye.position.clone();
    rightEye.userData.phase = Math.PI;
    rightEye.userData.speed = 0.8;
    rightEye.userData.amplitude = 0.03;
    group.add(rightEye);
    spheres.push(rightEye);

    // Store spheres for animation
    group.userData.spheres = spheres;
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

    // Base mask shape
    const maskGeom = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const maskMat = new THREE.MeshPhongMaterial({ 
      color: this.config.color || 0x8b4513,
      side: THREE.DoubleSide,
      flatShading: true
    });
    const mask = new THREE.Mesh(maskGeom, maskMat);
    mask.rotation.x = Math.PI / 2;
    group.add(mask);

    // Eye holes
    const eyeHoleGeom = new THREE.CircleGeometry(0.08, 8);
    const eyeHoleMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    
    const leftEyeHole = new THREE.Mesh(eyeHoleGeom, eyeHoleMat);
    leftEyeHole.position.set(-0.12, 0, 0.25);
    group.add(leftEyeHole);
    
    const rightEyeHole = new THREE.Mesh(eyeHoleGeom, eyeHoleMat);
    rightEyeHole.position.set(0.12, 0, 0.25);
    group.add(rightEyeHole);

    // Decorations based on rarity
    if (this.config.rarity === 'legendary') {
      const crownGeom = new THREE.ConeGeometry(0.15, 0.3, 6);
      const crownMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
      const crown = new THREE.Mesh(crownGeom, crownMat);
      crown.position.y = 0.3;
      group.add(crown);
    }

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

    // Masks
    this.prefabs.set('mask_common', new MaskPrefab('mask', { color: 0x8b4513, rarity: 'common' }));
    this.prefabs.set('mask_rare', new MaskPrefab('mask', { color: 0xa855f7, rarity: 'rare' }));
    this.prefabs.set('mask_legendary', new MaskPrefab('mask', { color: 0xffd700, rarity: 'legendary' }));
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
