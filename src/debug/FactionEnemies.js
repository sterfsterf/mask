// New faction enemy prefabs
import * as THREE from 'three';

// Base Prefab3D class
export class Prefab3D {
  constructor(id, config = {}) {
    this.id = id;
    this.config = config;
    this.mesh = null;
  }
  
  create() {
    return new THREE.Group();
  }
  
  getMesh() {
    if (!this.mesh) {
      this.mesh = this.create();
    }
    return this.mesh;
  }
  
  clone() {
    const original = this.getMesh();
    const cloned = original.clone(true);
    
    // Copy userData recursively
    cloned.traverse((child) => {
      const originalChild = original.getObjectByProperty('uuid', child.uuid);
      if (originalChild && originalChild.userData) {
        child.userData = { ...originalChild.userData };
        if (originalChild.userData.basePos) {
          child.userData.basePos = originalChild.userData.basePos.clone();
        }
      }
    });
    
    if (original.userData) {
      cloned.userData = { ...original.userData };
      if (original.userData.basePos) {
        cloned.userData.basePos = original.userData.basePos.clone();
      }
    }
    
    return cloned;
  }
}

// ===== PURIFIER FACTION (Gold/White) =====

export class CrusaderScoutEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xffd700, flatShading: true });
    const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffee, flatShading: true, emissive: 0xffaa00, emissiveIntensity: 0.2 });
    
    const bodyGeom = new THREE.CapsuleGeometry(0.25, 0.8, 4, 8);
    const body = new THREE.Mesh(bodyGeom, whiteMat);
    body.position.y = 0.7;
    group.add(body);
    
    const headGeom = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const head = new THREE.Mesh(headGeom, goldMat);
    head.position.y = 1.2;
    group.add(head);
    
    const crossV = new THREE.BoxGeometry(0.05, 0.3, 0.05);
    const crossH = new THREE.BoxGeometry(0.2, 0.05, 0.05);
    const cross1 = new THREE.Mesh(crossV, goldMat);
    cross1.position.set(0, 0.7, 0.26);
    group.add(cross1);
    const cross2 = new THREE.Mesh(crossH, goldMat);
    cross2.position.set(0, 0.7, 0.26);
    group.add(cross2);
    
    return group;
  }
}

export class TemplarGuardianEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xffd700, flatShading: true, metalness: 0.8 });
    const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffee, flatShading: true });
    
    const bodyGeom = new THREE.BoxGeometry(0.6, 1.0, 0.4);
    const body = new THREE.Mesh(bodyGeom, whiteMat);
    body.position.y = 0.8;
    group.add(body);
    
    const headGeom = new THREE.CylinderGeometry(0.25, 0.3, 0.4, 6);
    const head = new THREE.Mesh(headGeom, goldMat);
    head.position.y = 1.5;
    group.add(head);
    
    const shieldGeom = new THREE.BoxGeometry(0.5, 0.7, 0.1);
    const shield = new THREE.Mesh(shieldGeom, goldMat);
    shield.position.set(-0.4, 0.6, 0);
    shield.rotation.z = Math.PI / 6;
    group.add(shield);
    
    return group;
  }
}

export class InquisitorEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const darkMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, flatShading: true });
    const fireMat = new THREE.MeshBasicMaterial({ color: 0xff6600, emissive: 0xff6600 });
    
    const bodyGeom = new THREE.ConeGeometry(0.5, 1.2, 6);
    const body = new THREE.Mesh(bodyGeom, darkMat);
    body.position.y = 0.6;
    group.add(body);
    
    const headGeom = new THREE.ConeGeometry(0.3, 0.4, 6);
    const head = new THREE.Mesh(headGeom, darkMat);
    head.position.y = 1.4;
    group.add(head);
    
    const eyeGeom = new THREE.SphereGeometry(0.05, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeom, fireMat);
    leftEye.position.set(-0.1, 1.3, 0.25);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeom, fireMat);
    rightEye.position.set(0.1, 1.3, 0.25);
    group.add(rightEye);
    
    return group;
  }
}

export class TheSaintEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffee, emissiveIntensity: 0.5 });
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xffd700, flatShading: true, emissive: 0xffaa00, emissiveIntensity: 0.3 });
    
    const bodyGeom = new THREE.CapsuleGeometry(0.3, 1.2, 4, 8);
    const body = new THREE.Mesh(bodyGeom, glowMat);
    body.position.y = 1.0;
    group.add(body);
    
    const headGeom = new THREE.SphereGeometry(0.35, 8, 8);
    const head = new THREE.Mesh(headGeom, glowMat);
    head.position.y = 1.8;
    group.add(head);
    
    const haloGeom = new THREE.TorusGeometry(0.5, 0.05, 8, 16);
    const halo = new THREE.Mesh(haloGeom, goldMat);
    halo.position.y = 2.2;
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    
    return group;
  }
}

// ===== CLOCKWORK FACTION (Brass/Steel) =====

export class TickTockScoutEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const brassMat = new THREE.MeshPhongMaterial({ color: 0xb5a642, flatShading: true, metalness: 0.7 });
    const steelMat = new THREE.MeshPhongMaterial({ color: 0x8c92ac, flatShading: true, metalness: 0.9 });
    
    const bodyGeom = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const body = new THREE.Mesh(bodyGeom, brassMat);
    body.position.y = 0.5;
    group.add(body);
    
    const headGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
    const head = new THREE.Mesh(headGeom, steelMat);
    head.position.y = 0.95;
    group.add(head);
    
    const faceGeom = new THREE.CircleGeometry(0.15, 12);
    const faceMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
    const face = new THREE.Mesh(faceGeom, faceMat);
    face.position.set(0, 0.95, 0.21);
    group.add(face);
    
    return group;
  }
}

export class BrassSentinelEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const brassMat = new THREE.MeshPhongMaterial({ color: 0xb5a642, flatShading: true, metalness: 0.8 });
    const steelMat = new THREE.MeshPhongMaterial({ color: 0x8c92ac, flatShading: true, metalness: 0.9 });
    
    const bodyGeom = new THREE.CylinderGeometry(0.4, 0.5, 1.0, 8);
    const body = new THREE.Mesh(bodyGeom, brassMat);
    body.position.y = 0.8;
    group.add(body);
    
    const headGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const head = new THREE.Mesh(headGeom, steelMat);
    head.position.y = 1.5;
    head.scale.y = 0.7;
    group.add(head);
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rivetGeom = new THREE.SphereGeometry(0.05, 6, 6);
      const rivet = new THREE.Mesh(rivetGeom, steelMat);
      rivet.position.set(Math.cos(angle) * 0.45, 0.8, Math.sin(angle) * 0.45);
      group.add(rivet);
    }
    
    return group;
  }
}

export class CogworkWardenEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const steelMat = new THREE.MeshPhongMaterial({ color: 0x8c92ac, flatShading: true, metalness: 1.0 });
    const brassMat = new THREE.MeshPhongMaterial({ color: 0xb5a642, flatShading: true, metalness: 0.8 });
    
    const bodyGeom = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const body = new THREE.Mesh(bodyGeom, steelMat);
    body.position.y = 1.0;
    group.add(body);
    
    const headGeom = new THREE.BoxGeometry(0.5, 0.4, 0.4);
    const head = new THREE.Mesh(headGeom, brassMat);
    head.position.y = 1.8;
    group.add(head);
    
    const viewportGeom = new THREE.PlaneGeometry(0.3, 0.2);
    const viewportMat = new THREE.MeshBasicMaterial({ color: 0xff6600, emissive: 0xff6600 });
    const viewport = new THREE.Mesh(viewportGeom, viewportMat);
    viewport.position.set(0, 1.8, 0.21);
    group.add(viewport);
    
    return group;
  }
}

export class TheMechanismEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const brassMat = new THREE.MeshPhongMaterial({ color: 0xb5a642, flatShading: true, metalness: 0.9, emissive: 0x998833, emissiveIntensity: 0.2 });
    const steelMat = new THREE.MeshPhongMaterial({ color: 0x8c92ac, flatShading: true, metalness: 1.0 });
    
    const coreGeom = new THREE.SphereGeometry(0.6, 12, 12);
    const core = new THREE.Mesh(coreGeom, brassMat);
    core.position.y = 1.2;
    group.add(core);
    
    for (let i = 0; i < 3; i++) {
      const ringGeom = new THREE.TorusGeometry(0.7 + i * 0.2, 0.05, 8, 16);
      const ring = new THREE.Mesh(ringGeom, steelMat);
      ring.position.y = 1.2;
      ring.rotation.x = Math.PI / 2 + (i * Math.PI / 6);
      ring.rotation.y = i * Math.PI / 3;
      group.add(ring);
    }
    
    return group;
  }
}

// ===== HIVE FACTION (Chartreuse/Orange) =====

export class WorkerDroneEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const chartreuseMat = new THREE.MeshPhongMaterial({ color: 0x80ff00, flatShading: true });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xff6600, flatShading: true });
    
    const segment1Geom = new THREE.SphereGeometry(0.25, 8, 8);
    const segment1 = new THREE.Mesh(segment1Geom, chartreuseMat);
    segment1.position.set(0, 0.5, 0);
    segment1.scale.set(1, 0.8, 1.2);
    group.add(segment1);
    
    const segment2 = new THREE.Mesh(segment1Geom, orangeMat);
    segment2.position.set(0, 0.8, 0);
    segment2.scale.set(0.8, 0.6, 1);
    group.add(segment2);
    
    const headGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeom, chartreuseMat);
    head.position.set(0, 1.1, 0);
    group.add(head);
    
    const eyeGeom = new THREE.SphereGeometry(0.05, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (let i = 0; i < 3; i++) {
      const eye = new THREE.Mesh(eyeGeom, eyeMat);
      eye.position.set((i - 1) * 0.1, 1.1, 0.18);
      group.add(eye);
    }
    
    return group;
  }
}

export class BroodTenderEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const chartreuseMat = new THREE.MeshPhongMaterial({ color: 0x80ff00, flatShading: true });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xff6600, flatShading: true });
    
    const bodyGeom = new THREE.SphereGeometry(0.5, 8, 8);
    const body = new THREE.Mesh(bodyGeom, orangeMat);
    body.position.y = 0.7;
    body.scale.set(1, 0.8, 1.3);
    group.add(body);
    
    for (let i = 0; i < 3; i++) {
      const eggGeom = new THREE.SphereGeometry(0.15, 6, 6);
      const egg = new THREE.Mesh(eggGeom, chartreuseMat);
      egg.position.set((i - 1) * 0.25, 0.9, -0.4);
      group.add(egg);
    }
    
    return group;
  }
}

export class HiveVesselEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const chartreuseMat = new THREE.MeshPhongMaterial({ color: 0x80ff00, flatShading: true });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xff6600, flatShading: true });
    
    for (let i = 0; i < 4; i++) {
      const segGeom = new THREE.CylinderGeometry(0.3 - i * 0.05, 0.35 - i * 0.05, 0.3, 6);
      const segment = new THREE.Mesh(segGeom, i % 2 === 0 ? chartreuseMat : orangeMat);
      segment.position.y = 0.3 + i * 0.35;
      group.add(segment);
    }
    
    return group;
  }
}

export class TheQueenEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const chartreuseMat = new THREE.MeshPhongMaterial({ color: 0x80ff00, flatShading: true });
    const orangeMat = new THREE.MeshPhongMaterial({ color: 0xff6600, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff6600, emissive: 0xff6600 });
    
    const lowerGeom = new THREE.SphereGeometry(0.8, 8, 8);
    const lower = new THREE.Mesh(lowerGeom, orangeMat);
    lower.position.y = 0.6;
    lower.scale.set(1, 0.7, 1.5);
    group.add(lower);
    
    const thoraxGeom = new THREE.CylinderGeometry(0.4, 0.5, 0.6, 8);
    const thorax = new THREE.Mesh(thoraxGeom, chartreuseMat);
    thorax.position.y = 1.3;
    group.add(thorax);
    
    const headGeom = new THREE.SphereGeometry(0.3, 8, 8);
    const head = new THREE.Mesh(headGeom, chartreuseMat);
    head.position.y = 1.8;
    group.add(head);
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const spikeGeom = new THREE.ConeGeometry(0.08, 0.4, 4);
      const spike = new THREE.Mesh(spikeGeom, orangeMat);
      spike.position.set(Math.cos(angle) * 0.25, 2.0, Math.sin(angle) * 0.25);
      spike.rotation.z = angle;
      group.add(spike);
    }
    
    return group;
  }
}

// ===== REFINED FACTION (Silver/Crimson/Purple) =====

export class DuelistEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const silverMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, flatShading: true, metalness: 0.9 });
    const crimsonMat = new THREE.MeshPhongMaterial({ color: 0x8b0000, flatShading: true });
    
    const bodyGeom = new THREE.CapsuleGeometry(0.25, 0.9, 4, 8);
    const body = new THREE.Mesh(bodyGeom, crimsonMat);
    body.position.y = 0.8;
    group.add(body);
    
    const headGeom = new THREE.SphereGeometry(0.2, 8, 8);
    const head = new THREE.Mesh(headGeom, silverMat);
    head.position.y = 1.4;
    group.add(head);
    
    const rapierGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
    const rapier = new THREE.Mesh(rapierGeom, silverMat);
    rapier.position.set(0.3, 0.6, 0);
    rapier.rotation.z = -Math.PI / 4;
    group.add(rapier);
    
    return group;
  }
}

export class CourtMageEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const purpleMat = new THREE.MeshPhongMaterial({ color: 0x4a0e4e, flatShading: true });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, emissive: 0xff00ff });
    
    const bodyGeom = new THREE.ConeGeometry(0.5, 1.2, 6);
    const body = new THREE.Mesh(bodyGeom, purpleMat);
    body.position.y = 0.6;
    group.add(body);
    
    const headGeom = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeom, purpleMat);
    head.position.y = 1.4;
    group.add(head);
    
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      const orbGeom = new THREE.SphereGeometry(0.1, 8, 8);
      const orb = new THREE.Mesh(orbGeom, glowMat);
      orb.position.set(Math.cos(angle) * 0.6, 1.2, Math.sin(angle) * 0.6);
      group.add(orb);
    }
    
    return group;
  }
}

export class HighExecutionerEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const silverMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, flatShading: true, metalness: 0.9 });
    const blackMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, flatShading: true });
    
    const bodyGeom = new THREE.BoxGeometry(0.6, 1.0, 0.5);
    const body = new THREE.Mesh(bodyGeom, blackMat);
    body.position.y = 0.9;
    group.add(body);
    
    const headGeom = new THREE.BoxGeometry(0.4, 0.5, 0.3);
    const head = new THREE.Mesh(headGeom, silverMat);
    head.position.y = 1.6;
    group.add(head);
    
    const eyeGeom = new THREE.BoxGeometry(0.15, 0.05, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 });
    const eye1 = new THREE.Mesh(eyeGeom, eyeMat);
    eye1.position.set(-0.1, 1.6, 0.16);
    group.add(eye1);
    const eye2 = new THREE.Mesh(eyeGeom, eyeMat);
    eye2.position.set(0.1, 1.6, 0.16);
    group.add(eye2);
    
    return group;
  }
}

export class TheTyrantEnemyPrefab extends Prefab3D {
  create() {
    const group = new THREE.Group();
    
    const silverMat = new THREE.MeshPhongMaterial({ color: 0xc0c0c0, flatShading: true, metalness: 0.9 });
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xffd700, flatShading: true, metalness: 0.9 });
    const crimsonMat = new THREE.MeshPhongMaterial({ color: 0x8b0000, flatShading: true });
    
    const bodyGeom = new THREE.BoxGeometry(0.8, 1.3, 0.6);
    const body = new THREE.Mesh(bodyGeom, silverMat);
    body.position.y = 1.1;
    group.add(body);
    
    const headGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const head = new THREE.Mesh(headGeom, silverMat);
    head.position.y = 2.0;
    group.add(head);
    
    const crownGeom = new THREE.CylinderGeometry(0.3, 0.35, 0.25, 6);
    const crown = new THREE.Mesh(crownGeom, goldMat);
    crown.position.y = 2.4;
    group.add(crown);
    
    const capeGeom = new THREE.BoxGeometry(1.0, 1.5, 0.1);
    const cape = new THREE.Mesh(capeGeom, crimsonMat);
    cape.position.set(0, 1.0, -0.4);
    group.add(cape);
    
    return group;
  }
}
