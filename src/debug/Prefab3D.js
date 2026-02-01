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

// Soul Prefabs
export class ShadowSoulPrefab extends Prefab3D {
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

// Imp Soul (formerly Flesh) - abstract imp with stubby legs
export class FleshSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    const fleshMat = new THREE.MeshPhongMaterial({ 
      color: 0x8b4049,
      emissive: 0x3d0000,
      emissiveIntensity: 0.2,
      flatShading: true
    });

    // Abstract body - multiple lumpy shapes merged
    const mainBodyGeom = new THREE.SphereGeometry(0.4, 6, 5);
    const mainBody = new THREE.Mesh(mainBodyGeom, fleshMat);
    mainBody.position.y = 0.6;
    mainBody.scale.set(1.1, 1.3, 0.9);
    group.add(mainBody);

    // Secondary body lumps for abstract form
    const lump1 = new THREE.SphereGeometry(0.25, 5, 5);
    const lump1Mesh = new THREE.Mesh(lump1, fleshMat);
    lump1Mesh.position.set(-0.2, 0.75, 0.1);
    lump1Mesh.scale.set(0.9, 1.2, 1.1);
    group.add(lump1Mesh);

    const lump2 = new THREE.SphereGeometry(0.22, 5, 5);
    const lump2Mesh = new THREE.Mesh(lump2, fleshMat);
    lump2Mesh.position.set(0.18, 0.65, -0.08);
    lump2Mesh.scale.set(1.2, 0.9, 1);
    group.add(lump2Mesh);

    // Abstract head/upper section
    const headGeom = new THREE.BoxGeometry(0.35, 0.4, 0.35, 2, 2, 2);
    const head = new THREE.Mesh(headGeom, fleshMat);
    head.position.set(0, 1.0, 0);
    head.rotation.set(0.1, 0.2, -0.1);
    head.scale.set(1, 0.9, 1.1);
    group.add(head);

    // Small horn/protrusions
    const hornGeom = new THREE.ConeGeometry(0.06, 0.2, 4);
    const leftHorn = new THREE.Mesh(hornGeom, fleshMat);
    leftHorn.position.set(-0.12, 1.25, 0);
    leftHorn.rotation.z = -0.3;
    group.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeom, fleshMat);
    rightHorn.position.set(0.12, 1.25, 0);
    rightHorn.rotation.z = 0.3;
    group.add(rightHorn);

    // Stubby legs - short and thick
    const legData = [
      { pos: [-0.2, 0.15, -0.1], rot: 0.05 },
      { pos: [0.2, 0.15, -0.1], rot: -0.05 },
      { pos: [-0.15, 0.15, 0.15], rot: 0.08 },
      { pos: [0.15, 0.15, 0.15], rot: -0.08 }
    ];

    legData.forEach(leg => {
      // Stubby leg - short cylinder
      const legGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.25, 5);
      const legMesh = new THREE.Mesh(legGeom, fleshMat);
      legMesh.position.set(...leg.pos);
      legMesh.rotation.z = leg.rot;
      legMesh.scale.set(1, 1, 0.9);
      group.add(legMesh);

      // Thick foot
      const footGeom = new THREE.BoxGeometry(0.15, 0.08, 0.2, 1, 1, 1);
      const foot = new THREE.Mesh(footGeom, fleshMat);
      foot.position.set(leg.pos[0], 0.05, leg.pos[2]);
      foot.rotation.y = Math.random() * 0.3 - 0.15;
      group.add(foot);
    });

    // Abstract arms - thin and elongated for contrast
    const armMat = new THREE.MeshPhongMaterial({ 
      color: 0x6b2d3a, 
      flatShading: true 
    });

    const leftArmGeom = new THREE.CapsuleGeometry(0.08, 0.5, 4, 5);
    const leftArm = new THREE.Mesh(leftArmGeom, armMat);
    leftArm.position.set(-0.4, 0.7, 0);
    leftArm.rotation.z = Math.PI / 3;
    leftArm.scale.set(1, 1.2, 1);
    group.add(leftArm);

    const rightArmGeom = new THREE.CapsuleGeometry(0.08, 0.5, 4, 5);
    const rightArm = new THREE.Mesh(rightArmGeom, armMat);
    rightArm.position.set(0.4, 0.7, 0);
    rightArm.rotation.z = -Math.PI / 3;
    rightArm.scale.set(1, 1.2, 1);
    group.add(rightArm);

    // Clawed hands
    const handGeom = new THREE.ConeGeometry(0.08, 0.12, 4);
    const leftHand = new THREE.Mesh(handGeom, armMat);
    leftHand.position.set(-0.65, 0.35, 0);
    leftHand.rotation.z = Math.PI / 2;
    group.add(leftHand);

    const rightHand = new THREE.Mesh(handGeom, armMat);
    rightHand.position.set(0.65, 0.35, 0);
    rightHand.rotation.z = -Math.PI / 2;
    group.add(rightHand);

    // Glowing eyes - angular and menacing
    const eyeGeom = new THREE.BoxGeometry(0.08, 0.12, 0.08, 1, 1, 1);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.12, 1.05, 0.2);
    leftEye.rotation.z = 0.2;
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.12, 1.05, 0.2);
    rightEye.rotation.z = -0.2;
    group.add(rightEye);

    // Add mask mount point to head
    const maskMount = new THREE.Object3D();
    maskMount.position.set(0, 1.0, 0.3);
    group.add(maskMount);
    group.maskMount = maskMount;

    return group;
  }
}

export class BoneSoulPrefab extends Prefab3D {
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

// Cur Soul - horrific lumpy dog-like abomination
export class CurSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    const fleshMat = new THREE.MeshPhongMaterial({ 
      color: 0x5a3a2a,
      flatShading: true
    });

    // Lumpy, deformed body - multiple spheres fused together
    const bodyLumps = [
      { size: 0.28, pos: [0, 0.6, 0] },
      { size: 0.22, pos: [-0.15, 0.65, 0.08] },
      { size: 0.20, pos: [0.12, 0.55, -0.05] },
      { size: 0.18, pos: [-0.08, 0.5, -0.12] }
    ];

    bodyLumps.forEach(lump => {
      const lumpGeom = new THREE.SphereGeometry(lump.size, 6, 6);
      const lumpMesh = new THREE.Mesh(lumpGeom, fleshMat);
      lumpMesh.position.set(...lump.pos);
      lumpMesh.scale.set(1, 0.8 + Math.random() * 0.4, 1); // Irregular shapes
      group.add(lumpMesh);
    });

    // Grotesque elongated head/snout
    const headGeom = new THREE.ConeGeometry(0.18, 0.45, 6);
    const head = new THREE.Mesh(headGeom, fleshMat);
    head.rotation.z = -Math.PI / 2;
    head.position.set(0.4, 0.7, 0);
    head.scale.set(1.2, 1, 0.8); // Flatten it weirdly
    group.add(head);

    // Deformed lumpy head
    const headLump = new THREE.SphereGeometry(0.15, 6, 6);
    const headLumpMesh = new THREE.Mesh(headLump, fleshMat);
    headLumpMesh.position.set(0.5, 0.85, 0);
    headLumpMesh.scale.set(0.8, 1.2, 0.9);
    group.add(headLumpMesh);

    // Mismatched ears/growths
    const earGeom = new THREE.ConeGeometry(0.08, 0.2, 5);
    const leftEar = new THREE.Mesh(earGeom, fleshMat);
    leftEar.position.set(0.5, 1.0, -0.12);
    leftEar.rotation.set(0.3, 0, -0.5);
    leftEar.scale.set(1.3, 1, 0.7);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, fleshMat);
    rightEar.position.set(0.48, 0.95, 0.15);
    rightEar.rotation.set(-0.2, 0, 0.4);
    rightEar.scale.set(0.8, 1.4, 1);
    group.add(rightEar);

    // Uneven glowing eyes
    const eyeGeom = new THREE.SphereGeometry(0.07, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xaaaa00 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(0.58, 0.78, -0.09);
    leftEye.scale.set(1.2, 0.8, 1);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.6, 0.72, 0.1);
    rightEye.scale.set(0.9, 1.1, 1);
    group.add(rightEye);

    // Horrific lumpy legs - uneven and grotesque
    const legData = [
      { pos: [0.18, 0.2, -0.14], rot: 0.1, scale: [1.2, 1, 0.8], lumps: 2 },
      { pos: [0.15, 0.2, 0.16], rot: -0.15, scale: [0.9, 1.1, 1.1], lumps: 3 },
      { pos: [-0.22, 0.2, -0.12], rot: 0.2, scale: [1.1, 0.9, 1.2], lumps: 2 },
      { pos: [-0.18, 0.2, 0.18], rot: -0.1, scale: [1.3, 1, 0.9], lumps: 3 }
    ];
    
    legData.forEach(leg => {
      // Main leg segment - lumpy cylinder
      const legGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.35, 5);
      const legMesh = new THREE.Mesh(legGeom, fleshMat);
      legMesh.position.set(...leg.pos);
      legMesh.rotation.z = leg.rot;
      legMesh.scale.set(...leg.scale);
      group.add(legMesh);

      // Add lumps to each leg
      for (let i = 0; i < leg.lumps; i++) {
        const lumpGeom = new THREE.SphereGeometry(0.06 + Math.random() * 0.03, 4, 4);
        const lump = new THREE.Mesh(lumpGeom, fleshMat);
        lump.position.set(
          leg.pos[0] + (Math.random() - 0.5) * 0.1,
          leg.pos[1] + (Math.random() - 0.5) * 0.2,
          leg.pos[2] + (Math.random() - 0.5) * 0.1
        );
        lump.scale.set(
          0.8 + Math.random() * 0.6,
          0.7 + Math.random() * 0.8,
          0.8 + Math.random() * 0.5
        );
        group.add(lump);
      }

      // Deformed paw/foot
      const pawGeom = new THREE.SphereGeometry(0.08, 5, 5);
      const paw = new THREE.Mesh(pawGeom, fleshMat);
      paw.position.set(leg.pos[0], 0.05, leg.pos[2]);
      paw.scale.set(1.2, 0.6, 1.3);
      group.add(paw);
    });

    // Twisted tail
    const tailSegments = 3;
    for (let i = 0; i < tailSegments; i++) {
      const tailGeom = new THREE.CylinderGeometry(
        0.06 - i * 0.015, 
        0.05 - i * 0.015, 
        0.2, 
        5
      );
      const tailSeg = new THREE.Mesh(tailGeom, fleshMat);
      tailSeg.position.set(
        -0.35 - i * 0.15,
        0.6 + i * 0.1,
        0 + (Math.sin(i) * 0.08)
      );
      tailSeg.rotation.z = Math.PI / 6 + i * 0.3;
      tailSeg.rotation.y = i * 0.4;
      tailSeg.scale.set(
        1 + (Math.random() - 0.5) * 0.4,
        1,
        1 + (Math.random() - 0.5) * 0.3
      );
      group.add(tailSeg);
    }

    // Extra grotesque lumps on body
    for (let i = 0; i < 4; i++) {
      const extraLump = new THREE.SphereGeometry(0.08 + Math.random() * 0.05, 4, 4);
      const lump = new THREE.Mesh(extraLump, fleshMat);
      lump.position.set(
        (Math.random() - 0.5) * 0.4,
        0.4 + Math.random() * 0.4,
        (Math.random() - 0.5) * 0.3
      );
      lump.scale.set(
        0.6 + Math.random() * 0.8,
        0.5 + Math.random() * 1.0,
        0.6 + Math.random() * 0.7
      );
      group.add(lump);
    }

    return group;
  }
}

// Scamp Soul - small imp-like creature
export class ScampSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    const scampMat = new THREE.MeshPhongMaterial({ 
      color: 0x8b1a1a,
      flatShading: true
    });

    // Small body
    const bodyGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const body = new THREE.Mesh(bodyGeom, scampMat);
    body.position.y = 0.6;
    body.scale.set(1, 0.8, 1);
    group.add(body);

    // Large head
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeom, scampMat);
    head.position.y = 1.1;
    group.add(head);

    // Pointed ears
    const earGeom = new THREE.ConeGeometry(0.08, 0.2, 6);
    const leftEar = new THREE.Mesh(earGeom, scampMat);
    leftEar.position.set(-0.18, 1.3, 0);
    leftEar.rotation.z = -0.5;
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, scampMat);
    rightEar.position.set(0.18, 1.3, 0);
    rightEar.rotation.z = 0.5;
    group.add(rightEar);

    // Big mischievous eyes
    const eyeGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.1, 1.15, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.1, 1.15, 0.2);
    group.add(rightEye);

    // Grinning mouth
    const mouthGeom = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    const mouthMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const mouth = new THREE.Mesh(mouthGeom, mouthMat);
    mouth.position.set(0, 1.0, 0.22);
    group.add(mouth);

    // Skinny arms
    const armGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6);
    const leftArm = new THREE.Mesh(armGeom, scampMat);
    leftArm.position.set(-0.35, 0.6, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, scampMat);
    rightArm.position.set(0.35, 0.6, 0);
    rightArm.rotation.z = -0.3;
    group.add(rightArm);

    // Skinny legs
    const legGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6);
    const leftLeg = new THREE.Mesh(legGeom, scampMat);
    leftLeg.position.set(-0.12, 0.2, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, scampMat);
    rightLeg.position.set(0.12, 0.2, 0);
    group.add(rightLeg);

    // Pointed tail
    const tailGeom = new THREE.ConeGeometry(0.05, 0.4, 6);
    const tail = new THREE.Mesh(tailGeom, scampMat);
    tail.position.set(0, 0.6, -0.3);
    tail.rotation.x = Math.PI / 2;
    group.add(tail);

    return group;
  }
}

// Varmint Soul - rat-like creature
export class VarmintSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    const varmintMat = new THREE.MeshPhongMaterial({ 
      color: 0x5a4a3a,
      flatShading: true
    });

    // Small hunched body
    const bodyGeom = new THREE.CapsuleGeometry(0.15, 0.35, 8, 8);
    const body = new THREE.Mesh(bodyGeom, varmintMat);
    body.rotation.z = Math.PI / 4;
    body.position.set(0, 0.5, 0);
    group.add(body);

    // Pointed head/snout
    const headGeom = new THREE.ConeGeometry(0.12, 0.25, 8);
    const head = new THREE.Mesh(headGeom, varmintMat);
    head.rotation.z = -Math.PI / 2;
    head.position.set(0.3, 0.7, 0);
    group.add(head);

    // Round ears
    const earGeom = new THREE.SphereGeometry(0.08, 8, 8);
    const leftEar = new THREE.Mesh(earGeom, varmintMat);
    leftEar.position.set(0.25, 0.95, -0.08);
    leftEar.scale.set(1, 1, 0.3);
    group.add(leftEar);

    const rightEar = new THREE.Mesh(earGeom, varmintMat);
    rightEar.position.set(0.25, 0.95, 0.08);
    rightEar.scale.set(1, 1, 0.3);
    group.add(rightEar);

    // Beady eyes
    const eyeGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(0.35, 0.75, -0.06);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.35, 0.75, 0.06);
    group.add(rightEye);

    // Long tail
    const tailGeom = new THREE.CylinderGeometry(0.03, 0.01, 0.6, 6);
    const tail = new THREE.Mesh(tailGeom, varmintMat);
    tail.position.set(-0.3, 0.4, 0);
    tail.rotation.z = -Math.PI / 3;
    group.add(tail);

    // Small legs
    const legGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 6);
    const positions = [
      [0.1, 0.1, -0.08],
      [0.1, 0.1, 0.08],
      [-0.1, 0.1, -0.08],
      [-0.1, 0.1, 0.08]
    ];
    
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeom, varmintMat);
      leg.position.set(...pos);
      group.add(leg);
    });

    return group;
  }
}

// Knave Soul - cloaked rogue figure
export class KnaveSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    const cloakMat = new THREE.MeshPhongMaterial({ 
      color: 0x2a1a3a,
      flatShading: true
    });

    // Cloaked body - cone shape
    const bodyGeom = new THREE.ConeGeometry(0.4, 1.0, 8);
    const body = new THREE.Mesh(bodyGeom, cloakMat);
    body.position.y = 0.5;
    group.add(body);

    // Hooded head - darker sphere
    const headGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0x1a0a2a });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.2;
    group.add(head);

    // Glowing eyes under hood
    const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xaa00aa });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.08, 1.2, 0.18);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.08, 1.2, 0.18);
    group.add(rightEye);

    // Dagger in hand
    const daggerHandleGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    const daggerMat = new THREE.MeshPhongMaterial({ color: 0x4a4a4a });
    const daggerHandle = new THREE.Mesh(daggerHandleGeom, daggerMat);
    daggerHandle.position.set(0.4, 0.6, 0.2);
    daggerHandle.rotation.z = Math.PI / 4;
    group.add(daggerHandle);

    const daggerBladeGeom = new THREE.ConeGeometry(0.02, 0.25, 4);
    const bladeMat = new THREE.MeshPhongMaterial({ 
      color: 0xcccccc,
      metalness: 0.9
    });
    const daggerBlade = new THREE.Mesh(daggerBladeGeom, bladeMat);
    daggerBlade.position.set(0.5, 0.75, 0.2);
    daggerBlade.rotation.z = Math.PI / 4 - Math.PI / 2;
    group.add(daggerBlade);

    // Hood peak
    const hoodGeom = new THREE.ConeGeometry(0.15, 0.2, 6);
    const hood = new THREE.Mesh(hoodGeom, cloakMat);
    hood.position.y = 1.4;
    group.add(hood);

    return group;
  }
}

// Brute Soul - massive muscular figure
export class BruteSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    const bruteMat = new THREE.MeshPhongMaterial({ 
      color: 0x8b4049,
      flatShading: true
    });

    // Massive torso
    const torsoGeom = new THREE.BoxGeometry(0.6, 0.8, 0.5);
    const torso = new THREE.Mesh(torsoGeom, bruteMat);
    torso.position.y = 0.8;
    group.add(torso);

    // Large head
    const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const head = new THREE.Mesh(headGeom, bruteMat);
    head.position.y = 1.4;
    group.add(head);

    // Angry glowing eyes
    const eyeGeom = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff3333 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.1, 1.45, 0.21);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.1, 1.45, 0.21);
    group.add(rightEye);

    // Massive arms
    const armGeom = new THREE.CylinderGeometry(0.15, 0.12, 0.8, 8);
    const leftArm = new THREE.Mesh(armGeom, bruteMat);
    leftArm.position.set(-0.45, 0.8, 0);
    leftArm.rotation.z = 0.3;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, bruteMat);
    rightArm.position.set(0.45, 0.8, 0);
    rightArm.rotation.z = -0.3;
    group.add(rightArm);

    // Large fists
    const fistGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    const leftFist = new THREE.Mesh(fistGeom, bruteMat);
    leftFist.position.set(-0.6, 0.3, 0);
    group.add(leftFist);

    const rightFist = new THREE.Mesh(fistGeom, bruteMat);
    rightFist.position.set(0.6, 0.3, 0);
    group.add(rightFist);

    // Thick legs
    const legGeom = new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8);
    const leftLeg = new THREE.Mesh(legGeom, bruteMat);
    leftLeg.position.set(-0.18, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, bruteMat);
    rightLeg.position.set(0.18, 0.3, 0);
    group.add(rightLeg);

    // Scars - darker lines
    const scarMat = new THREE.MeshBasicMaterial({ color: 0x4a2025 });
    const scarGeom = new THREE.BoxGeometry(0.3, 0.03, 0.01);
    const scar = new THREE.Mesh(scarGeom, scarMat);
    scar.position.set(0, 1.45, 0.21);
    scar.rotation.z = -0.3;
    group.add(scar);

    return group;
  }
}

// Blight Soul - diseased, dripping creature
export class BlightSoulPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    const blightMat = new THREE.MeshPhongMaterial({ 
      color: 0x5a7a3a,
      flatShading: true
    });

    // Hunched body
    const bodyGeom = new THREE.CapsuleGeometry(0.25, 0.6, 8, 8);
    const body = new THREE.Mesh(bodyGeom, blightMat);
    body.position.y = 0.7;
    body.rotation.z = 0.2;
    group.add(body);

    // Diseased head
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeom, blightMat);
    head.position.y = 1.2;
    head.scale.set(1.2, 1, 1);
    group.add(head);

    // Sick glowing eyes
    const eyeGeom = new THREE.SphereGeometry(0.06, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x88ff00 });
    
    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.12, 1.25, 0.2);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.12, 1.25, 0.2);
    group.add(rightEye);

    // Dripping boils/pustules
    const boilGeom = new THREE.SphereGeometry(0.08, 6, 6);
    const boilMat = new THREE.MeshPhongMaterial({ color: 0x3a5a2a });
    
    for (let i = 0; i < 5; i++) {
      const boil = new THREE.Mesh(boilGeom, boilMat);
      boil.position.set(
        (Math.random() - 0.5) * 0.4,
        0.6 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.4
      );
      boil.scale.set(
        0.6 + Math.random() * 0.6,
        0.6 + Math.random() * 0.6,
        0.6 + Math.random() * 0.6
      );
      group.add(boil);
    }

    // Withered arms
    const armGeom = new THREE.CylinderGeometry(0.06, 0.04, 0.6, 6);
    const leftArm = new THREE.Mesh(armGeom, blightMat);
    leftArm.position.set(-0.35, 0.7, 0);
    leftArm.rotation.z = 0.5;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeom, blightMat);
    rightArm.position.set(0.35, 0.7, 0);
    rightArm.rotation.z = -0.5;
    group.add(rightArm);

    // Thin legs
    const legGeom = new THREE.CylinderGeometry(0.08, 0.06, 0.5, 6);
    const leftLeg = new THREE.Mesh(legGeom, blightMat);
    leftLeg.position.set(-0.12, 0.25, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, blightMat);
    rightLeg.position.set(0.12, 0.25, 0);
    group.add(rightLeg);

    // Toxic drips - small spheres falling
    const dripGeom = new THREE.SphereGeometry(0.03, 6, 6);
    const dripMat = new THREE.MeshBasicMaterial({ 
      color: 0x88ff00,
      transparent: true,
      opacity: 0.8
    });
    
    for (let i = 0; i < 6; i++) {
      const drip = new THREE.Mesh(dripGeom, dripMat);
      drip.position.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * 0.8,
        (Math.random() - 0.5) * 0.5
      );
      group.add(drip);
    }

    return group;
  }
}

// Enemy Prefabs
export class WeakShadowEnemyPrefab extends Prefab3D {
  create() {
    const shadow = new ShadowSoulPrefab();
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

// Mask Prefabs (floating above souls)
export class MaskPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();

    // Create flat plane for mask texture
    const maskGeom = new THREE.PlaneGeometry(1.0, 1.0);
    
    // Always use white base for masks so textures show properly
    let maskMat;
    if (this.config.texture) {
      // Load texture with fallback
      const textureLoader = new THREE.TextureLoader();
      
      // Pure white material for maximum brightness - unlit
      maskMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, // Pure white base
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
          maskMat.color.set(0xffffff); // Keep pure white
          maskMat.transparent = true;
          maskMat.alphaTest = 0.5; // Discard pixels below 50% alpha
          maskMat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.warn('Could not load texture, using fallback:', this.config.texture, err);
          // Load fallback texture
          const fallbackTexture = textureLoader.load(
            './masks/fallback_mask.png',
            (tex) => {
              tex.minFilter = THREE.LinearFilter;
              tex.magFilter = THREE.NearestFilter;
              maskMat.map = tex;
              maskMat.needsUpdate = true;
            },
            undefined,
            (fallbackErr) => {
              console.error('Fallback texture also failed to load:', fallbackErr);
            }
          );
        }
      );
    } else {
      // Fallback - load the fallback texture
      const textureLoader = new THREE.TextureLoader();
      maskMat = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.5
      });
      
      const fallbackTexture = textureLoader.load(
        '/masks/fallback_mask.png',
        (tex) => {
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.NearestFilter;
          maskMat.map = tex;
          maskMat.needsUpdate = true;
        },
        undefined,
        (err) => {
          console.error('Fallback texture failed to load:', err);
        }
      );
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
    // Souls - 1:1 mapping with soul types
    this.prefabs.set('soul_wretch', new ShadowSoulPrefab('wretch', {}));
    this.prefabs.set('soul_imp', new FleshSoulPrefab('imp', {}));
    this.prefabs.set('soul_hollow', new BoneSoulPrefab('hollow', {}));
    this.prefabs.set('soul_cur', new CurSoulPrefab('cur', {}));
    this.prefabs.set('soul_scamp', new ScampSoulPrefab('scamp', {}));
    this.prefabs.set('soul_varmint', new VarmintSoulPrefab('varmint', {}));
    this.prefabs.set('soul_knave', new KnaveSoulPrefab('knave', {}));
    this.prefabs.set('soul_brute', new BruteSoulPrefab('brute', {}));
    this.prefabs.set('soul_blight', new BlightSoulPrefab('blight', {}));

    // Enemies
    this.prefabs.set('enemy_weak_shadow', new WeakShadowEnemyPrefab('weak_shadow', {}));
    this.prefabs.set('enemy_goblin', new GoblinEnemyPrefab('goblin', {}));
    this.prefabs.set('enemy_orc_warrior', new OrcWarriorEnemyPrefab('orc_warrior', {}));
    this.prefabs.set('enemy_dark_knight', new DarkKnightEnemyPrefab('dark_knight', {}));

    // Masks - based on actual mask types from config
    this.prefabs.set('mask_gnarled_visage', new MaskPrefab('mask', { 
      texture: './masks/gnarled_visage.png', 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_fleshy_grin', new MaskPrefab('mask', { 
      texture: './masks/fleshy_grin.png', 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_iron_grimace', new MaskPrefab('mask', { 
      texture: './masks/iron_grimace.png',
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_scrimshaw_awe', new MaskPrefab('mask', { 
      color: 0xdedede, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_void_crown', new MaskPrefab('mask', { 
      color: 0x1a0a2e, 
      rarity: 'legendary' 
    }));
    this.prefabs.set('mask_ember_shroud', new MaskPrefab('mask', { 
      color: 0xff4400, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_calcified_howl', new MaskPrefab('mask', { 
      color: 0xcccccc, 
      rarity: 'legendary' 
    }));
    this.prefabs.set('mask_crimson_tyrant', new MaskPrefab('mask', { 
      color: 0xcc0000, 
      rarity: 'legendary' 
    }));
    this.prefabs.set('mask_beggers_gaze', new MaskPrefab('mask', { 
      color: 0x3a3a3a, 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_splintered_smile', new MaskPrefab('mask', { 
      color: 0xeeddcc, 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_ashen_veil', new MaskPrefab('mask', { 
      color: 0x888888, 
      rarity: 'common' 
    }));
    this.prefabs.set('mask_sanguine_maw', new MaskPrefab('mask', { 
      color: 0xaa0000, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_obsidian_leer', new MaskPrefab('mask', { 
      color: 0x111111, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_charnel_grin', new MaskPrefab('mask', { 
      color: 0xbbaa99, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_flayed_sovereign', new MaskPrefab('mask', { 
      color: 0x994444, 
      rarity: 'rare' 
    }));
    this.prefabs.set('mask_abyssal_membrane', new MaskPrefab('mask', { 
      color: 0x0a0a1a, 
      rarity: 'legendary' 
    }));
    this.prefabs.set('mask_gorewreath', new MaskPrefab('mask', { 
      color: 0xbb0000, 
      rarity: 'legendary' 
    }));
    this.prefabs.set('mask_ossuary_crown', new MaskPrefab('mask', { 
      color: 0xffffff, 
      rarity: 'legendary' 
    }));
    this.prefabs.set('mask_carrion_psalm', new MaskPrefab('mask', { 
      color: 0x5a5a2a, 
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
