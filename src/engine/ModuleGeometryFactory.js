import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createModuleEngravingTexture, getPlatterSurfaceMaps } from './EngravingTextureGen.js';

let sharedAssets = null;

function getSharedAssets() {
  if (sharedAssets) return sharedAssets;

  const platterMaps = getPlatterSurfaceMaps();

  // Precision industrial proportions (W=2.84, H=0.35, D=1.78) so 6-7 overlapping
  // cartridges cascade dramatically across the viewport without crowding the lens!
  const geo = {
    chassisBase: new RoundedBoxGeometry(2.82, 0.12, 1.76, 3, 0.04),
    chassisSideLong: new RoundedBoxGeometry(2.82, 0.32, 0.085, 2, 0.022),
    chassisSideShort: new RoundedBoxGeometry(0.09, 0.32, 1.74, 2, 0.022),
    chassisLowerRidge: new RoundedBoxGeometry(2.14, 0.33, 0.28, 2, 0.026),

    acrylicLid: new RoundedBoxGeometry(2.80, 0.065, 1.74, 3, 0.03),
    labelPlane: new THREE.PlaneGeometry(2.70, 1.66),

    cornerScrew: new THREE.CylinderGeometry(0.058, 0.058, 0.08, 16),
    cornerPost: new THREE.CylinderGeometry(0.074, 0.074, 0.30, 16),

    // Crisp silver edge contact pads & recessed bay windows for razor edge-on reads
    edgePadWide: new THREE.BoxGeometry(0.32, 0.18, 0.032),
    edgePadNarrow: new THREE.BoxGeometry(0.15, 0.18, 0.032),
    edgeLatchNotch: new THREE.BoxGeometry(0.042, 0.19, 0.28),

    // Internal dual concentric circular silicon wafer / rotor platters
    platterDisc: new THREE.CylinderGeometry(0.57, 0.57, 0.095, 48),
    platterRim: new THREE.TorusGeometry(0.56, 0.02, 12, 48),
    platterInnerRing: new THREE.TorusGeometry(0.27, 0.024, 12, 36),
    platterHub: new THREE.CylinderGeometry(0.20, 0.20, 0.14, 24),
    platterHubCore: new THREE.CylinderGeometry(0.125, 0.125, 0.155, 12),
    hubTooth: new THREE.BoxGeometry(0.046, 0.145, 0.09),

    // Internal silicon interposer, die core & precision micro-heatsink fins
    interposer: new RoundedBoxGeometry(1.26, 0.06, 1.06, 2, 0.018),
    dieCore: new RoundedBoxGeometry(0.48, 0.088, 0.48, 2, 0.018),
    dieTrim: new THREE.BoxGeometry(0.40, 0.025, 0.40),
    hbmCube: new RoundedBoxGeometry(0.19, 0.10, 0.25, 2, 0.012),
    finBar: new THREE.BoxGeometry(0.032, 0.12, 1.26),
    busBar: new THREE.BoxGeometry(2.44, 0.046, 0.068),
    opticRod: new THREE.CylinderGeometry(0.03, 0.03, 0.78, 12),
    cryoCoil: new THREE.TorusGeometry(0.39, 0.038, 14, 36),
    waferTile: new RoundedBoxGeometry(0.29, 0.068, 0.26, 2, 0.01),
  };

  // High-contrast monochrome noir darkroom materials:
  // Deep obsidian blacks stay pitch-rich while ONLY specular chrome & dark smoked glass catch softbox glints!
  const mat = {
    obsidianMetal: new THREE.MeshStandardMaterial({
      color: 0x07090d,
      metalness: 0.72,
      roughness: 0.34,
      envMapIntensity: 0.75,
    }),
    darkGraphite: new THREE.MeshStandardMaterial({
      color: 0x11151d,
      metalness: 0.78,
      roughness: 0.36,
      envMapIntensity: 0.85,
    }),
    brushedTitanium: new THREE.MeshStandardMaterial({
      color: 0x5c6676,
      metalness: 0.88,
      roughness: 0.24,
      envMapIntensity: 1.25,
    }),
    mirrorChrome: new THREE.MeshStandardMaterial({
      color: 0xcbd4e2,
      metalness: 0.96,
      roughness: 0.11,
      envMapIntensity: 1.85,
    }),
    brightEdgeContact: new THREE.MeshStandardMaterial({
      color: 0xadb8c8,
      metalness: 0.82,
      roughness: 0.22,
      envMapIntensity: 1.35,
    }),
    platterWafer: new THREE.MeshStandardMaterial({
      map: platterMaps.map,
      roughnessMap: platterMaps.roughnessMap,
      color: 0xb0bac8,
      metalness: 0.84,
      roughness: 0.28,
      envMapIntensity: 1.45,
    }),
    // Deep smoked crystal-clear polycarbonate: dark tint prevents foggy grey washout,
    // while clearcoat: 1.0 catches blazing tight specular studio highlights!
    smokedAcrylic: new THREE.MeshPhysicalMaterial({
      color: 0x161c26,
      metalness: 0.08,
      roughness: 0.055,
      clearcoat: 1.0,
      clearcoatRoughness: 0.038,
      reflectivity: 1.0,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1.9,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    acrylicEdgeRim: new THREE.MeshPhysicalMaterial({
      color: 0x3b4454,
      metalness: 0.28,
      roughness: 0.12,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.56,
      envMapIntensity: 1.6,
    }),
    siliconMirror: new THREE.MeshPhysicalMaterial({
      color: 0x101622,
      metalness: 0.92,
      roughness: 0.10,
      clearcoat: 0.9,
      envMapIntensity: 1.8,
    }),
  };

  sharedAssets = { geo, mat };
  return sharedAssets;
}

function buildRotorPlatter(geo, mat, radiusScale = 1.0) {
  const group = new THREE.Group();

  const disc = new THREE.Mesh(geo.platterDisc, mat.platterWafer);
  disc.scale.set(radiusScale, 1, radiusScale);
  group.add(disc);

  const rim = new THREE.Mesh(geo.platterRim, mat.brushedTitanium);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = 0.034;
  rim.scale.set(radiusScale, radiusScale, 1);
  group.add(rim);

  const innerRing = new THREE.Mesh(geo.platterInnerRing, mat.mirrorChrome);
  innerRing.rotation.x = Math.PI * 0.5;
  innerRing.position.y = 0.048;
  innerRing.scale.set(radiusScale, radiusScale, 1);
  group.add(innerRing);

  const hub = new THREE.Mesh(geo.platterHub, mat.mirrorChrome);
  hub.position.y = 0.018;
  group.add(hub);

  const core = new THREE.Mesh(geo.platterHubCore, mat.obsidianMetal);
  core.position.y = 0.022;
  group.add(core);

  for (let t = 0; t < 6; t += 1) {
    const angle = (t / 6) * Math.PI * 2;
    const tooth = new THREE.Mesh(geo.hubTooth, mat.mirrorChrome);
    tooth.position.set(Math.cos(angle) * 0.125, 0.026, Math.sin(angle) * 0.125);
    tooth.rotation.y = -angle;
    group.add(tooth);
  }

  return group;
}

export function buildModuleAssembly(mod, index = 0) {
  const { geo, mat } = getSharedAssets();
  const root = new THREE.Group();
  root.userData.moduleId = mod.id;

  const shroud = new THREE.Group();
  const heatsink = new THREE.Group();
  const die = new THREE.Group();
  const substrate = new THREE.Group();

  // Dark obsidian mirror silicon when idle (100% pure monochrome stage!);
  // transitions to #38BDF8 active telemetry glow ONLY during exploded cutaway inspection!
  const dieAccentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#141A24'),
    emissive: new THREE.Color('#38BDF8'),
    emissiveIntensity: 0.0,
    metalness: 0.88,
    roughness: 0.16,
    envMapIntensity: 1.6,
  });

  const { texture: labelTex, isClearStyle } = createModuleEngravingTexture(mod, index);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    transparent: true,
    alphaTest: 0.05,
    metalness: isClearStyle ? 0.06 : 0.10,
    roughness: isClearStyle ? 0.35 : 0.62,
    envMapIntensity: 0.38,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });

  // 1. Machined Rear Chassis + Edge Contact Bay Pads
  const basePlate = new THREE.Mesh(geo.chassisBase, mat.obsidianMetal);
  basePlate.position.y = -0.12;
  substrate.add(basePlate);

  const ridge = new THREE.Mesh(geo.chassisLowerRidge, mat.darkGraphite);
  ridge.position.set(0, -0.015, 0.74);
  substrate.add(ridge);

  const backWall = new THREE.Mesh(geo.chassisSideLong, mat.obsidianMetal);
  backWall.position.set(0, -0.015, -0.845);
  substrate.add(backWall);

  const frontWall = new THREE.Mesh(geo.chassisSideLong, mat.obsidianMetal);
  frontWall.position.set(0, -0.015, 0.845);
  substrate.add(frontWall);

  const leftWall = new THREE.Mesh(geo.chassisSideShort, mat.acrylicEdgeRim);
  leftWall.position.set(-1.365, -0.015, 0);
  substrate.add(leftWall);

  const rightWall = new THREE.Mesh(geo.chassisSideShort, mat.acrylicEdgeRim);
  rightWall.position.set(1.365, -0.015, 0);
  substrate.add(rightWall);

  const frontPadPositions = [-0.98, -0.50, 0.0, 0.50, 0.98];
  frontPadPositions.forEach((px, idx) => {
    const padMesh = new THREE.Mesh(
      idx === 2 ? geo.edgePadWide : idx % 2 === 0 ? geo.edgePadWide : geo.edgePadNarrow,
      idx === 2 ? mat.mirrorChrome : mat.brightEdgeContact
    );
    padMesh.position.set(px, -0.01, 0.892);
    substrate.add(padMesh);

    const backPad = new THREE.Mesh(
      idx % 2 === 0 ? geo.edgePadWide : geo.edgePadNarrow,
      mat.brightEdgeContact
    );
    backPad.position.set(px, -0.01, -0.892);
    substrate.add(backPad);
  });

  [-0.47, 0.47].forEach((pz) => {
    const ln = new THREE.Mesh(geo.edgeLatchNotch, mat.mirrorChrome);
    ln.position.set(-1.41, -0.01, pz);
    substrate.add(ln);

    const rn = new THREE.Mesh(geo.edgeLatchNotch, mat.mirrorChrome);
    rn.position.set(1.41, -0.01, pz);
    substrate.add(rn);
  });

  const corners = [
    [-1.24, -0.73],
    [1.24, -0.73],
    [-1.24, 0.73],
    [1.24, 0.73],
  ];
  corners.forEach(([cx, cz]) => {
    const post = new THREE.Mesh(geo.cornerPost, mat.brushedTitanium);
    post.position.set(cx, -0.015, cz);
    substrate.add(post);
  });

  // 2. Silicon Die, Interposer & Dual Concentric Wafer Platters
  const interposer = new THREE.Mesh(geo.interposer, mat.darkGraphite);
  interposer.position.set(0, -0.025, 0);
  die.add(interposer);

  const leftPlatter = buildRotorPlatter(geo, mat, mod.chassisArchetype === 'wafer-slab' ? 1.06 : 0.98);
  leftPlatter.position.set(-0.57, 0.01, -0.035);
  die.add(leftPlatter);

  const rightPlatter = buildRotorPlatter(geo, mat, mod.chassisArchetype === 'hbm-tower' ? 0.92 : 1.0);
  rightPlatter.position.set(0.57, 0.01, -0.035);
  die.add(rightPlatter);

  const coreDie = new THREE.Mesh(geo.dieCore, mat.siliconMirror);
  coreDie.position.set(0, 0.018, -0.035);
  die.add(coreDie);

  const coreTrim = new THREE.Mesh(geo.dieTrim, dieAccentMat);
  coreTrim.position.set(0, 0.065, -0.035);
  die.add(coreTrim);

  const arch = mod.chassisArchetype;
  if (arch === 'sxm-sled') {
    for (let side = -1; side <= 1; side += 2) {
      const hbm = new THREE.Mesh(geo.hbmCube, mat.brushedTitanium);
      hbm.position.set(side * 0.12, 0.02, 0.39);
      die.add(hbm);
    }
  } else if (arch === 'photonic-blade') {
    for (let lane = -1; lane <= 1; lane += 1) {
      const rod = new THREE.Mesh(geo.opticRod, mat.mirrorChrome);
      rod.rotation.z = Math.PI * 0.5;
      rod.position.set(0, 0.035, 0.36 + lane * 0.10);
      die.add(rod);
    }
  } else if (arch === 'cryo-hex') {
    const coil = new THREE.Mesh(geo.cryoCoil, mat.mirrorChrome);
    coil.rotation.x = Math.PI * 0.5;
    coil.position.set(0, 0.042, -0.035);
    die.add(coil);
  } else if (arch === 'wafer-slab') {
    for (let c = -1; c <= 1; c += 1) {
      const tile = new THREE.Mesh(geo.waferTile, mat.brushedTitanium);
      tile.position.set(c * 0.34, 0.025, 0.39);
      die.add(tile);
    }
  }

  // 3. Heatsink & Busbars
  const topBus = new THREE.Mesh(geo.busBar, mat.mirrorChrome);
  topBus.position.set(0, 0.075, -0.66);
  heatsink.add(topBus);

  const botBus = new THREE.Mesh(geo.busBar, mat.brushedTitanium);
  botBus.position.set(0, 0.075, 0.62);
  heatsink.add(botBus);

  [-1.22, -1.13, 1.13, 1.22].forEach((fx, i) => {
    const fin = new THREE.Mesh(geo.finBar, i % 2 === 0 ? mat.brushedTitanium : mat.darkGraphite);
    fin.position.set(fx, 0.05, -0.035);
    heatsink.add(fin);
  });

  // 4. Smoked Crystal Polycarbonate Cover + Screen-Printed Industrial Label
  const acrylicTop = new THREE.Mesh(geo.acrylicLid, mat.smokedAcrylic);
  acrylicTop.position.y = 0.15;
  shroud.add(acrylicTop);

  const topLabel = new THREE.Mesh(geo.labelPlane, labelMat);
  topLabel.rotation.x = -Math.PI * 0.5;
  topLabel.position.y = 0.186;
  shroud.add(topLabel);

  const bottomLabel = new THREE.Mesh(geo.labelPlane, labelMat);
  bottomLabel.rotation.x = Math.PI * 0.5;
  bottomLabel.position.y = -0.184;
  substrate.add(bottomLabel);

  corners.forEach(([cx, cz]) => {
    const screw = new THREE.Mesh(geo.cornerScrew, mat.mirrorChrome);
    screw.position.set(cx, 0.168, cz);
    shroud.add(screw);
  });

  root.add(substrate, die, heatsink, shroud);

  return {
    root,
    layers: { shroud, heatsink, die, substrate },
    rotors: [leftPlatter, rightPlatter],
    dieAccentMat,
    dispose() {
      labelTex.dispose();
      labelMat.dispose();
      dieAccentMat.dispose();
    },
  };
}
